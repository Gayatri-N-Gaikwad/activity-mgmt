import express from "express";
import { ensureRole } from "../middlewares/ensureRole.js";
import {
  addMarks,
  getAllMarks,
  getMarksByStudent,
  updateMarks,
  deleteMarks,
  checkMarksExist,
  getMarksByActivityId,
  getMarksBatch,
  getMarksByClassSubject, 
} from "../controllers/marksController.js";

const router = express.Router();

/* Add marks */
router.post("/add", ensureRole(["Faculty", "Coordinator"]), addMarks);

/* Get all marks */
router.get("/all", ensureRole(["Faculty", "Coordinator", "HOD"]), getAllMarks);

/* Get marks by student */
router.get("/student/:studentId", ensureRole(["Faculty", "Coordinator", "HOD"]), getMarksByStudent);

/* Batch fetch marks */
router.get("/batch", getMarksBatch);

/* Update marks */
router.put("/update/:id", ensureRole(["Faculty", "Coordinator"]), updateMarks);

/* Delete marks */
router.delete("/delete/:id", ensureRole(["Faculty", "Coordinator", "HOD"]), deleteMarks);

/* Get marks for a specific activity */
router.get("/activity/:activityId", ensureRole(["Faculty", "Coordinator", "HOD"]), getMarksByActivityId);

/* Check if marks exist for an activity */
router.get("/check-exists/:activityId", checkMarksExist);

/* Get marks for all students in a class & subject */
router.get("/class/:classId/subject/:subjectId", ensureRole(["Faculty", "Coordinator", "HOD"]), getMarksByClassSubject);

export default router;
