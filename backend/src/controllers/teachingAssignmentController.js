import Class from "../models/Class.js";
import TeachingAssignment from "../models/TeachingAssignment.js";
import Activity from "../models/Activity.js";
import Student from "../models/Student.js";
import RubricCriteria from "../models/RubricCriteria.js";
import StudentActivityMarks from "../models/StudentActivityMarks.js";

const resolveClassToYearDivision = async (classId) => {
  const classDoc = await Class.findById(classId);
  return classDoc ? { year: classDoc.year, division: classDoc.division } : null;
};

/*  GET ALL ASSIGNMENTS FOR CLASS */
export const getAssignmentsByClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const yd = await resolveClassToYearDivision(classId);
    if (!yd) return res.status(404).json({ error: "Class not found" });

    const assignment = await TeachingAssignment.find({ year: yd.year, division: yd.division })
      .populate("facultyId")
      .populate("subjectId");

    if (!assignment || assignment.length === 0) {
      return res.status(404).json({ error: "No assignment found for this class" });
    }

    res.json({ assignment });
  } catch (err) {
    console.error("Error fetching by class:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/* GET STUDENTS BASED ON ACTIVITY CLASS */
export const getStudentsByActivityClass = async (req, res) => {
  try {
    const { activityId } = req.params;

    const activity = await Activity.findById(activityId).populate("assignmentId");
    if (!activity) {
      return res.status(404).json({ error: "Activity not found" });
    }

    const assignment = activity.assignmentId;
    if (!assignment || !assignment.year || !assignment.division) {
      return res.status(404).json({ error: "Assignment missing year/division" });
    }

    const students = await Student.find({ year: assignment.year, division: assignment.division })
      .select("name rollNumber year division")
      .sort({ rollNumber: 1 })
      .lean();

    students.sort((a, b) => {
      const rollA = Number(a.rollNumber || 0);
      const rollB = Number(b.rollNumber || 0);
      return rollA - rollB;
    });

    res.json({ students });
  } catch (err) {
    console.error("Error fetching students for class:", err);
    res.status(500).json({ error: "Server error fetching students" });
  }
};

/* GET TEACHING ASSIGNMENT BY ID */
export const getTeachingAssignmentById = async (req, res) => {
  try {
    const assignment = await TeachingAssignment.findById(req.params.id)
      .populate("facultyId")
      .populate("subjectId");

    if (!assignment) {
      return res.status(404).json({ error: "Teaching assignment not found" });
    }

    res.json({ assignment });
  } catch (err) {
    console.error("Error fetching assignment:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/* GET ASSIGNMENTS BY FACULTY */
export const getAssignmentsByFaculty = async (req, res) => {
  try {
    const { facultyId } = req.params;

    const assignments = await TeachingAssignment.find({ facultyId })
      .populate("facultyId")
      .populate("subjectId");

    if (!assignments || assignments.length === 0) {
      return res.status(404).json({ error: "No teaching assignments found" });
    }

    res.json(assignments);
  } catch (err) {
    console.error("Error fetching assignments by faculty:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/* CREATE NEW TEACHING ASSIGNMENT */
export const createTeachingAssignment = async (req, res) => {
  try {
    const { facultyId, subjectId, classId } = req.body;

    if (!facultyId || !subjectId || !classId) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const yd = await resolveClassToYearDivision(classId);
    if (!yd) return res.status(400).json({ error: "Class not found" });

    const assignment = await TeachingAssignment.create({
      facultyId,
      subjectId,
      year: yd.year,
      division: yd.division
    });

    res.status(201).json({ message: "Teaching assignment created", assignment });
  } catch (err) {
    console.error("Error creating teaching assignment:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/* GET MARKS BY CLASS AND SUBJECT */
export const getMarksByClassSubject = async (req, res) => {
  try {
    const { classId, subjectId } = req.params;

    const yd = await resolveClassToYearDivision(classId);
    if (!yd) return res.json({});

    // 1) Find assignment
    const assignment = await TeachingAssignment.findOne({ year: yd.year, division: yd.division, subjectId });
    if (!assignment) return res.json({});

    // 2) Find all activities under this assignment, sorted by scheduleDate
    const activities = await Activity.find({ assignmentId: assignment._id })
      .sort({ scheduleDate: 1 })
      .lean();
    if (!activities.length) return res.json({});

    const activityIds = activities.map(a => a._id);

    // 3) Fetch all marks
    const marks = await StudentActivityMarks.find({
      activityId: { $in: activityIds }
    }).lean();

    const result = {};

    marks.forEach(m => {
      const studentId = m.studentId.toString();
      const activityId = m.activityId.toString();

      if (!result[studentId]) {
        result[studentId] = {
          activityMarks: {}, // Use activityId as key
          attendance: m.attendanceMarks || 0,
          studentMarksIds: {},
        };
      }

      // Map marks explicitly by activityId
      result[studentId].activityMarks[activityId] = m.totalRubricMarks;
      result[studentId].studentMarksIds[activityId] = m._id.toString();

      // Attendance (same for all activities)
      result[studentId].attendance = m.attendanceMarks;
    });

    // Optional: send activities as well for frontend table order
    res.json({ result, activities });

  } catch (err) {
    console.error("Error fetching marks:", err);
    res.status(500).json({ error: "Server error fetching marks" });
  }
};


/* GET SUBJECTS ASSIGNED  */
export const getAssignedSubjects = async (req, res) => {
  try {
    const { classId, facultyId } = req.params;

    const yd = await resolveClassToYearDivision(classId);
    if (!yd) return res.status(404).json({ error: "Class not found" });

    const subjects = await TeachingAssignment.find({
      year: yd.year,
      division: yd.division,
      facultyId
    }).populate("subjectId");

    return res.json({ subjects });
  } catch (error) {
    console.error("Error in getAssignedSubjects:", error);
    res.status(500).json({ message: "Server error fetching assigned subjects" });
  }
};


/* GET subjects assigned to faculty for a class  */
export const getSubjectsByFacultyAndClass = async (req, res) => {
  try {
    const { classId, facultyId } = req.params;

    const yd = await resolveClassToYearDivision(classId);
    if (!yd) return res.status(404).json({ error: "Class not found" });

    const assignments = await TeachingAssignment.find({
      year: yd.year,
      division: yd.division,
      facultyId,
    }).populate("subjectId");

    const subjects = assignments.map(a => a.subjectId);
    return res.json({ data: subjects }); 
  } catch (error) {
    console.error("Error fetching subjects:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};