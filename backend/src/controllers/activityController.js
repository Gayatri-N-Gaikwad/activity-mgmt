import mongoose from "mongoose";
import path from "path";
import Activity from "../models/Activity.js";
import Class from "../models/Class.js";
import * as RubricCriteriaMod from "../models/RubricCriteria.js";
import * as StudentActivityMarksMod from "../models/StudentActivityMarks.js";
import { scheduleActivityReminder } from "../utils/scheduler.js";
import TeachingAssignment from "../models/TeachingAssignment.js";
import Student from "../models/Student.js";
import StudentSubjectMarks from "../models/StudentSubjectMarks.js";
import AcademicYear from "../models/AcademicYear.js";

// Handle CommonJS exports from model files (they use module.exports)
const RubricCriteria = RubricCriteriaMod.default || RubricCriteriaMod;
const StudentActivityMarks =
  StudentActivityMarksMod.default || StudentActivityMarksMod;

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

    // ---------------- Academic Year validation ----------------
    const academicYear = await AcademicYear.findOne({
      isActive: true,
    }).select("semesterStartDate semesterEndDate"); 

    if (academicYear?.semesterStartDate && academicYear?.semesterEndDate) {
      const onlyDate = (d) => {
        const date = new Date(d);
        date.setUTCHours(0, 0, 0, 0);
        return date;
      };

      const start = onlyDate(academicYear.semesterStartDate); 
      const end = onlyDate(academicYear.semesterEndDate);    
      const scheduled = onlyDate(parsedDate);                 
      
      if (scheduled < start || scheduled > end) {
        return res.status(400).json({
          error: `Activity schedule date must be between ${start.toDateString()} and ${end.toDateString()}`,
        });
      }
    }

    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ error: "Invalid scheduleDate format" });
    }

    const now = new Date();

    if (parsedDate <= now) {
      return res.status(400).json({
        error: "Activity cannot be scheduled in the past",
      });
    }

    if (!assignmentId) {
      return res.status(400).json({ error: "assignmentId is required" });
    }

    /*---------------- ASSIGNMENT VALIDATION ----------------*/
    const assignment = await TeachingAssignment.findById(assignmentId);
    if (!assignment) {
      return res.status(400).json({
        error:
          "Invalid assignmentId. Faculty does not teach this subject in this class.",
      });
    }

    // No cap on activities per assignment; simply validate provided marks
    const numericMarks = Number(marks);
    if (!Number.isFinite(numericMarks) || numericMarks <= 0) {
      return res.status(400).json({ error: "Marks must be a positive number" });
    }

    const rubricCriteria = [{ name: name || "Activity", marks: numericMarks }];

    // Create activity
    const activity = await Activity.create({
      name,
      description,
      scheduleDate: parsedDate,
      coordinatorId: userId,
      assignmentId,
    });

    // Save rubric
    await RubricCriteria.create({
      activityId: activity._id,
      name: rubricCriteria[0].name,
      maxMarks: rubricCriteria[0].marks,
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
        _id: activity._id,
      });
    }
    if (d1 > Date.now()) {
      scheduleActivityReminder({
        assignedToEmail: userEmail,
        title: name,
        deadline: d1,
        _id: activity._id,
      });
    }

    res.json({
      message: "Activity created successfully",
      activity,
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
    const activitiesWithRubric = await Promise.all(
      activities.map(async (act) => {
        const rubric = await RubricCriteria.find({
          activityId: act._id,
        }).select("name maxMarks");
        return { ...act.toObject(), rubric };
      })
    );
    res.json({ activities: activitiesWithRubric });
  } catch (error) {
    console.error("🔥 getAllActivities ERROR:", error);
    res.status(500).json({ error: "Server error" });
  }
};

/*---------------- GET ACTIVITY BY ID ----------------*/
export const getActivityById = async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id)
      .populate("conductedConfirmation.confirmedBy", "name email")
      .populate("coordinatorId", "name email")
      .populate({
        path: "assignmentId",
        populate: [
          { path: "facultyId", select: "name email" },
          { path: "subjectId", select: "name code" },
        ],
      });
    if (!activity) return res.status(404).json({ error: "Activity not found" });
    const rubric = await RubricCriteria.find({
      activityId: req.params.id,
    }).select("name maxMarks");
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
    const body = req.body || {};
    const {
      name,
      description,
      status,
      scheduleDate,
      statusChangeReason,
      rubric,
      marks,
    } = body;

    // fetch existing activity
    const activity = await Activity.findById(req.params.id);
    if (!activity) return res.status(404).json({ error: "Activity not found" });

    // ---------------- Status validation ----------------
    if (status !== undefined && status !== activity.status) {
      const statusFlow = {
        Scheduled: ["Conducted"],
        Conducted: ["Marks_Updated"],
        Marks_Updated: [],
      };
      const allowedTargets = statusFlow[activity.status] || [];
      if (!allowedTargets.includes(status)) {
        return res.status(400).json({
          error: `Cannot change status from ${activity.status} to ${status}`,
        });
      }

      if (status === "Conducted") {
        if (!activity.scheduleDate) {
          return res
            .status(400)
            .json({
              error: "Cannot mark as Conducted: activity has no scheduled date",
            });
        }
        const sched = new Date(activity.scheduleDate).getTime();
        if (isNaN(sched) || sched > Date.now()) {
          return res
            .status(400)
            .json({
              error: "Cannot mark as Conducted before scheduled date/time",
            });
        }
      }

      if (status === "Marks_Updated") {
        const marksExist = await StudentSubjectMarks.exists({
          "activities.activityId": activity._id,
        });
        if (!marksExist) {
          return res.status(400).json({
            error:
              "Add marks for at least one student before marking as Marks Updated",
          });
        }
      }
      if (statusChangeReason) {
        console.info(
          `Status change reason for activity ${activity._id}:`,
          statusChangeReason
        );
      }
    }

    // ---------------- Schedule validation ----------------
    if (scheduleDate !== undefined) {
      if (activity.status === "Conducted") {
        return res
          .status(400)
          .json({
            error: "Cannot change schedule: activity already Conducted",
          });
      }
    }

    // ---------------- Prepare fields to update ----------------
    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (description !== undefined) updateFields.description = description;
    if (status !== undefined) {
      updateFields.status = status;

      // If status is being changed to 'Conducted', also update modelAnswerFiles and conductedConfirmation
      if (status === "Conducted") {
        if (!req.files || req.files.length === 0) {
          return res
            .status(400)
            .json({
              error:
                "At least one model answer PDF must be uploaded when marking activity as conducted",
            });
        }

        const nonPdf = req.files.some(
          (f) =>
            f.mimetype !== "application/pdf" &&
            path.extname(f.originalname).toLowerCase() !== ".pdf"
        );
        if (nonPdf) {
          return res
            .status(400)
            .json({ error: "Only PDF files are allowed for model answers" });
        }

        const filePaths = req.files.map((file) => `/uploads/${file.filename}`);
        updateFields.modelAnswerFiles = filePaths;

        updateFields.conductedConfirmation = {
          confirmedAt: new Date(),
          confirmedBy: user._id || user.id,
          notes: statusChangeReason || "",
        };
      }
    }
    if (scheduleDate !== undefined) updateFields.scheduleDate = scheduleDate;

    // ---------------- Rubric update ----------------
    if (rubric !== undefined) {
      // check if marks exist for this activity
      const marksExist = await StudentActivityMarks.exists({
        activityId: activity._id,
      });

      if (marksExist) {
        console.info(
          `Activity ${activity._id} has existing marks; skipping rubric update`
        );
      } else if (Array.isArray(rubric) && rubric.length > 0) {
        await RubricCriteria.deleteMany({ activityId: activity._id });
        const criteriaDocs = rubric.map((r) => ({
          activityId: activity._id,
          name: r.name || "Criteria",
          maxMarks: Number(r.marks),
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
        return res
          .status(400)
          .json({ error: "Marks must be greater than zero" });
      }

      const marksExist = await StudentActivityMarks.exists({
        activityId: activity._id,
      });
      if (marksExist) {
        return res
          .status(400)
          .json({
            error: "Cannot change marks after students have been graded",
          });
      }

      await RubricCriteria.findOneAndUpdate(
        { activityId: activity._id },
        { name: name || activity.name || "Activity", maxMarks: numericMarks },
        { upsert: true, new: true }
      );
    }

    // ---------------- Update activity ----------------
    const updatedActivity = await Activity.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true }
    );

    // ---------------- Reschedule reminders ----------------
    if (scheduleDate) {
      const userEmail = user?.email || null;
      const parsed = new Date(scheduleDate);
      if (!isNaN(parsed.getTime())) {
        const MS_DAY = 24 * 60 * 60 * 1000;
        const d3 = new Date(parsed.getTime() - 3 * MS_DAY);
        const d1 = new Date(parsed.getTime() - 1 * MS_DAY);
        if (d3.getTime() > Date.now())
          scheduleActivityReminder({
            assignedToEmail: userEmail,
            title: updatedActivity.name,
            deadline: d3,
            _id: updatedActivity._id,
          });
        if (d1.getTime() > Date.now())
          scheduleActivityReminder({
            assignedToEmail: userEmail,
            title: updatedActivity.name,
            deadline: d1,
            _id: updatedActivity._id,
          });
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
    if (!activity) return res.status(404).json({ error: "Activity not found" });

    // Do not allow scheduling if activity already conducted or marks updated
    if (
      activity.status === "Conducted" ||
      activity.status === "Marks_Updated"
    ) {
      return res
        .status(400)
        .json({
          error: "Cannot schedule: activity already conducted or marks updated",
        });
    }

    const updated = await Activity.findByIdAndUpdate(
      req.params.id,
      { scheduleDate: scheduledDate },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Activity not found" });
    }

    // schedule reminders at fixed offsets (3 days and 1 day before)
    if (scheduledDate) {
      const parsed = new Date(scheduledDate);
      const MS_DAY = 24 * 60 * 60 * 1000;
      const d3 = new Date(parsed.getTime() - 3 * MS_DAY);
      const d1 = new Date(parsed.getTime() - 1 * MS_DAY);
      if (d3.getTime() > Date.now())
        scheduleActivityReminder({
          assignedToEmail: userEmail,
          title: updated.name,
          deadline: d3,
          _id: updated._id,
        });
      if (d1.getTime() > Date.now())
        scheduleActivityReminder({
          assignedToEmail: userEmail,
          title: updated.name,
          deadline: d1,
          _id: updated._id,
        });
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
      assignmentId,
    });

    const totalRubric = activities.reduce(
      (sum, a) => sum + (a.TotalRubricMarks || 0),
      0
    );
    const totalAttendance = activities.reduce(
      (sum, a) => sum + (a.AttendanceMarks || 0),
      0
    );

    const total = totalRubric + totalAttendance; // out of 20

    res.json({
      totalRubric,
      totalAttendance,
      total,
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

    const classDoc = await Class.findById(classId);
    if (!classDoc) return res.status(404).json({ error: "Class not found" });

    // Find the assignment for this class and subject
    const assignment = await TeachingAssignment.findOne({
      year: classDoc.year,
      division: classDoc.division,
      subjectId
    });
    if (!assignment)
      return res.status(404).json({ error: "Assignment not found" });

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

    const classDoc = await Class.findById(classId);
    if (!classDoc) {
      return res.json({ students: [] });
    }

    const students = await Student.find({ year: classDoc.year, division: classDoc.division })
      .select("name rollNumber year division _id")
      .lean();

    res.json({ students: students || [] });
  } catch (err) {
    console.error("Error fetching students by class:", err);
    res
      .status(500)
      .json({ error: "Server error fetching students", details: err.message });
  }
};


