import express from "express";
import { ensureRole } from "../middlewares/ensureRole.js";
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
  ensureRole(["Faculty", "Coordinator", "HOD"]),
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
  ensureRole(["Faculty", "Coordinator", "HOD"]),
  updateActivity
);

/*----------------------- SCHEDULE ACTIVITY -----------------------*/
router.post(
  "/schedule/:id",
  ensureRole(["Faculty", "Coordinator", "HOD"]),
  scheduleActivity
);

/*----------------------- DELETE ACTIVITY -----------------------*/
router.delete(
  "/delete/:id",
  ensureRole(["Faculty", "Coordinator", "HOD"]),
  deleteActivity
);


// GET all students in a class
router.get("/class/:classId/students", getStudentsByClass);
export default router;
