import express from "express";
import { updateAttendance } from "../controllers/studentSubjectMarksController.js";

const router = express.Router();

router.put("/update-attendance", updateAttendance);

export default router;
