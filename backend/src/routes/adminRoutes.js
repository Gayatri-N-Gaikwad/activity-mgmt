import express from "express";
import multer from "multer";
import {
  getAllTeachingAssignments,
  createClass,
  createSubject,
  assignSubjectAndClassToFaculty,
  uploadStudentsFromExcel
} from "../controllers/adminController.js";
import { isAdmin } from "../middlewares/isAdmin.js";

const router = express.Router();

/* ---------- Multer Config ---------- */
const storage = multer.memoryStorage(); // Excel processed in memory
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only Excel files are allowed"));
    }
  }
});

/* ---------- Existing Routes ---------- */
// GET all teaching assignments (admin only)
router.get("/assignments", getAllTeachingAssignments);
// router.get("/subjects", isAdmin, getAllTeachingAssignments);

// Add new class
router.post("/addclass", createClass);

// Add new subject
router.post("/addsubject", createSubject); 

// Assign subject & class to a faculty
router.post(
  "/assign", // only admin can assign
  assignSubjectAndClassToFaculty
);


/* ---------- NEW: Upload students via Excel ---------- */
router.post(
  "/students/upload",
  upload.single("file"),
  uploadStudentsFromExcel
);

export default router;

