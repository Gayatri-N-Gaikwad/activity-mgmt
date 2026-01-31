import express from "express";
import Class from "../models/Class.js";
import Student from "../models/Student.js";

const router = express.Router();

// GET students by class
router.get("/by-class/:classId", async (req, res) => {
  try {
    const { classId } = req.params;

    const classDoc = await Class.findById(classId);
    if (!classDoc) {
      return res.json({ students: [] });
    }

    const students = await Student.find({ year: classDoc.year, division: classDoc.division })
      .select("name rollNumber year division _id")
      .lean();

    res.json({ students: students || [] });
  } catch (err) {
    console.error("Error in /students/by-class/:classId:", err);
    res.status(500).json({ error: "Server error fetching students", details: err.message });
  }
});

// GET students by year and division
router.get("/by-year-division/:year/:division", async (req, res) => {
  try {
    const { year, division } = req.params;
    const students = await Student.find({ year, division })
      .select("name rollNumber year division _id")
      .lean();
    res.json({ students: students || [] });
  } catch (err) {
    console.error("Error in /students/by-year-division:", err);
    res.status(500).json({ error: "Server error fetching students" });
  }
});

export default router;
