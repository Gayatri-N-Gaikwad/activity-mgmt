import express from "express";
import { getAllClasses,getClassesByFaculty } from "../controllers/classController.js";
import { ensureRole } from "../middlewares/ensureRole.js";

const router = express.Router();

// Get all classes (accessible to faculty, coordinator, HOD)
router.get("/all", ensureRole(["Faculty", "Coordinator", "HOD"]), getAllClasses);

router.get("/faculty/:facultyId", getClassesByFaculty);

export default router;
