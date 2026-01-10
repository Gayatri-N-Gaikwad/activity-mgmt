import express from "express";
import { ensureRole } from "../middlewares/ensureRole.js";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

import {
  createActivity,
  getAllActivities,
  getActivityById,
  updateActivity,
  scheduleActivity,
  deleteActivity,
  getActivitiesByAssignment,
  getActivitiesByClassSubject,
  getStudentsByClass
} from "../controllers/activityController.js";

const router = express.Router();

/*----------------------- CREATE ACTIVITY -----------------------*/
router.post(
  "/create",
  ensureRole(["Faculty", "Coordinator", "HOD", "admin"]),
  createActivity
);

/*----------------------- GET ALL ACTIVITIES -----------------------*/
router.get("/all", getAllActivities);

/* -------- GET ACTIVITIES BY ASSIGNMENT  -------- */
router.get("/", getActivitiesByAssignment);

/*----------------------- GET ONE ACTIVITY -----------------------*/
router.get("/:id", getActivityById);

router.get("/by-class-subject/:classId/:subjectId", getActivitiesByClassSubject);

router.get("/by-assignment/:assignmentId", getActivitiesByAssignment);

/*----------------------- UPDATE ACTIVITY -----------------------*/
router.put(
  "/update/:id",
  ensureRole(["Faculty", "Coordinator", "HOD", "admin"]),
  upload.array('modelAnswerFiles', 10), // Allow up to 10 files
  updateActivity
);

/*----------------------- SCHEDULE ACTIVITY -----------------------*/
router.post(
  "/schedule/:id",
  ensureRole(["Faculty", "Coordinator", "HOD", "admin"]),
  scheduleActivity
);

/*----------------------- DELETE ACTIVITY -----------------------*/
router.delete(
  "/delete/:id",
  ensureRole(["Faculty", "Coordinator", "HOD", "admin"]),
  deleteActivity
);


// GET all students in a class
router.get("/class/:classId/students", getStudentsByClass);
export default router;
