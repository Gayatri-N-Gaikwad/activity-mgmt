import express from "express";
import mongoose from "mongoose";
import Student from "../models/Student.js";

const router = express.Router();

// GET students by class
router.get("/by-class/:classId", async (req, res) => {
  try {
    const { classId } = req.params;

    console.log("Searching students in classId =", classId, "Type:", typeof classId);

    // Mongoose automatically handles ObjectId string conversion, but let's be explicit
    let queryClassId = classId;
    
    // Convert to ObjectId if it's a valid ObjectId string
    if (mongoose.Types.ObjectId.isValid(classId)) {
      queryClassId = new mongoose.Types.ObjectId(classId);
    }

    const students = await Student.find({ classId: queryClassId })  
      .select("name rollNumber classId _id")
      .lean();

    console.log(`Found ${students.length} students for classId ${classId}`);

    // Return empty array instead of error if no students found
    res.json({ students: students || [] });
  } catch (err) {
    console.error("Error in /students/by-class/:classId:", err);
    res.status(500).json({ error: "Server error fetching students", details: err.message });
  }
});

export default router;
