import express from "express";
import multer from "multer";
import {
  getAllTeachingAssignments,
  createClass,
  createSubject,
  assignSubjectAndClassToFaculty,
  uploadStudentsFromExcel,
  uploadSubjectsFromExcel,
  uploadFacultyFromExcel,
  addSingleFacultyUser,
  getAllClasses,
  getAllSubjects,
  getAllFaculties,
  getFacultyDirectory,
  setAcademicYear,
  getActiveAcademicYear,
  getAdminActivities
} from "../controllers/adminController.js";
import { isAdmin } from "../middlewares/isAdmin.js";

const router = express.Router();

/* ---------- Multer Config ---------- */
const storage = multer.memoryStorage(); // Excel processed in memory
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel" // .xls
    ];

    const hasValidMime = allowedMimeTypes.includes(file.mimetype);
    const hasValidExtension = /\.(xlsx|xls)$/i.test(file.originalname || "");

    if (hasValidMime || hasValidExtension) {
      cb(null, true);
    } else {
      cb(new Error("Only Excel files (.xlsx, .xls) are allowed"));
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

/* ---------- NEW: Upload faculties via Excel ---------- */
router.post(
  "/faculties/upload",
  upload.single("file"),
  uploadFacultyFromExcel
);

router.post("/faculties/add", addSingleFacultyUser);

/* ---------- Academic Year Routes ---------- */
router.post("/academic-year", setAcademicYear);


router.get("/academic-year/active", getActiveAcademicYear);
router.get("/classes", getAllClasses);
router.get("/subjects", getAllSubjects);
router.get("/faculties",  getAllFaculties);
router.get("/faculty-directory", getFacultyDirectory);

/* IMPORTANT: this must come BEFORE /activities/:id */
router.get("/activities", getAdminActivities);
// router.get("/activities/:id", getActivityById);


export default router;


/* ---------- Upload subjects via Excel ---------- */
router.post(
  "/subjects/upload",
  upload.single("file"),
  uploadSubjectsFromExcel
);
