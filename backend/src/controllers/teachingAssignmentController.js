import TeachingAssignment from "../models/TeachingAssignment.js";
import Activity from "../models/Activity.js";
import Student from "../models/Student.js";

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

/* GET ASSIGNMENT BY CLASS + SUBJECT */
export const getAssignmentByClassAndSubject = async (req, res) => {
  try {
    const { classId, subjectId } = req.query;

    if (!classId || !subjectId) {
      return res.status(400).json({ error: "classId and subjectId are required" });
    }

    const assignment = await TeachingAssignment.findOne({ classId, subjectId });

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    res.json({ assignment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

/* GET SUBJECTS ASSIGNED (OLD FUNCTION) */
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


/* GET subjects assigned to faculty for a class — MAIN function */
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

