import express from "express";
import {
  getAssignmentsByClass,
  getStudentsByActivityClass,
  getTeachingAssignmentById,
  createTeachingAssignment,
  getAssignmentsByFaculty,
  getSubjectsByFacultyAndClass,
  getAssignedSubjects
} from "../controllers/teachingAssignmentController.js";

const router = express.Router();

// GET subjects assigned to a faculty for a specific class
router.get("/subjects/:facultyId/:classId", getSubjectsByFacultyAndClass);

// GET students for an activity (based on class)
router.get("/activity/:activityId/byclass", getStudentsByActivityClass);

// GET all assigned subjects for a class & faculty
router.get("/assigned/:classId/:facultyId", getAssignedSubjects);

// GET all assignments of a class
router.get("/class/:classId", getAssignmentsByClass);

// GET assignments for a faculty
router.get("/byfaculty/:facultyId", getAssignmentsByFaculty);

// GET assignment by ID (must stay at bottom to avoid capture)
router.get("/:id", getTeachingAssignmentById);

// CREATE new assignment
router.post("/add", createTeachingAssignment);

export default router;
