import Activity from "../models/Activity.js";
import * as RubricCriteriaMod from "../models/RubricCriteria.js";
import * as StudentActivityMarksMod from "../models/StudentActivityMarks.js";
import { scheduleActivityReminder } from "../utils/scheduler.js";
import TeachingAssignment from "../models/TeachingAssignment.js";
import Student from "../models/Student.js";
import StudentSubjectMarks from "../models/StudentSubjectMarks.js";

// Handle CommonJS exports from model files (they use module.exports)
const RubricCriteria = RubricCriteriaMod.default || RubricCriteriaMod;
const StudentActivityMarks = StudentActivityMarksMod.default || StudentActivityMarksMod;

/*---------------- CREATE ACTIVITY ----------------*/
export const createActivity = async (req, res) => {
  try {
    const user = req.user || {};
    const userId = user._id || user.id || user.userId;
    const userEmail = user.email || user.mail || null;

    const { name, description, scheduleDate, assignmentId, marks } = req.body;

    if (!scheduleDate) {
      return res.status(400).json({ error: "scheduleDate is required" });
    }

    const parsedDate = new Date(scheduleDate);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ error: "Invalid scheduleDate format" });
    }

    if (!assignmentId) {
      return res.status(400).json({ error: "assignmentId is required" });
    }

    /*---------------- ASSIGNMENT VALIDATION ----------------*/
    const assignment = await TeachingAssignment.findById(assignmentId);
    if (!assignment) {
      return res.status(400).json({
        error: "Invalid assignmentId. Faculty does not teach this subject in this class."
      });
    }

    // Find existing activities for this assignment
    const existingActivities = await Activity.find({ assignmentId });

    if (existingActivities.length >= 2) {
      return res.status(400).json({
        error: "Only two activities allowed per class/subject"
      });
    }

    let rubricCriteria = [];

    if (existingActivities.length === 0) {
      // First activity → user-provided marks
      const m = Number(marks);
      if (isNaN(m) || m <= 0 || m > 15) {
        return res.status(400).json({
          error: "Marks must be between 1 and 15"
        });
      }
      rubricCriteria = [{ name: name || "Activity", marks: m }];

    } else if (existingActivities.length === 1) {
      // Second activity → auto calculate
      const prevRubric = await RubricCriteria.findOne({ activityId: existingActivities[0]._id });
      const prevMarks = prevRubric ? Number(prevRubric.maxMarks) : 0;

      const m = 15 - prevMarks;
      if (m <= 0) {
        return res.status(400).json({
          error: "Invalid marks distribution. Previous activity used all 15 marks."
        });
      }

      rubricCriteria = [{ name: name || "Activity", marks: m }];
    }

    // Create activity
    const activity = await Activity.create({
      name,
      description,
      scheduleDate: parsedDate,
      coordinatorId: userId,
      assignmentId
    });

    // Save rubric
    await RubricCriteria.create({
      activityId: activity._id,
      name: rubricCriteria[0].name,
      maxMarks: rubricCriteria[0].marks
    });

    // Reminder scheduling
    const MS_DAY = 24 * 60 * 60 * 1000;
    const d3 = new Date(parsedDate.getTime() - 3 * MS_DAY);
    const d1 = new Date(parsedDate.getTime() - 1 * MS_DAY);

    if (d3 > Date.now()) {
      scheduleActivityReminder({
        assignedToEmail: userEmail,
        title: name,
        deadline: d3,
        _id: activity._id
      });
    }
    if (d1 > Date.now()) {
      scheduleActivityReminder({
        assignedToEmail: userEmail,
        title: name,
        deadline: d1,
        _id: activity._id
      });
    }

    res.json({
      message: "Activity created successfully",
      activity
    });

  } catch (error) {
    console.error("🔥 createActivity ERROR:", error);
    res.status(500).json({ error: "Server error" });
  }
};

/*---------------- GET ALL ACTIVITIES ----------------*/
export const getAllActivities = async (req, res) => {
  try {
    const activities = await Activity.find();
    // attach rubric criteria for each activity
    const activitiesWithRubric = await Promise.all(activities.map(async (act) => {
      const rubric = await RubricCriteria.find({ activityId: act._id }).select('name maxMarks');
      return { ...act.toObject(), rubric };
    }));
    res.json({ activities: activitiesWithRubric });
  } catch (error) {
    console.error("🔥 getAllActivities ERROR:", error);
    res.status(500).json({ error: "Server error" });
  }
};

/*---------------- GET ACTIVITY BY ID ----------------*/
export const getActivityById = async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);
    if (!activity) return res.status(404).json({ error: 'Activity not found' });
    const rubric = await RubricCriteria.find({ activityId: req.params.id }).select('name maxMarks');
    res.json({ activity, rubric });
  } catch (error) {
    console.error("🔥 getActivityById ERROR:", error);
    res.status(500).json({ error: "Server error" });
  }
};

/* ----------------- GET ACTIVITIES BY ASSIGNMENT ----------------- */
export const getActivitiesByAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const activities = await Activity.find({ assignmentId });
    res.json({ activities });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error fetching activities" });
  }
};

/* ----------------- UPDATE ACTIVITY ----------------- */
export const updateActivity = async (req, res) => {
  try {
    const user = req.user;
    const {
      name,
      description,
      status,
      scheduleDate,
      statusChangeReason,
      rubric,
      marks
    } = req.body;

    // fetch existing activity
    const activity = await Activity.findById(req.params.id);
    if (!activity) return res.status(404).json({ error: 'Activity not found' });

    // ---------------- Status validation ----------------
    if (status !== undefined && status !== activity.status) {
      if (status === 'Conducted') {
        if (!activity.scheduleDate) {
          return res.status(400).json({ error: 'Cannot mark as Conducted: activity has no scheduled date' });
        }
        const sched = new Date(activity.scheduleDate).getTime();
        if (isNaN(sched) || sched > Date.now()) {
          return res.status(400).json({ error: 'Cannot mark as Conducted before scheduled date/time' });
        }
      }
      if (statusChangeReason) {
        console.info(`Status change reason for activity ${activity._id}:`, statusChangeReason);
      }
    }

    // ---------------- Schedule validation ----------------
    if (scheduleDate !== undefined) {
      if (activity.status === 'Conducted') {
        return res.status(400).json({ error: 'Cannot change schedule: activity already Conducted' });
      }
    }

    // ---------------- Prepare fields to update ----------------
    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (description !== undefined) updateFields.description = description;
    if (status !== undefined) updateFields.status = status;
    if (scheduleDate !== undefined) updateFields.scheduleDate = scheduleDate;

    // ---------------- Rubric update ----------------
    if (rubric !== undefined) {
      // check if marks exist for this activity
      const marksExist = await StudentActivityMarks.exists({ activityId: activity._id });

      if (marksExist) {
        console.info(`Activity ${activity._id} has existing marks; skipping rubric update`);
      } else if (Array.isArray(rubric) && rubric.length > 0) {
        const total = rubric.reduce((s, r) => s + Number(r.marks || 0), 0);
        if (total !== 15) return res.status(400).json({ error: 'Rubric marks must sum to 15' });

        await RubricCriteria.deleteMany({ activityId: activity._id });
        const criteriaDocs = rubric.map(r => ({
          activityId: activity._id,
          name: r.name || 'Criteria',
          maxMarks: Number(r.marks)
        }));
        await RubricCriteria.insertMany(criteriaDocs);
      } else if (Array.isArray(rubric) && rubric.length === 0) {
        await RubricCriteria.deleteMany({ activityId: activity._id });
      }
    }

    // ---------------- Simple marks update (single rubric) ----------------
    if (marks !== undefined) {
      const numericMarks = Number(marks);
      if (Number.isNaN(numericMarks)) {
        return res.status(400).json({ error: "Marks must be a numeric value" });
      }

      if (numericMarks <= 0) {
        return res.status(400).json({ error: "Marks must be greater than zero" });
      }

      if (numericMarks >= 15) {
        return res.status(400).json({ error: "Keep at least 1 mark reserved for the second activity (max 14)" });
      }

      const marksExist = await StudentActivityMarks.exists({ activityId: activity._id });
      if (marksExist) {
        return res.status(400).json({ error: "Cannot change marks after students have been graded" });
      }

      const assignmentId = activity.assignmentId;
      if (!assignmentId) {
        return res.status(400).json({ error: "Activity is missing assignment linkage" });
      }

      const siblings = await Activity.find({ assignmentId });
      const other = siblings.find(a => a._id.toString() !== activity._id.toString());

      if (other) {
        const otherMarksExist = await StudentActivityMarks.exists({ activityId: other._id });
        if (otherMarksExist) {
          return res.status(400).json({ error: "Cannot rebalance marks: sibling activity already has student marks" });
        }

        const siblingMarks = 15 - numericMarks;
        if (siblingMarks <= 0) {
          return res.status(400).json({ error: "At least 1 mark must remain for the sibling activity" });
        }

        await RubricCriteria.findOneAndUpdate(
          { activityId: other._id },
          { name: other.name || "Activity", maxMarks: siblingMarks },
          { upsert: true, new: true }
        );
      }

      await RubricCriteria.findOneAndUpdate(
        { activityId: activity._id },
        { name: name || activity.name || "Activity", maxMarks: numericMarks },
        { upsert: true, new: true }
      );
    }

    // ---------------- Update activity ----------------
    const updatedActivity = await Activity.findByIdAndUpdate(req.params.id, updateFields, { new: true });

    // ---------------- Reschedule reminders ----------------
    if (scheduleDate) {
      const userEmail = user?.email || null;
      const parsed = new Date(scheduleDate);
      if (!isNaN(parsed.getTime())) {
        const MS_DAY = 24 * 60 * 60 * 1000;
        const d3 = new Date(parsed.getTime() - 3 * MS_DAY);
        const d1 = new Date(parsed.getTime() - 1 * MS_DAY);
        if (d3.getTime() > Date.now()) scheduleActivityReminder({ assignedToEmail: userEmail, title: updatedActivity.name, deadline: d3, _id: updatedActivity._id });
        if (d1.getTime() > Date.now()) scheduleActivityReminder({ assignedToEmail: userEmail, title: updatedActivity.name, deadline: d1, _id: updatedActivity._id });
      }
    }

    res.json({
      message: "Activity updated successfully",
      activity: updatedActivity,
    });

  } catch (error) {
    console.error("🔥 updateActivity ERROR:", error);
    res.status(500).json({ error: "Server error" });
  }
};

/*---------------- SCHEDULE ACTIVITY ----------------*/
export const scheduleActivity = async (req, res) => {
  try {
    const user = req.user || {};
    const userEmail = user.email || user.mail || null;
    const { scheduledDate } = req.body;

    const activity = await Activity.findById(req.params.id);
    if (!activity) return res.status(404).json({ error: 'Activity not found' });

    // Do not allow scheduling if activity already conducted or marks updated
    if (activity.status === 'Conducted' || activity.status === 'Marks_Updated') {
      return res.status(400).json({ error: 'Cannot schedule: activity already conducted or marks updated' });
    }

    const updated = await Activity.findByIdAndUpdate(
      req.params.id,
      { scheduleDate: scheduledDate },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    // schedule reminders at fixed offsets (3 days and 1 day before)
    if (scheduledDate) {
      const parsed = new Date(scheduledDate);
      const MS_DAY = 24 * 60 * 60 * 1000;
      const d3 = new Date(parsed.getTime() - 3 * MS_DAY);
      const d1 = new Date(parsed.getTime() - 1 * MS_DAY);
      if (d3.getTime() > Date.now()) scheduleActivityReminder({ assignedToEmail: userEmail, title: updated.name, deadline: d3, _id: updated._id });
      if (d1.getTime() > Date.now()) scheduleActivityReminder({ assignedToEmail: userEmail, title: updated.name, deadline: d1, _id: updated._id });
    }

    res.json({ message: "Activity scheduled", activity: updated });
  } catch (error) {
    console.error("🔥 scheduleActivity ERROR:", error);
    res.status(500).json({ error: "Server error" });
  }
};

/*---------------- DELETE ACTIVITY ----------------*/
export const deleteActivity = async (req, res) => {
  try {
    const activityId = req.params.id;

    // Delete activity
    await Activity.findByIdAndDelete(activityId);

    // Delete rubric entries
    await RubricCriteria.deleteMany({ activityId });

    // Delete student activity marks
    await StudentActivityMarks.deleteMany({ activityId });

    // Delete from studentsubjectmarks activities array
    await StudentSubjectMarks.updateMany(
      {},
      { $pull: { activities: { activityId } } }
    );

    res.json({ message: "Activity deleted successfully" });

  } catch (error) {
    console.error("🔥 deleteActivity ERROR:", error);
    res.status(500).json({ error: "Server error" });
  }
};


/* ----------------- GET TOTAL MARKS FOR AN ACTIVITY ----------------- */
export const getTotalMarksForActivity = async (req, res) => {
  try {
    const { studentId, assignmentId } = req.query;

    // fetch all activities for this assignment
    const activities = await StudentActivityMarks.find({
      studentId,
      assignmentId
    });

    const totalRubric = activities.reduce((sum, a) => sum + (a.TotalRubricMarks || 0), 0);
    const totalAttendance = activities.reduce((sum, a) => sum + (a.AttendanceMarks || 0), 0);

    const total = totalRubric + totalAttendance; // out of 20

    res.json({
      totalRubric,
      totalAttendance,
      total
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

// Get activities by class and subject
export const getActivitiesByClassSubject = async (req, res) => {
  try {
    const { classId, subjectId } = req.params;

    // Find the assignment for this class and subject
    const assignment = await TeachingAssignment.findOne({ classId, subjectId });
    if (!assignment) return res.status(404).json({ error: "Assignment not found" });

    // Fetch all activities under this assignment
    const activities = await Activity.find({ assignmentId: assignment._id });

    res.json({ activities });
  } catch (err) {
    console.error("Error fetching activities:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/* -----------------  GET all students in a class  ----------------- */
export const getStudentsByClass = async (req, res) => {
  try {
    const { classId } = req.params;

    const students = await Student.find({ classId }).select("name rollNumber classId");

    if (!students || students.length === 0) {
      return res.status(404).json({ error: "No students found for this class" });
    }

    res.json({ students });
  } catch (err) {
    console.error("Error fetching students by class:", err);
    res.status(500).json({ error: "Server error fetching students" });
  }
};
