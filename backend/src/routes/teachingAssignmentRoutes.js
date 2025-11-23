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

// GET all assignments of a class
router.get("/class/:classId", getAssignmentsByClass);

// GET subjects assigned to a faculty for a specific class
router.get("/subjects/:facultyId/:classId", getSubjectsByFacultyAndClass);

// GET students for an activity (based on class)
router.get("/activity/:activityId/byclass", getStudentsByActivityClass);

// GET all assigned subjects (RENAMED to avoid conflict)
router.get("/assigned/:classId/:facultyId", getAssignedSubjects);

// GET assignment by ID
router.get("/:id", getTeachingAssignmentById);

// GET assignments for a faculty
router.get("/byfaculty/:facultyId", getAssignmentsByFaculty);

// CREATE new assignment
router.post("/add", createTeachingAssignment);

export default router;
