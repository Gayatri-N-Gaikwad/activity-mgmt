import RubricCriteria from "../models/RubricCriteria.js";
import Activity from "../models/Activity.js";

export const getUsedMarks = async (req, res) => {
  try {
    const { assignmentId } = req.query;

    if (!assignmentId)
      return res.status(400).json({ error: "assignmentId is required" });

    // get activities under assignment
    const activities = await Activity.find({ assignmentId }).select("_id");
    const activityIds = activities.map(a => a._id);

    // get all rubric criteria for those activities
    const rubric = await RubricCriteria.find({
      activityId: { $in: activityIds }
    });

    // sum max marks
    const usedMarks = rubric.reduce((sum, r) => sum + r.maxMarks, 0);

    res.json({
      usedMarks,
      activityCount: activities.length
    });

  } catch (err) {
    console.error(" getUsedMarks ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
};

export const getRubricByActivity = async (req, res) => {
  try {
    const { activityId } = req.params;

    const rubric = await RubricCriteria.find({ activityId })
                                       .select("name maxMarks");

    if (!rubric || rubric.length === 0) {
      return res.status(404).json({ error: "Rubric not found for this activity" });
    }

    res.json({ rubric });
  } catch (error) {
    console.error("getRubricByActivity ERROR:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const createRubric = async (req, res) => {
  try {
    const { activityId, name, maxMarks } = req.body;

    if (!activityId || !name || maxMarks == null) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const newRubric = new RubricCriteria({
      activityId,
      name,
      maxMarks,
    });

    await newRubric.save();

    res.status(201).json({ message: "Rubric created successfully", rubric: newRubric });
  } catch (error) {
    console.error("createRubric ERROR:", error);
    res.status(500).json({ error: "Server error" });
  }
};