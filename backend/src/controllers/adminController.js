import TeachingAssignment from "../models/TeachingAssignment.js";
import Activity from "../models/Activity.js";
import Student from "../models/Student.js";
import RubricCriteria from "../models/RubricCriteria.js";
import StudentActivityMarks from "../models/StudentActivityMarks.js";
import Class from "../models/Class.js";
import Subject from "../models/Subject.js";
import User from "../models/User.js";
import FacultyDirectory from "../models/FacultyDirectory.js";
import AcademicYear from "../models/AcademicYear.js";
import bcrypt from "bcryptjs";

import XLSX from "xlsx";

const normalizeRole = (value) => {
  const role = String(value || "").trim().toLowerCase();
  const roleMap = {
    faculty: "Faculty",
    hod: "HOD",
    admin: "admin",
  };
  return roleMap[role] || null;
};

const toUniqueRoles = (existingRoles = [], nextRoles = []) => {
  return Array.from(new Set([...existingRoles, ...nextRoles]));
};


// Controller to get all teaching assignments
export const getAllTeachingAssignments = async (req, res) => {
  try {
    // Fetch all teaching assignments from the database
    const assignments = await TeachingAssignment.find()
      .populate("facultyId", "name email")   // optional: populate faculty info
      .populate("subjectId", "name code")   // optional: populate subject info

    return res.status(200).json({
      success: true,
      count: assignments.length,
      data: assignments
    });
  } catch (error) {
    console.error("Error fetching teaching assignments:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error. Unable to fetch teaching assignments."
    });
  }
};



// Controller to create a new class
export const createClass = async (req, res) => {
  try {
    const { year, division, google_group_email } = req.body;

    if (!year || !division || !google_group_email) {
      return res.status(400).json({
        success: false,
        message: "Year, division, and Google Group link are required"
      });
    }

    try {
        const parsedUrl = new URL(google_group_email);
        if (parsedUrl.protocol !== "https:" || parsedUrl.hostname !== "groups.google.com") {
          return res.status(400).json({
            success: false,
            message: "Enter a valid Google Group link"
          });
        }
      } catch {
        return res.status(400).json({
          success: false,
          message: "Enter a valid Google Group link"
        });
      }

    const existingClass = await Class.findOne({ year, division });
    if (existingClass) {
      return res.status(409).json({
        success: false,
        message: "Class already exists"
      });
    }

    const newClass = await Class.create({
      year,
      division,
      google_group_email: google_group_email.trim(),
    });

    return res.status(201).json({
      success: true,
      message: "Class created successfully",
      data: newClass
    });
  } catch (error) {
    console.error("Error creating class:", error);
    return res.status(500).json({
      success: false,
      message: "Server error. Unable to create class."
    });
  }
};


// Controller to create a new subject
export const createSubject = async (req, res) => {
  try {
    const { name, code, year, coordinator } = req.body;

    if (!name || !code || !year || !coordinator) {
      return res.status(400).json({
        success: false,
        message: "Subject code, name, year, and coordinator are required"
      });
    }

    // Check if subject code already exists
    const existingSubject = await Subject.findOne({ code });
    if (existingSubject) {
      return res.status(409).json({
        success: false,
        message: "Subject with this code already exists"
      });
    }

    const coordinatorEmail = String(coordinator).trim().toLowerCase();
    const facultyDirectoryRecord = await FacultyDirectory.findOne({ email: coordinatorEmail });

    if (!facultyDirectoryRecord) {
      return res.status(400).json({
        success: false,
        message: "Coordinator email not found in Faculty Directory"
      });
    }

    const newSubject = await Subject.create({ 
      name, 
      code, 
      year,
      coordinator: coordinatorEmail
    });

    return res.status(201).json({
      success: true,
      message: "Subject created successfully",
      data: newSubject
    });
  } catch (error) {
    console.error("Error creating subject:", error);
    return res.status(500).json({
      success: false,
      message: "Server error. Unable to create subject."
    });
  }
};


// Assign subject and class to a faculty
export const assignSubjectAndClassToFaculty = async (req, res) => {
  try {
    let { facultyId, subjectId, year, division, classId } = req.body;

    // Support classId: look up Class to get year and division
    if (classId && (!year || !division)) {
      const classObj = await Class.findById(classId);
      if (!classObj) {
        return res.status(400).json({ success: false, message: "Class not found" });
      }
      year = classObj.year;
      division = classObj.division;
    }

    // 1. Validate input 
    if (!facultyId || !subjectId || !year || !division) {
      return res.status(400).json({
        success: false,
        message: "facultyId, subjectId, and class (year+division or classId) are required",
      });
    }

    // Get active academic year
    const activeYear = await AcademicYear.findOne({ isActive: true });
    if (!activeYear) {
      return res.status(400).json({
        success: false,
        message: "No active academic year set. Please set academic year first.",
      });
    }

    const academicYear = activeYear.year;

    // 2. Check faculty exists and role 
    const faculty = await User.findById(facultyId);
    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty not found",
      });
    }

    if (faculty.role !== "Faculty") {
      return res.status(403).json({
        success: false,
        message: "User is not a faculty member",
      });
    }

    // 3. Check subject exists 
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found",
      });
    }

    // 4. Check class exists 
    const classObj = await Class.findOne({ year, division });
    if (!classObj) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    // 5. Prevent duplicate or overwrite assignment

    const existingAssignment = await TeachingAssignment.findOne({
      subjectId,
      year,
      division
    });

    // Case 1: Same faculty already assigned
    if (existingAssignment && existingAssignment.facultyId.toString() === facultyId) {
      return res.status(409).json({
        success: false,
        message: "This faculty is already assigned this subject for this class"
      });
    }

    // Case 2: Another faculty already assigned
    if (existingAssignment && existingAssignment.facultyId.toString() !== facultyId) {
      return res.status(409).json({
        success: false,
        message: "This subject is already assigned to another faculty for this class"
      });
    }


    // 6. Create assignment 
    const assignment = await TeachingAssignment.create({
      facultyId,
      subjectId,
      year,
      division
    });

    return res.status(201).json({
      success: true,
      message: "Subject and class assigned to faculty successfully",
      data: assignment,
    });
  } catch (error) {
    // MongoDB duplicate key error (safety net)
    if (error.code === 11000) {
      const { year, division } = error.keyValue || {};

      return res.status(409).json({
        success: false,
        message: year && division
          ? `This faculty is already assigned this subject for ${year} - Division ${division}`
          : "Duplicate teaching assignment detected",
      });
    }

    console.error("Error assigning subject & class:", error);

    return res.status(500).json({
      success: false,
      message: "Server error. Unable to assign subject and class.",
    });
  }

};



/* ---------------- UPLOAD STUDENTS FROM EXCEL ---------------- */
export const uploadStudentsFromExcel = async (req, res) => {
  try {
    const { year, division, classId } = req.body;

    let targetYear = year;
    let targetDivision = division;

    // Support classId: look up Class to get year and division
    if (classId && (!targetYear || !targetDivision)) {
      const classObj = await Class.findById(classId);
      if (!classObj) {
        return res.status(400).json({ error: "Class not found" });
      }
      targetYear = classObj.year;
      targetDivision = classObj.division;
    }

    if (!targetYear || !targetDivision) {
      return res.status(400).json({ error: "year and division (or classId) are required" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Excel file is required" });
    }

    /* ---------- Read Excel ---------- */
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json(sheet);

    if (!rows.length) {
      return res.status(400).json({ error: "Excel file is empty" });
    }

    /* ---------- Expected Excel Columns ---------- */
    // rollNumber | name
    const students = rows.map((row, index) => {
      if (!row.rollNumber || !row.name) {
        throw new Error(`Missing data at row ${index + 2}`);
      }

      return {
        rollNumber: String(row.rollNumber).trim(),
        name: String(row.name).trim(),
        year: targetYear,
        division: targetDivision
      };
    });

    /* ---------- Insert Students (ignore duplicates) ---------- */
    const result = await Student.insertMany(students, {
      ordered: false // allows skipping duplicates
    });

    return res.status(201).json({
      message: "Students uploaded successfully",
      insertedCount: result.length
    });

  } catch (err) {
    // Duplicate key errors are expected (unique index)
    if (err.code === 11000) {
      return res.status(207).json({
        message: "Upload completed with some duplicate records skipped"
      });
    }

    console.error("Student upload error:", err);
    return res.status(500).json({ error: err.message });
  }
};


// controllers/adminController.js
export const getAllClasses = async (req, res) => {
  try {
    const classes = await Class.find().select("_id year division").sort({ year: 1, division: 1 });
    res.json({ success: true, data: classes });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch classes" });
  }
};


export const getAllSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find().select("_id name code year");
    res.json({ success: true, data: subjects });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch subjects" });
  }
};


export const getAllFaculties = async (req, res) => {
  try {
    const faculties = await User.find({ role: { $in: ["Faculty", "HOD"] } })
      .sort({ name: 1, email: 1 })
      .select("_id name email");
    res.json({ success: true, data: faculties });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch faculties" });
  }
};

export const getFacultyDirectory = async (req, res) => {
  try {
    const directory = await FacultyDirectory.find()
      .select("_id name email roles isActive")
      .sort({ name: 1, email: 1 })
      .lean();

    res.json({ success: true, data: directory });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch faculty directory" });
  }
};

// Get active academic year
export const getActiveAcademicYear = async (req, res) => {
  try {
    const activeYear = await AcademicYear.findOne({ isActive: true });

    // FIRST TIME CASE
    if (!activeYear) {
      return res.status(200).json({
        data: null,
        message: "No academic year set yet",
      });
    }

    res.status(200).json({
      data: activeYear,
    });
  } catch (error) {
    console.error("Get active academic year error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Set active academic year
export const setAcademicYear = async (req, res) => {
  try {
    const { year, semesterStartDate, semesterEndDate } = req.body;

    if (!year || !semesterStartDate || !semesterEndDate) {
      return res.status(400).json({
        message: "Year, semester start date and end date are required",
      });
    }

    if (new Date(semesterEndDate) <= new Date(semesterStartDate)) {
      return res.status(400).json({
        message: "Semester end date must be after start date",
      });
    }

    //  Deactivate all previous years
    await AcademicYear.updateMany({}, { isActive: false });

    //  Check if year already exists
    let academicYear = await AcademicYear.findOne({ year });

    if (academicYear) {
      //  Update existing year
      academicYear.isActive = true;
      academicYear.semesterStartDate = semesterStartDate;
      academicYear.semesterEndDate = semesterEndDate;
      await academicYear.save();
    } else {
      //  Create new academic year
      academicYear = await AcademicYear.create({
        year,
        semesterStartDate,
        semesterEndDate,
        isActive: true,
      });
    }

    return res.status(201).json({
      message: "Academic year set successfully",
      data: academicYear,
    });
  } catch (error) {
    console.error("Academic year error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Upload subjects from Excel
export const uploadSubjectsFromExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Excel file is required" });
    }

    /* ---------- Read Excel ---------- */
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json(sheet);

    if (!rows.length) {
      return res.status(400).json({ error: "Excel file is empty" });
    }


    /* ---------- Expected Excel Columns (ALL REQUIRED) ---------- */
    // code | name | year | coordinator
    const parsedSubjects = [];
    const validationErrors = [];

    rows.forEach((row, index) => {
      const rowNum = index + 2; // Excel row number (starting from 2 because row 1 is header)
      
      const code = row.code ? String(row.code).trim() : null;
      const name = row.name ? String(row.name).trim() : null;
      const year = row.year ? String(row.year).trim() : null;
      const coordinator = row.coordinator ? String(row.coordinator).trim() : null;

      // Log the row data for debugging

      // Validate all fields are present
      if (!code) {
        validationErrors.push({
          row: rowNum,
          error: "Missing or empty 'code' field",
          data: { code, name, year, coordinator }
        });
        return;
      }
      if (!name) {
        validationErrors.push({
          row: rowNum,
          error: "Missing or empty 'name' field",
          data: { code, name, year, coordinator }
        });
        return;
      }
      if (!year) {
        validationErrors.push({
          row: rowNum,
          error: "Missing or empty 'year' field",
          data: { code, name, year, coordinator }
        });
        return;
      }
      if (!coordinator) {
        validationErrors.push({
          row: rowNum,
          error: "Missing or empty 'coordinator' field",
          data: { code, name, year, coordinator }
        });
        return;
      }

      parsedSubjects.push({
        rowNum,
        code,
        name,
        year,
        coordinator
      });
    });

    // Return early if validation errors found
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation errors found - check the errors array below",
        validationErrors: validationErrors,
        successCount: 0,
        duplicateCount: 0,
        errorCount: validationErrors.length,
        createdSubjects: [],
        duplicates: [],
        errors: validationErrors
      });
    }

    /* ---------- Validate and Insert Subjects ---------- */
    const createdSubjects = [];
    const duplicates = [];
    const errors = [];

    for (let i = 0; i < parsedSubjects.length; i++) {
      const subject = parsedSubjects[i];
      
      try {

        // Check if subject code already exists
        const existingSubject = await Subject.findOne({ code: subject.code });
        
        if (existingSubject) {
          duplicates.push({
            row: subject.rowNum,
            code: subject.code,
            name: subject.name,
            message: "Subject code already exists in database"
          });
          continue;
        }

        // Validate coordinator email against Faculty Directory
        const coordinatorEmail = String(subject.coordinator).trim().toLowerCase();
        const facultyDirectoryRecord = await FacultyDirectory.findOne({ email: coordinatorEmail });

        if (!facultyDirectoryRecord) {
          errors.push({
            row: subject.rowNum,
            code: subject.code,
            name: subject.name,
            year: subject.year,
            coordinatorInput: subject.coordinator,
            message: `Coordinator '${subject.coordinator}' not found in Faculty Directory. Make sure the email is registered.`
          });
          continue;
        }

        // Create the subject using validated coordinator email
        const newSubject = await Subject.create({
          code: subject.code,
          name: subject.name,
          year: subject.year,
          coordinator: coordinatorEmail
        });

        createdSubjects.push({
          row: subject.rowNum,
          code: newSubject.code,
          name: newSubject.name,
          year: newSubject.year,
          coordinatorEmail: newSubject.coordinator,
          coordinatorId: null,
          id: newSubject._id
        });


      } catch (err) {
        errors.push({
          row: subject.rowNum,
          code: subject.code,
          name: subject.name,
          year: subject.year,
          message: err.message
        });
      }
    }

    const response = {
      success: createdSubjects.length > 0,
      message: "Subjects upload completed",
      successCount: createdSubjects.length,
      duplicateCount: duplicates.length,
      errorCount: errors.length,
      createdSubjects,
      duplicates,
      errors
    };


    return res.status(201).json(response);

  } catch (err) {
    return res.status(500).json({ 
      success: false,
      error: err.message
    });
  }
};


export const getAdminActivities = async (req, res) => {
  try {
    const { facultyId, subjectId, year, division, classId } = req.query;

    let targetYear = year;
    let targetDivision = division;

    // Support classId: look up Class to get year and division
    if (classId && (!targetYear || !targetDivision)) {
      const classObj = await Class.findById(classId);
      if (!classObj) {
        return res.status(400).json({ message: "Class not found" });
      }
      targetYear = classObj.year;
      targetDivision = classObj.division;
    }

    if (!facultyId || !subjectId || !targetYear || !targetDivision) {
      return res.status(400).json({
        message: "facultyId, subjectId, and class (year+division or classId) are required",
      });
    }

    const assignment = await TeachingAssignment.findOne({
      facultyId,
      subjectId,
      year: targetYear,
      division: targetDivision,
    });

    console.log("FOUND ASSIGNMENT:", assignment);

    if (!assignment) {
      return res.status(404).json({
        message: "Teaching assignment not found",
      });
    }

    // 3️⃣ Find activities using assignmentId
    const activities = await Activity.find({
      assignmentId: assignment._id,
    })
      .populate("coordinatorId", "name email")
      .sort({ scheduleDate: -1 });

    console.log("FOUND ACTIVITIES:", activities);

    // 4️⃣ Return result
    return res.status(200).json({
      count: activities.length,
      activities,
    });
  } catch (error) {
    console.error("Get admin activities error:", error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

export const uploadFacultyFromExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded"
      });
    }


    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);


    if (!rows || rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Excel file is empty"
      });
    }


    const createdFaculties = [];
    const duplicateEmails = [];
    const errors = [];

    const directoryByEmail = new Map();

    for (const row of rows) {
      try {
        const name = row.name ? String(row.name).trim() : null;
        const email = row.email ? String(row.email).trim().toLowerCase() : null;
        const rawRole = row.role ? String(row.role).trim() : null;
        const role = normalizeRole(rawRole);


        // Validate required fields
        if (!name || !email || !rawRole) {
          errors.push({
            name,
            email,
            role: rawRole,
            message: "Name, email, and role are required"
          });
          continue;
        }


        // Validate role
        if (!["Faculty", "HOD", "admin"].includes(role)) {
          errors.push({
            name,
            email,
            role: rawRole,
            message: "Role must be Faculty, HOD, or admin"
          });
          continue;
        }


        const existingDirectoryEntry = directoryByEmail.get(email);
        if (existingDirectoryEntry) {
          duplicateEmails.push({
            name,
            email,
            role,
            message: "Duplicate email found in Excel file; roles were merged"
          });
          existingDirectoryEntry.roles = toUniqueRoles(existingDirectoryEntry.roles, [role]);
          continue;
        }

        directoryByEmail.set(email, {
          name,
          email,
          roles: [role],
        });


      } catch (err) {
        errors.push({
          name: row.name,
          email: row.email,
          role: row.role,
          message: err.message
        });
      }
    }


    // Determine response status and message
    const directoryEntries = Array.from(directoryByEmail.values());

    for (const entry of directoryEntries) {
      const existingDirectory = await FacultyDirectory.findOne({ email: entry.email });
      if (existingDirectory) {
        duplicateEmails.push({
          name: entry.name,
          email: entry.email,
          role: entry.roles.join(", "),
          message: "Email already exists in faculty directory; skipped",
        });
        continue;
      } else {
        const newDirectoryEntry = await FacultyDirectory.create({
          name: entry.name,
          email: entry.email,
          roles: entry.roles,
          isActive: true,
        });

        createdFaculties.push({
          id: newDirectoryEntry._id,
          name: newDirectoryEntry.name,
          email: newDirectoryEntry.email,
          roles: newDirectoryEntry.roles,
        });
      }
    }

    const hasErrors = duplicateEmails.length > 0 || errors.length > 0;
    const statusCode = !hasErrors ? 201 : 207;

    let message = "Faculty upload completed";
    if (!createdFaculties.length && (duplicateEmails.length || errors.length)) {
      message = "No faculty records created. Check duplicate emails/role values and Excel column names (name, email, role).";
    }

    const response = {
      success: createdFaculties.length > 0,
      message,
      inserted: createdFaculties.length,
      failed: duplicateEmails.length + errors.length,
      duplicateCount: duplicateEmails.length,
      errorCount: errors.length,
      createdFaculties,
      duplicateEmails,
      errors
    };


    return res.status(statusCode).json(response);


  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
};

export const addSingleFacultyUser = async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const role = normalizeRole(req.body?.role);

    if (!name || !email || !req.body?.role) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and role are required",
      });
    }

    if (!role) {
      return res.status(400).json({
        success: false,
        message: "Role must be Faculty, HOD, or admin",
      });
    }

    const existingDirectory = await FacultyDirectory.findOne({ email });
    if (existingDirectory) {
      existingDirectory.name = name;
      existingDirectory.roles = toUniqueRoles(existingDirectory.roles, [role]);
      existingDirectory.isActive = true;
      await existingDirectory.save();
    } else {
      await FacultyDirectory.create({
        name,
        email,
        roles: [role],
        isActive: true,
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(200).json({
        success: true,
        message: "Faculty directory updated. User account already exists.",
        userCreated: false,
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedDefaultPassword = await bcrypt.hash("Welcome@123", salt);

    const newUser = await User.create({
      name,
      email,
      password: hashedDefaultPassword,
      role,
      isFirstLogin: role !== "admin",
    });

    return res.status(201).json({
      success: true,
      message: "Faculty/user added successfully",
      userCreated: true,
      defaultPassword: "Welcome@123",
      data: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};


