import StudentActivityMarks from "../models/StudentActivityMarks.js";
import Activity from "../models/Activity.js";
import TeachingAssignment from "../models/TeachingAssignment.js";

/* Add Marks */
export const addMarks = async (req, res) => {
  try {
    const { studentId, activityId, attendanceMarks, rubricMarks } = req.body;

    const activity = await Activity.findById(activityId);
    if (!activity) return res.status(404).json({ error: "Activity not found" });
    if (activity.status !== "Conducted") {
      return res.status(400).json({ error: "Cannot add marks: activity not conducted yet" });
    }

    const existing = await StudentActivityMarks.findOne({ studentId, activityId });
    if (existing) return res.status(400).json({ error: "Marks already exist for this student/activity" });

    const totalRubricMarks = rubricMarks.reduce((sum, item) => sum + item.marks, 0);
    const totalMarks = totalRubricMarks + (attendanceMarks || 0);

    const marksEntry = new StudentActivityMarks({
      studentId,
      activityId,
      attendanceMarks: attendanceMarks || 0,
      rubricMarks,
      totalRubricMarks,
      totalMarks
    });

    await marksEntry.save();
    res.status(201).json(marksEntry);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

/* Get All Marks */
export const getAllMarks = async (req, res) => {
  try {
    const marks = await StudentActivityMarks.find()
      .populate("studentId", "name rollNumber")
      .populate("activityId", "activityName scheduleDate")
      .populate("rubricMarks.criteriaId", "criteriaName maxMarks");

    res.json(marks);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

/* Get Marks by Student */
export const getMarksByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const marks = await StudentActivityMarks.find({ studentId })
      .populate("activityId", "activityName scheduleDate")
      .populate("rubricMarks.criteriaId", "criteriaName maxMarks");

    res.json(marks);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

/* Get Marks by Activity */
export const getMarksByActivityId = async (req, res) => {
  try {
    const { activityId } = req.params;
    const marks = await StudentActivityMarks.find({ activityId })
      .populate("studentId", "name rollNumber")
      .populate("rubricMarks.criteriaId", "criteriaName maxMarks");

    res.json({ marks: marks || [] });
  } catch (err) {
    console.error("Error fetching marks:", err);
    res.status(500).json({ error: "Server error fetching marks" });
  }
};

/* Update Marks */
export const updateMarks = async (req, res) => {
  try {
    const { id } = req.params;
    const { attendanceMarks, rubricMarks } = req.body;

    const marksEntry = await StudentActivityMarks.findById(id);
    if (!marksEntry) return res.status(404).json({ error: "Marks entry not found" });

    const activity = await Activity.findById(marksEntry.activityId);
    if (!activity) return res.status(404).json({ error: "Activity not found" });
    if (!["Conducted", "Marks_Updated"].includes(activity.status)) {
      return res.status(400).json({ error: "Cannot update marks: activity not conducted yet" });
    }

    if (attendanceMarks !== undefined) marksEntry.attendanceMarks = attendanceMarks;
    if (rubricMarks !== undefined) marksEntry.rubricMarks = rubricMarks;

    marksEntry.totalRubricMarks = marksEntry.rubricMarks.reduce((sum, item) => sum + item.marks, 0);
    marksEntry.totalMarks = marksEntry.attendanceMarks + marksEntry.totalRubricMarks;

    await marksEntry.save();
    res.json(marksEntry);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

/* Delete Marks */
export const deleteMarks = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await StudentActivityMarks.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: "Marks entry not found" });

    res.json({ message: "Marks entry deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

/* Check if Marks Exist */
export const checkMarksExist = async (req, res) => {
  try {
    const { activityId } = req.params;
    const exists = await StudentActivityMarks.exists({ activityId });
    res.json({ exists: !!exists });
  } catch (err) {
    console.error('Check marks exist error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/* Batch Get Marks */
export const getMarksBatch = async (req, res) => {
  try {
    const { activityIds, studentIds } = req.query;
    if (!activityIds || !studentIds) {
      return res.status(400).json({ error: "activityIds and studentIds are required" });
    }

    const activityArray = activityIds.split(",");
    const studentArray = studentIds.split(",");

    const marks = await StudentActivityMarks.find({
      activityId: { $in: activityArray },
      studentId: { $in: studentArray },
    });

    res.json({ marks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error fetching marks" });
  }
};

/* Get Marks by Class & Subject using TeachingAssignment */
export const getMarksByClassSubject = async (req, res) => {
  try {
    const { classId, subjectId } = req.params;

    // 1️) Find teaching assignment for this class + subject
    const assignment = await TeachingAssignment.findOne({ classId, subjectId });
    if (!assignment) return res.json({}); // no assignment → empty

    // 2️) Find all activities under this assignment
    const activities = await Activity.find({ assignmentId: assignment._id }).lean();
    if (!activities.length) return res.json({}); // no activities → empty

    const activityIds = activities.map(a => a._id);

    // 3️) Get marks for all activities
    const marks = await StudentActivityMarks.find({ activityId: { $in: activityIds } }).lean();

    // 4️) Map marks by student
    const marksByStudent = {};
    marks.forEach(m => {
      if (!marksByStudent[m.studentId]) {
        marksByStudent[m.studentId] = {
          activityMarks: [],
          attendance: 0,
          studentMarksIds: [],
        };
      }
      marksByStudent[m.studentId].activityMarks.push(m.totalMarks);
      marksByStudent[m.studentId].attendance = m.attendanceMarks || 0;
      marksByStudent[m.studentId].studentMarksIds.push(m._id);
    });

    res.json(marksByStudent);

  } catch (err) {
    console.error("Error fetching marks by class/subject:", err);
    res.status(500).json({ error: "Server error fetching marks" });
  }
};