import express from "express";
import {
  getAllTeachingAssignments,
  createClass,
  createSubject,
  assignSubjectAndClassToFaculty 
} from "../controllers/teachingAssignmentController.js";
import { isAdmin } from "../middlewares/isAdmin.js";

const router = express.Router();

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

export default router;
