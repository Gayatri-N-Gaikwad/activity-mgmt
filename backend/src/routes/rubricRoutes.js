import express from "express";
import { getRubricByActivity,
  getUsedMarks,
  createRubric,
} from "../controllers/rubricController.js";

const router = express.Router();

router.post("/create", createRubric);             // POST /api/rubric/create
router.get("/used-marks", getUsedMarks);          // GET /api/rubric/used-marks?assignmentId=...
router.get("/:activityId", getRubricByActivity);  // GET /api/rubric/:activityId

export default router;
