import Activity from "../models/Activity.js";
import * as RubricCriteriaMod from "../models/RubricCriteria.js";
import * as StudentActivityMarksMod from "../models/StudentActivityMarks.js";
import { scheduleActivityReminder } from "../utils/scheduler.js";

// Handle CommonJS exports from model files (they use module.exports)
const RubricCriteria = RubricCriteriaMod.default || RubricCriteriaMod;
const StudentActivityMarks = StudentActivityMarksMod.default || StudentActivityMarksMod;

/*---------------- CREATE ACTIVITY ----------------*/
export const createActivity = async (req, res) => {
  try {
    const user = req.user || {};
    // support tokens that use `id` or `_id`
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
    // Find existing activities for this assignmentId
    const existingActivities = await Activity.find({ assignmentId });
    if (existingActivities.length >= 2) {
      return res.status(400).json({ error: "Only two activities allowed per class/subject" });
    }
    let rubricCriteria = [];
    if (existingActivities.length === 0) {
      // First activity: use provided marks
      const m = Number(marks);
      if (isNaN(m) || m <= 0 || m > 15) {
        return res.status(400).json({ error: "Marks must be between 1 and 15" });
      }
      rubricCriteria = [{ name: name || "Activity", marks: m }];
    } else if (existingActivities.length === 1) {
      // Second activity: auto-calculate marks
      const prevRubric = await RubricCriteria.findOne({ activityId: existingActivities[0]._id });
      const prevMarks = prevRubric ? Number(prevRubric.maxMarks) : 0;
      const m = 15 - prevMarks;
      if (m <= 0) {
        return res.status(400).json({ error: "Invalid marks distribution. Previous activity used all 15 marks." });
      }
      rubricCriteria = [{ name: name || "Activity", marks: m }];
    }
    // Create activity
    const toCreate = {
      name,
      description,
      scheduleDate: parsedDate,
      coordinatorId: userId,
      assignmentId,
    };
    const activity = await Activity.create(toCreate);
    // Persist rubric criteria
    await RubricCriteria.create({ activityId: activity._id, name: rubricCriteria[0].name, maxMarks: rubricCriteria[0].marks });

    // schedule reminders at fixed offsets: 3 days and 1 day before the activity
    const scheduleReminders = (baseDate, title, email, id) => {
      const MS_DAY = 24 * 60 * 60 * 1000;
      const d3 = new Date(baseDate.getTime() - 3 * MS_DAY);
      const d1 = new Date(baseDate.getTime() - 1 * MS_DAY);

      // only schedule if these deadlines are still in the future
      if (d3.getTime() > Date.now()) {
        scheduleActivityReminder({ assignedToEmail: email, title, deadline: d3, _id: id });
      }
      if (d1.getTime() > Date.now()) {
        scheduleActivityReminder({ assignedToEmail: email, title, deadline: d1, _id: id });
      }
    };

    scheduleReminders(parsedDate, name, userEmail, activity._id);

    res.json({ message: "Activity created successfully", activity });
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

/*---------------- UPDATE ACTIVITY ----------------*/
export const updateActivity = async (req, res) => {
  try {
    const user = req.user;
    const { name, description, status, assignmentId, scheduleDate, statusChangeReason, rubric } = req.body;

    // fetch existing activity to validate status transitions
    const activity = await Activity.findById(req.params.id);
    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    // validate requested status transition to reduce accidental changes
    if (status !== undefined && status !== activity.status) {
      // Scheduled -> Conducted: only allowed if scheduled date is in the past (or now)
      if (status === 'Conducted') {
        // If marks already updated, do not allow reverting to Conducted
        if (activity.status === 'Marks_Updated') {
          return res.status(400).json({ error: 'Cannot mark as Conducted: marks already updated' });
        }

        if (!activity.scheduleDate) {
          return res.status(400).json({ error: 'Cannot mark as Conducted: activity has no scheduled date' });
        }
        const sched = new Date(activity.scheduleDate).getTime();
        if (isNaN(sched) || sched > Date.now()) {
          return res.status(400).json({ error: 'Cannot mark as Conducted before scheduled date/time' });
        }
      }

      // Any -> Marks_Updated: only allowed when current status is Conducted
      if (status === 'Marks_Updated') {
        if (activity.status !== 'Conducted') {
          return res.status(400).json({ error: 'Can update marks only after the activity has been Conducted' });
        }
      }

      // optional: log reason for audit
      if (statusChangeReason) {
        console.info(`Status change reason for activity ${activity._id}:`, statusChangeReason);
      }
    }

    // If scheduleDate update requested, disallow if activity already Conducted or Marks_Updated
    if (scheduleDate !== undefined) {
      if (activity.status === 'Conducted' || activity.status === 'Marks_Updated') {
        return res.status(400).json({ error: 'Cannot change schedule: activity already Conducted or Marks Updated' });
      }
    }

    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (description !== undefined) updateFields.description = description;
    if (status !== undefined) updateFields.status = status;
    if (scheduleDate !== undefined) updateFields.scheduleDate = scheduleDate;

    // handle rubric update: validate and replace existing rubric criteria
    if (rubric !== undefined) {
      if (!Array.isArray(rubric) || rubric.length === 0) {
        return res.status(400).json({ error: 'Rubric must be a non-empty array' });
      }
      const total = rubric.reduce((s, r) => s + Number(r.marks || 0), 0);
      if (total !== 15) {
        return res.status(400).json({ error: 'Rubric marks must sum to 15' });
      }
      // replace existing rubric criteria for this activity
      await RubricCriteria.deleteMany({ activityId: activity._id });
      const criteriaDocs = rubric.map(r => ({ activityId: activity._id, name: r.name || 'Criteria', maxMarks: Number(r.marks) }));
      await RubricCriteria.insertMany(criteriaDocs);
    }

    // don't overwrite coordinatorId here; allow partial updates
    const updatedActivity = await Activity.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true }
    );

    // if scheduleDate was updated, reschedule reminders at fixed offsets
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
    await Activity.findByIdAndDelete(activityId);
    // remove rubric criteria and any student marks for this activity
    await RubricCriteria.deleteMany({ activityId });
    await StudentActivityMarks.deleteMany({ activityId });
    res.json({ message: "Activity deleted successfully" });
  } catch (error) {
    console.error("🔥 deleteActivity ERROR:", error);
    res.status(500).json({ error: "Server error" });
  }
};
