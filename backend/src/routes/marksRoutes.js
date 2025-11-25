import express from "express";
import {
  addMarks,
  updateMarks,
  deleteMarks,
  getMarksByActivity,
  getMarksByStudent,
  getAllMarks,
  getMarksByClassSubject
} from "../controllers/marksController.js";

const router = express.Router();

/* ------------------- MARKS ROUTES ------------------- */

// Add marks for a student for one activity
router.post("/add", addMarks);

// Update marks for a student for one activity
router.put("/update/:studentSubjectMarksId/:activityId", updateMarks);

// Delete marks for a student for one activity
router.delete("/delete/:studentSubjectMarksId/:activityId", deleteMarks);

// Get marks for all students for one activity
router.get("/activity/:activityId", getMarksByActivity);

// Get marks for one student
router.get("/student/:studentId", getMarksByStudent);

// Get marks for class+subject
router.get("/class/:classId/subject/:subjectId", getMarksByClassSubject);

// Get all marks (admin/debug)
router.get("/", getAllMarks);

export default router;
