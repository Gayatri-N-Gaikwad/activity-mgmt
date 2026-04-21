import express from "express";
import {
  addMarks,
  updateMarks,
  deleteMarks,
  getMarksByActivity,
  getMarksByStudent,
  getAllMarks,
  getMarksByClassSubject,
  downloadActivityMarks,
  downloadMultipleActivitiesMarks,
  uploadMarksFromExcel,
  downloadMarksTemplate,
  bulkUpdateMarks
} from "../controllers/marksController.js";

import multer from "multer";

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

// Download marks for single activity
router.get("/download/:activityId", downloadActivityMarks);

// Download marks for multiple activities combined
router.post("/download-combined", downloadMultipleActivitiesMarks);



///////////////////////////////////////////////////////////////////////////

const upload = multer({ storage: multer.memoryStorage() });

router.get(
  "/activity/:activityId/template",
  downloadMarksTemplate
);

router.post(
  "/activity/:activityId/upload",
  upload.single("file"),
  uploadMarksFromExcel
);
 
router.post(
  "/activity/:activityId/bulk-update",
  bulkUpdateMarks
);


export default router;
