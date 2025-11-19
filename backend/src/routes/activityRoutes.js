import express from "express";
import { ensureRole } from "../middlewares/ensureRole.js";
import {
  createActivity,
  getAllActivities,
  getActivityById,
  updateActivity,
  scheduleActivity,
  deleteActivity
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

/*----------------------- GET ONE ACTIVITY -----------------------*/
router.get("/:id", getActivityById);

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

export default router;