import express from "express";
import { 
  getAllClasses, 
  getClassesByFaculty, 
  getClassByYearDivision,
  updateClassGoogleGroupEmail,
  getClassGoogleGroupEmail,
  getAllClassesWithGoogleGroups
} from "../controllers/classController.js";
import { ensureRole } from "../middlewares/ensureRole.js";

const router = express.Router();

// Get all classes (accessible to faculty, coordinator, HOD)
router.get("/all", ensureRole(["Faculty", "Coordinator", "HOD"]), getAllClasses);

router.get("/faculty/:facultyId", getClassesByFaculty);

router.get("/by-year-division/:year/:division", getClassByYearDivision);

/* ========== GOOGLE GROUP EMAIL ROUTES ========== */

// Get all classes with their Google Group emails (Admin only)
router.get("/google-groups/all", ensureRole(["admin"]), getAllClassesWithGoogleGroups);

// Get Google Group email for a specific class
router.get("/google-groups/:classId", ensureRole(["Faculty", "Coordinator", "HOD", "admin"]), getClassGoogleGroupEmail);

// Update Google Group email for a class (Admin only)
router.put("/google-groups/:classId", ensureRole(["admin"]), updateClassGoogleGroupEmail);

export default router;
