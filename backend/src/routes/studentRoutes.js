import express from "express";
import Student from "../models/Student.js";
// const Student = require("../models/Student.js");


const router = express.Router();

// GET students by class
router.get("/by-class/:classId", async (req, res) => {
  try {
    const { classId } = req.params;

    console.log("Searching students in classId =", classId);

    const students = await Student.find({ classId })  
      .select("name rollNumber classId");

    res.json({ students });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error fetching students" });
  }
});

export default router;
