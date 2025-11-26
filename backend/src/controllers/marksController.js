import StudentSubjectMarks from "../models/StudentSubjectMarks.js";
import Activity from "../models/Activity.js";
import RubricCriteria from "../models/RubricCriteria.js";

const validateRubricSubmission = async (activityId, rubricMarks = []) => {
  if (!activityId) {
    return { valid: false, message: "activityId is required for rubric validation" };
  }

  if (!Array.isArray(rubricMarks) || rubricMarks.length === 0) {
    return { valid: false, message: "rubricMarks must contain at least one entry" };
  }

  const rubricCriteria = await RubricCriteria.find({ activityId }).select("name maxMarks");
  if (!rubricCriteria.length) {
    return { valid: false, message: "No rubric defined for this activity" };
  }

  let maxTotal = 0;
  const criteriaMap = new Map();
  for (const crit of rubricCriteria) {
    const maxMarks = Number(crit.maxMarks);
    if (Number.isNaN(maxMarks) || maxMarks <= 0) {
      return {
        valid: false,
        message: `Rubric criteria "${crit.name || "Unnamed"}" is misconfigured. Please set valid max marks.`,
      };
    }
    criteriaMap.set(crit._id.toString(), { name: crit.name, maxMarks });
    maxTotal += maxMarks;
  }

  let total = 0;
  for (const entry of rubricMarks) {
    const criteriaId = entry?.criteriaId?.toString();
    const marksValue = Number(entry?.marks ?? 0);

    if (!criteriaId || !criteriaMap.has(criteriaId)) {
      return { valid: false, message: "Invalid rubric criteria supplied" };
    }

    if (Number.isNaN(marksValue)) {
      return { valid: false, message: "Marks must be numeric values" };
    }

    if (marksValue < 0) {
      return { valid: false, message: "Marks cannot be negative" };
    }

    const { name, maxMarks } = criteriaMap.get(criteriaId);
    if (marksValue > maxMarks) {
      return { valid: false, message: `Marks for ${name} cannot exceed ${maxMarks}` };
    }

    total += marksValue;
  }

  if (total > maxTotal) {
    return { valid: false, message: `Total marks ${total} exceed allowed ${maxTotal}` };
  }

  return { valid: true, totalRubricMarks: total, maxRubricMarks: maxTotal };
};

/* ------------------------- ADD MARKS ------------------------- */
export const addMarks = async (req, res) => {
  try {
    const { studentId, activityId, rubricMarks, attendanceMarks = 0, subjectId, classId } = req.body;

    //  Validate required fields
    if (!studentId) return res.status(400).json({ error: "studentId is required" });
    if (!activityId) return res.status(400).json({ error: "activityId is required" });
    if (!subjectId) return res.status(400).json({ error: "subjectId is required" });

    const activity = await Activity.findById(activityId);
    if (!activity) return res.status(404).json({ error: "Activity not found" });

    const validation = await validateRubricSubmission(activityId, rubricMarks);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.message });
    }
    const { totalRubricMarks } = validation;

    // Fetch or create student-subject marks
    let doc = await StudentSubjectMarks.findOne({ studentId, subjectId });

    if (!doc) {
      doc = new StudentSubjectMarks({
        studentId,
        subjectId,
        classId,
        attendanceMarks,
        activities: []
      });
    }

    // Check if activity already present
    const existing = doc.activities.find(a => a.activityId.toString() === activityId);
    if (existing) {
      return res.status(400).json({ error: "Marks already exist for this activity" });
    }

    // Add new activity entry
    doc.activities.push({
      activityId,
      rubricMarks,
      totalRubricMarks
    });

    // Update totalMarks
    doc.totalMarks =
      doc.attendanceMarks +
      doc.activities.reduce((sum, a) => sum + a.totalRubricMarks, 0);

    await doc.save();
    res.status(201).json(doc);

  } catch (err) {
    console.error("Add marks error:", err);
    res.status(500).json({ error: err.message });
  }
};

/* ------------------------- UPDATE MARKS ------------------------- */
export const updateMarks = async (req, res) => {
  try {
    const { studentSubjectMarksId, activityId } = req.params;
    const { rubricMarks, attendanceMarks } = req.body;

    const doc = await StudentSubjectMarks.findById(studentSubjectMarksId);
    if (!doc) return res.status(404).json({ error: "Document not found" });

    const activityEntry = doc.activities.find(a => a.activityId.toString() === activityId);
    if (!activityEntry) {
      return res.status(404).json({ error: "Activity marks not found" });
    }

    // Update attendance (if provided)
    if (attendanceMarks !== undefined) {
      doc.attendanceMarks = attendanceMarks;
    }

    // Update rubric marks
    if (Array.isArray(rubricMarks)) {
      const validation = await validateRubricSubmission(activityId, rubricMarks);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.message });
      }
      activityEntry.rubricMarks = rubricMarks;
      activityEntry.totalRubricMarks = validation.totalRubricMarks;
    }

    // Recalculate total marks
    doc.totalMarks =
      doc.attendanceMarks +
      doc.activities.reduce((sum, a) => sum + a.totalRubricMarks, 0);

    await doc.save();
    res.json(doc);

  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ error: err.message });
  }
};

/* ------------------------- DELETE MARKS ------------------------- */
export const deleteMarks = async (req, res) => {
  try {
    const { studentSubjectMarksId, activityId } = req.params;

    const doc = await StudentSubjectMarks.findById(studentSubjectMarksId);
    if (!doc) return res.status(404).json({ error: "Document not found" });

    doc.activities = doc.activities.filter(a => a.activityId.toString() !== activityId);

    // Recalculate totalMarks
    doc.totalMarks =
      doc.attendanceMarks +
      doc.activities.reduce((sum, a) => sum + a.totalRubricMarks, 0);

    await doc.save();
    res.json({ message: "Activity marks deleted", doc });

  } catch (err) {
    console.error("Delete marks error:", err);
    res.status(500).json({ error: err.message });
  }
};

/* ------------------------- GET MARKS BY ACTIVITY ------------------------- */
export const getMarksByActivity = async (req, res) => {
  try {
    const { activityId } = req.params;

    const docs = await StudentSubjectMarks.find({
      "activities.activityId": activityId
    })
      .populate("studentId")
      .populate("subjectId")
      .lean();

    res.json(docs);

  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ error: err.message });
  }
};

/* ------------------------- GET MARKS BY STUDENT ------------------------- */
export const getMarksByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;

    const doc = await StudentSubjectMarks.find({ studentId })
      .populate("subjectId")
      .populate("activities.activityId")
      .lean();

    res.json(doc);

  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ error: err.message });
  }
};

/* ------------------------- GET CLASS + SUBJECT MARKS ------------------------- */
export const getMarksByClassSubject = async (req, res) => {
  try {
    const { classId, subjectId } = req.params;

    const docs = await StudentSubjectMarks.find({ classId, subjectId })
      .populate("studentId")
      .lean();

    res.json({ success: true, marks: docs });

  } catch (err) {
    console.error("Class subject fetch error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const getAllMarks = async (req, res) => {
  try {
    const marks = await StudentSubjectMarks.find()
      .populate("studentId")
      .populate("subjectId")
      .populate("classId");

    res.json({ success: true, marks });
  } catch (err) {
    console.error("Get all marks error:", err);
    res.status(500).json({ success: false, message: "Unable to fetch marks" });
  }
};
