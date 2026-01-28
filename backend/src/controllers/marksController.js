import StudentSubjectMarks from "../models/StudentSubjectMarks.js";
import Activity from "../models/Activity.js";
import RubricCriteria from "../models/RubricCriteria.js";
import { createMarksExcel, createCombinedMarksExcel } from "../utils/excelExport.js";

import ExcelJS from "exceljs";
import Student from "../models/Student.js";
import TeachingAssignment from "../models/TeachingAssignment.js";
import multer from "multer";


const validateRubricSubmission = async (activityId, rubricMarks = []) => {
  if (!activityId) {
    return { valid: false, message: "activityId is required for rubric validation" };
  }

  if (!Array.isArray(rubricMarks) || rubricMarks.length === 0) {
    return { valid: false, message: "rubricMarks must contain at least one entry" };
  }

  const rubricCriteria = await RubricCriteria.find({ activityId }).select("name maxMarks");
  if (!rubricCriteria.length) {
    return { valid: false, message: "No rubric defined for this activity" };
  }

  let maxTotal = 0;
  const criteriaMap = new Map();
  for (const crit of rubricCriteria) {
    const maxMarks = Number(crit.maxMarks);
    if (Number.isNaN(maxMarks) || maxMarks <= 0) {
      return {
        valid: false,
        message: `Rubric criteria "${crit.name || "Unnamed"}" is misconfigured. Please set valid max marks.`,
      };
    }
    criteriaMap.set(crit._id.toString(), { name: crit.name, maxMarks });
    maxTotal += maxMarks;
  }

  let total = 0;
  for (const entry of rubricMarks) {
    const criteriaId = entry?.criteriaId?.toString();
    const marksValue = entry?.marks;

    if (!criteriaId || !criteriaMap.has(criteriaId)) {
      return { valid: false, message: "Invalid rubric criteria supplied" };
    }

    const numericValue = Number(marksValue ?? 0);
    if (Number.isNaN(numericValue)) {
      return { valid: false, message: "Marks must be numeric values" };
    }
    if (numericValue < 0) {
      return { valid: false, message: "Marks cannot be negative" };
    }

    const { name, maxMarks } = criteriaMap.get(criteriaId);
    if (numericValue > maxMarks) {
      return { valid: false, message: `Marks for ${name} cannot exceed ${maxMarks}` };
    }

    total += numericValue;
  }

  if (total > maxTotal) {
    return { valid: false, message: `Total marks ${total} exceed allowed ${maxTotal}` };
  }

  return { valid: true, totalRubricMarks: total, maxRubricMarks: maxTotal };
};

/* ------------------------- ADD MARKS ------------------------- */
export const addMarks = async (req, res) => {
  try {
    const { studentId, activityId, rubricMarks, attendance = 'Present', subjectId, classId } = req.body;

    //  Validate required fields
    if (!studentId) return res.status(400).json({ error: "studentId is required" });
    if (!activityId) return res.status(400).json({ error: "activityId is required" });
    if (!subjectId) return res.status(400).json({ error: "subjectId is required" });

    // Validate attendance
    if (!['Present', 'Absent'].includes(attendance)) {
      return res.status(400).json({ error: "Attendance must be either 'Present' or 'Absent'" });
    }

    const activity = await Activity.findById(activityId);
    if (!activity) return res.status(404).json({ error: "Activity not found" });

    // If student is absent, ensure no marks are provided
    if (attendance === 'Absent') {
      const hasMarks = rubricMarks.some(r => Number(r.marks || 0) > 0);
      if (hasMarks) {
        return res.status(400).json({ error: "Cannot enter marks for absent students" });
      }
    } else {
      // Validate marks for present students
      const validation = await validateRubricSubmission(activityId, rubricMarks);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.message });
      }
    }

    const totalRubricMarks = attendance === 'Present' ? 
      (await validateRubricSubmission(activityId, rubricMarks)).totalRubricMarks : 0;

    // Fetch or create student-subject marks
    let doc = await StudentSubjectMarks.findOne({ studentId, subjectId });

    if (!doc) {
      doc = new StudentSubjectMarks({
        studentId,
        subjectId,
        classId,
        activities: []
      });
    } else {
      // Update classId if it's missing or if a new classId is provided
      if (classId && (!doc.classId || doc.classId.toString() !== classId.toString())) {
        doc.classId = classId;
      }
    }

    // Check if activity already present
    const existing = doc.activities.find(a => a.activityId.toString() === activityId);
    if (existing) {
      return res.status(400).json({ error: "Marks already exist for this activity" });
    }

    // Add new activity entry
    doc.activities.push({
      activityId,
      rubricMarks,
      totalRubricMarks,
      attendance
    });

    // Update totalMarks
    doc.totalMarks = doc.activities.reduce((sum, a) => sum + a.totalRubricMarks, 0);

    await doc.save();
    res.status(201).json(doc);

  } catch (err) {
    console.error("Add marks error:", err);
    res.status(500).json({ error: err.message });
  }
};

/* ------------------------- UPDATE MARKS ------------------------- */
export const updateMarks = async (req, res) => {
  try {
    const { studentSubjectMarksId, activityId } = req.params;
    const { rubricMarks, attendance } = req.body;

    const doc = await StudentSubjectMarks.findById(studentSubjectMarksId);
    if (!doc) return res.status(404).json({ error: "Document not found" });

    const activityEntry = doc.activities.find(a => a.activityId.toString() === activityId);
    if (!activityEntry) {
      return res.status(404).json({ error: "Activity marks not found" });
    }

    // Validate attendance
    if (attendance && !['Present', 'Absent'].includes(attendance)) {
      return res.status(400).json({ error: "Attendance must be either 'Present' or 'Absent'" });
    }

    // Update attendance if provided
    if (attendance && ['Present', 'Absent'].includes(attendance)) {
      activityEntry.attendance = attendance;
    }

    // Update rubric marks
    if (Array.isArray(rubricMarks)) {
      // If student is absent, ensure no marks are provided
      if (activityEntry.attendance === 'Absent') {
        const hasMarks = rubricMarks.some(r => Number(r.marks || 0) > 0);
        if (hasMarks) {
          return res.status(400).json({ error: "Cannot enter marks for absent students" });
        }
        activityEntry.rubricMarks = rubricMarks;
        activityEntry.totalRubricMarks = 0;
      } else {
        // Validate marks for present students
        const validation = await validateRubricSubmission(activityId, rubricMarks);
        if (!validation.valid) {
          return res.status(400).json({ error: validation.message });
        }
        activityEntry.rubricMarks = rubricMarks;
        activityEntry.totalRubricMarks = validation.totalRubricMarks;
      }
    }

    // Recalculate total marks
    doc.totalMarks = doc.activities.reduce((sum, a) => sum + a.totalRubricMarks, 0);

    await doc.save();
    res.json(doc);

  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ error: err.message });
  }
};

/* ------------------------- DELETE MARKS ------------------------- */
export const deleteMarks = async (req, res) => {
  try {
    const { studentSubjectMarksId, activityId } = req.params;

    const doc = await StudentSubjectMarks.findById(studentSubjectMarksId);
    if (!doc) return res.status(404).json({ error: "Document not found" });

    doc.activities = doc.activities.filter(a => a.activityId.toString() !== activityId);

    // Recalculate totalMarks
    doc.totalMarks = doc.activities.reduce((sum, a) => sum + a.totalRubricMarks, 0);

    await doc.save();
    res.json({ message: "Activity marks deleted", doc });

  } catch (err) {
    console.error("Delete marks error:", err);
    res.status(500).json({ error: err.message });
  }
};

/* ------------------------- GET MARKS BY ACTIVITY ------------------------- */
export const getMarksByActivity = async (req, res) => {
  try {
    const { activityId } = req.params;

    const docs = await StudentSubjectMarks.find({
      "activities.activityId": activityId
    })
      .populate("studentId")
      .populate("subjectId")
      .populate("activities.activityId")
      .lean();

    res.json({ marks: docs });

  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ error: err.message });
  }
};

/* ------------------------- GET MARKS BY STUDENT ------------------------- */
export const getMarksByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;

    const doc = await StudentSubjectMarks.find({ studentId })
      .populate("subjectId")
      .populate("activities.activityId")
      .lean();

    res.json(doc);

  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ error: err.message });
  }
};

/* ------------------------- GET CLASS + SUBJECT MARKS ------------------------- */
export const getMarksByClassSubject = async (req, res) => {
  try {
    const { classId, subjectId } = req.params;

    // Find marks by subjectId, and then filter by classId if it exists in the document
    // This handles cases where classId might be null in older records
    let docs = await StudentSubjectMarks.find({ subjectId })
      .populate("studentId", "name rollNumber classId")
      .populate({
        path: "activities.activityId",
        select: "_id name scheduleDate status"
      })
      .lean();

    // Filter by classId: either the document has the matching classId, or if classId is null/undefined,
    // check if the student's classId matches (for backward compatibility)
    docs = docs.filter((doc) => {
      if (doc.classId) {
        return doc.classId.toString() === classId;
      }
      // If classId is not set in the document, check the student's classId
      if (doc.studentId && doc.studentId.classId) {
        return doc.studentId.classId.toString() === classId;
      }
      return false;
    });

    // Sort activities by scheduleDate for each student's marks
    docs.forEach((doc) => {
      if (doc.activities && Array.isArray(doc.activities)) {
        // Filter out activities where activityId is null (deleted activities)
        doc.activities = doc.activities.filter(a => a.activityId != null);
        
        // Sort by scheduleDate
        doc.activities.sort((a, b) => {
          const dateA = a.activityId?.scheduleDate ? new Date(a.activityId.scheduleDate) : new Date(0);
          const dateB = b.activityId?.scheduleDate ? new Date(b.activityId.scheduleDate) : new Date(0);
          return dateA - dateB;
        });
      }
    });

    res.json({ success: true, marks: docs });

  } catch (err) {
    console.error("Class subject fetch error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const getAllMarks = async (req, res) => {
  try {
    const marks = await StudentSubjectMarks.find()
      .populate("studentId")
      .populate("subjectId")
      .populate("classId");

    res.json({ success: true, marks });
  } catch (err) {
    console.error("Get all marks error:", err);
    res.status(500).json({ success: false, message: "Unable to fetch marks" });
  }
};

/* ----------------------- DOWNLOAD MARKS AS EXCEL ----------------------- */

export const downloadActivityMarks = async (req, res) => {
  try {
    const { activityId } = req.params;

    // Fetch activity with details
    const activity = await Activity.findById(activityId);
    if (!activity) {
      return res.status(404).json({ error: "Activity not found" });
    }

    // Fetch rubric criteria for this activity
    const rubricCriteria = await RubricCriteria.find({ activityId });

    // Fetch all marks for this activity
    const marksData = await StudentSubjectMarks.find({
      "activities.activityId": activityId
    })
      .populate("studentId", "name rollNumber")
      .populate("subjectId", "name")
      .lean();

    // Transform data for Excel
    const students = marksData.map((mark) => ({
      _id: mark.studentId._id,
      name: mark.studentId.name,
      rollNumber: mark.studentId.rollNumber,
      activities: mark.activities
        .filter((a) => a.activityId.toString() === activityId)
        .map((a) => ({
          activityId: a.activityId,
          totalRubricMarks: a.totalRubricMarks,
          rubricMarks: a.rubricMarks,
          attendance: a.attendance
        }))
    }));

    const activitiesData = [{
      _id: activity._id,
      name: activity.name,
      maxMarks: rubricCriteria.reduce((sum, r) => sum + r.maxMarks, 0),
      rubric: rubricCriteria
    }];

    // Create Excel file
    const buffer = await createMarksExcel({
      students,
      activities: activitiesData,
      subject: marksData[0]?.subjectId?.name || "Subject",
      className: "Class"
    });

    // Send file
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="Activity_${activity.name}_Marks.xlsx"`);
    res.send(buffer);

  } catch (err) {
    console.error("Download activity marks error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const downloadMultipleActivitiesMarks = async (req, res) => {
  try {
    const { activityIds } = req.body;

    if (!Array.isArray(activityIds) || activityIds.length === 0) {
      return res.status(400).json({ error: "activityIds array is required" });
    }

    // Fetch all activities
    const activities = await Activity.find({ _id: { $in: activityIds } });

    if (activities.length === 0) {
      return res.status(404).json({ error: "No activities found" });
    }

    // Fetch rubric for each activity
    const rubricMap = {};
    for (const activity of activities) {
      const rubric = await RubricCriteria.find({ activityId: activity._id });
      rubricMap[activity._id] = rubric;
    }

    // Fetch marks for all activities
    const marksData = await StudentSubjectMarks.find({
      "activities.activityId": { $in: activityIds }
    })
      .populate("studentId", "name rollNumber")
      .populate("subjectId", "name")
      .lean();

    // Transform students data
    const students = marksData.map((mark) => ({
      _id: mark.studentId._id,
      name: mark.studentId.name,
      rollNumber: mark.studentId.rollNumber,
      activities: mark.activities
    }));

    // Transform activities data
    const activitiesData = activities.map((activity) => ({
      _id: activity._id,
      name: activity.name,
      maxMarks: rubricMap[activity._id].reduce((sum, r) => sum + r.maxMarks, 0),
      rubric: rubricMap[activity._id]
    }));

    // Create combined Excel file with multiple sheets
    const buffer = await createCombinedMarksExcel({
      students,
      activities: activitiesData,
      subject: marksData[0]?.subjectId?.name || "Subject",
      className: "Class"
    });

    // Send file
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="Combined_Marks.xlsx"`);
    res.send(buffer);

  } catch (err) {
    console.error("Download multiple marks error:", err);
    res.status(500).json({ error: err.message });
  }
};



////////////////////////////////////////////////////////////////////////////////////

export const downloadMarksTemplate = async (req, res) => {
  try {
    const { activityId } = req.params;

    const activity = await Activity.findById(activityId);
    if (!activity) {
      return res.status(404).json({ error: "Activity not found" });
    }

    const rubrics = await RubricCriteria.find({ activityId });
    if (!rubrics.length) {
      return res.status(400).json({ error: "No rubric found for activity" });
    }

    const assignmentId =
      activity.assignmentId?._id || activity.assignmentId;

    const assignment = await TeachingAssignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ error: "Teaching assignment not found" });
    }

    const students = await Student.find({ classId: assignment.classId })
      .sort({ rollNumber: 1 });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Marks");

    // ---- HEADER ----
    const headers = [
      "Roll Number",
      "Student Name",
      "Attendance",
      ...rubrics.map(r => `${r.name} (max ${r.maxMarks})`)
    ];

    sheet.addRow(headers);

    // ---- STUDENT ROWS ----
    students.forEach(student => {
      sheet.addRow([
        student.rollNumber,
        student.name,
        "Present",
        ...rubrics.map(() => "")
      ]);
    });

    sheet.columns.forEach(col => {
      col.width = 22;
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=activity_${activityId}_marks.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error("Excel download error:", err);
    res.status(500).json({ error: err.message });
  }
};

/* ----------------------- UPLOAD MARKS FROM EXCEL ----------------------- */

export const uploadMarksFromExcel = async (req, res) => {
  try {
    const { activityId } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: "Excel file is required" });
    }

    const activity = await Activity.findById(activityId);
    if (!activity) {
      return res.status(404).json({ error: "Activity not found" });
    }

    const assignmentId =
      activity.assignmentId?._id || activity.assignmentId;

    const assignment = await TeachingAssignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ error: "Teaching assignment not found" });
    }

    const rubrics = await RubricCriteria.find({ activityId });
    if (!rubrics.length) {
      return res.status(400).json({ error: "No rubric found for activity" });
    }

    // Load Excel
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const sheet = workbook.worksheets[0];

    const errors = [];
    const validRows = [];

    // Start from row 2 (skip header)
    for (let rowIndex = 2; rowIndex <= sheet.rowCount; rowIndex++) {
      const row = sheet.getRow(rowIndex);

      const rollNumber = row.getCell(1).value;
      const attendance = row.getCell(3).value || "Present";

      if (!rollNumber) continue;

      if (!["Present", "Absent"].includes(attendance)) {
        errors.push(`Row ${rowIndex}: Invalid attendance`);
        continue;
      }

      const student = await Student.findOne({
        rollNumber,
        classId: assignment.classId
      });

      if (!student) {
        errors.push(`Row ${rowIndex}: Student not found (roll ${rollNumber})`);
        continue;
      }

      // Build rubricMarks from Excel
      const rubricMarks = rubrics.map((r, idx) => ({
        criteriaId: r._id,
        marks: Number(row.getCell(4 + idx).value || 0)
      }));

      // ❌ Absent student rule
      if (
        attendance === "Absent" &&
        rubricMarks.some(r => r.marks > 0)
      ) {
        errors.push(`Row ${rowIndex}: Absent student has marks`);
        continue;
      }

      // ✅ Reuse your EXISTING validator
      const validation = await validateRubricSubmission(
        activityId,
        rubricMarks
      );

      if (!validation.valid) {
        errors.push(`Row ${rowIndex}: ${validation.message}`);
        continue;
      }

      validRows.push({
        studentId: student._id,
        subjectId: assignment.subjectId,
        classId: assignment.classId,
        rubricMarks,
        attendance,
        totalRubricMarks: validation.totalRubricMarks
      });
    }

    // ❌ If any error, reject whole file
    if (errors.length) {
      return res.status(400).json({ errors });
    }

    // ✅ Insert marks (same logic as addMarks)
    for (const row of validRows) {
      let doc = await StudentSubjectMarks.findOne({
        studentId: row.studentId,
        subjectId: row.subjectId
      });

      if (!doc) {
        doc = new StudentSubjectMarks({
          studentId: row.studentId,
          subjectId: row.subjectId,
          classId: row.classId,
          activities: []
        });
      }

      const exists = doc.activities.find(
        a => a.activityId.toString() === activityId
      );
      if (exists) continue;

      doc.activities.push({
        activityId,
        rubricMarks: row.rubricMarks,
        totalRubricMarks: row.totalRubricMarks,
        attendance: row.attendance
      });

      doc.totalMarks = doc.activities.reduce(
        (sum, a) => sum + a.totalRubricMarks,
        0
      );

      await doc.save();
    }

    res.json({ success: true, message: "Marks uploaded successfully" });

  } catch (err) {
    console.error("Excel upload error:", err);
    res.status(500).json({ error: err.message });
  }
};


