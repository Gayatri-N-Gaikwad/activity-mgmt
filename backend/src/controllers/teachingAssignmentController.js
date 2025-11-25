import TeachingAssignment from "../models/TeachingAssignment.js";
import Activity from "../models/Activity.js";
import Student from "../models/Student.js";
import RubricCriteria from "../models/RubricCriteria.js";
import StudentActivityMarks from "../models/StudentActivityMarks.js";

/*  GET ALL ASSIGNMENTS FOR CLASS */
export const getAssignmentsByClass = async (req, res) => {
  try {
    const { classId } = req.params;

    const assignment = await TeachingAssignment.find({ classId })
      .populate("facultyId")
      .populate("subjectId")
      .populate("classId");

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

    const activity = await Activity.findById(activityId);
    if (!activity) {
      return res.status(404).json({ error: "Activity not found" });
    }

    const students = await Student.find({ classId: activity.classId })
      .select("name rollNumber classId");

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
      .populate("subjectId")
      .populate("classId");

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
      .populate("subjectId")
      .populate("classId");

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

    const assignment = await TeachingAssignment.create({
      facultyId,
      subjectId,
      classId
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

    // 1) Find assignment
    const assignment = await TeachingAssignment.findOne({ classId, subjectId });
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

    const subjects = await TeachingAssignment.find({
      classId,
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

    const assignments = await TeachingAssignment.find({
      classId,
      facultyId,
    }).populate("subjectId");

    const subjects = assignments.map(a => a.subjectId);
    return res.json({ data: subjects }); 
  } catch (error) {
    console.error("Error fetching subjects:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};

