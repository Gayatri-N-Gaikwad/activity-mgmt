import express from "express";
import Subject from "../models/Subject.js";


const router = express.Router();

// Add a new subject
router.post("/add", async (req, res) => {
  try {
    const { name, code } = req.body;

    if (!name || !code) {
      return res.status(400).json({ error: "Name and code are required" });
    }

    const subject = new Subject({ name, code });
    await subject.save();

    res.json({ message: "Subject added successfully", subject });
  } catch (err) {
    console.error("Error adding subject:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get all subjects
router.get("/", async (req, res) => {
  try {
    const subjects = await Subject.find();
    res.json({ subjects });
  } catch (err) {
    console.error("Error fetching subjects:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get subject by ID
router.get("/:id", async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);

    if (!subject) {
      return res.status(404).json({ error: "Subject not found" });
    }

    res.json({ subject });
  } catch (err) {
    console.error("Error fetching subject:", err);
    res.status(500).json({ error: "Server error" });
  }
});




router.put("/assign-coordinator/:subjectId", async (req, res) => {

  try {

    const { coordinatorId } = req.body;

    if(!coordinatorId){
      return res.status(400).json({message:"Coordinator ID required"});
    }

    const subject = await Subject.findByIdAndUpdate(
      req.params.subjectId,
      { coordinator: coordinatorId },
      { new: true }
    );

    res.json(subject);

  } catch (error) {
    res.status(500).json(error);
  }

});

export default router;
