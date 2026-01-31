import express from "express";
import { getAllClasses, getClassesByFaculty, getClassByYearDivision } from "../controllers/classController.js";
import { ensureRole } from "../middlewares/ensureRole.js";

const router = express.Router();

// Get all classes (accessible to faculty, coordinator, HOD)
router.get("/all", ensureRole(["Faculty", "Coordinator", "HOD"]), getAllClasses);

router.get("/faculty/:facultyId", getClassesByFaculty);

router.get("/by-year-division/:year/:division", getClassByYearDivision);

export default router;
