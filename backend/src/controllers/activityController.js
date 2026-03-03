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
import ActivityMarkSubdivision from "../models/ActivityMarkSubdivision.js";
import { sendNotificationEmail, generateActivityNotificationTemplate, generateActivityUpdateTemplate, generateActivityDeleteTemplate } from "../services/emailService.js";
import User from "../models/User.js";


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

    const {
      name,
      description,
      scheduleDate,
      assignmentId,
      marks,
      markSubdivisions // 👈 NEW
    } = req.body;

    /* ---------------- BASIC VALIDATIONS ---------------- */

    if (!name || !description) {
      return res.status(400).json({ error: "Name and description are required" });
    }

    if (!scheduleDate) {
      return res.status(400).json({ error: "scheduleDate is required" });
    }

    const parsedDate = new Date(scheduleDate);

    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ error: "Invalid scheduleDate format" });
    }

    const now = new Date();
    if (parsedDate <= now) {
      return res.status(400).json({
        error: "Activity cannot be scheduled in the past",
      });
    }

    /* ---------------- Academic Year validation ---------------- */

    const academicYear = await AcademicYear.findOne({ isActive: true })
      .select("semesterStartDate semesterEndDate");

    if (academicYear?.semesterStartDate && academicYear?.semesterEndDate) {
      const normalize = (d) => {
        const date = new Date(d);
        date.setUTCHours(0, 0, 0, 0);
        return date;
      };

      const start = normalize(academicYear.semesterStartDate);
      const end = normalize(academicYear.semesterEndDate);
      const scheduled = normalize(parsedDate);

      if (scheduled < start || scheduled > end) {
        return res.status(400).json({
          error: `Activity schedule date must be between ${start.toDateString()} and ${end.toDateString()}`,
        });
      }
    }

    /* ---------------- Assignment validation ---------------- */

    if (!assignmentId) {
      return res.status(400).json({ error: "assignmentId is required" });
    }

    const assignment = await TeachingAssignment.findById(assignmentId);
    if (!assignment) {
      return res.status(400).json({
        error:
          "Invalid assignmentId. Faculty does not teach this subject in this class.",
      });
    }

    /* ---------------- Total Marks validation ---------------- */

    const totalMarks = Number(marks);
    if (!Number.isFinite(totalMarks) || totalMarks <= 0) {
      return res.status(400).json({ error: "Marks must be a positive number" });
    }

    /* ---------------- Mark Subdivision validation (NEW) ---------------- */

    let subdivisionsToSave = [];

    if (Array.isArray(markSubdivisions) && markSubdivisions.length > 0) {
      let sum = 0;

      for (const sub of markSubdivisions) {
        if (!sub.title || typeof sub.title !== "string") {
          return res.status(400).json({
            error: "Each mark subdivision must have a title",
          });
        }

        const subMarks = Number(sub.marks);
        if (!Number.isFinite(subMarks) || subMarks <= 0) {
          return res.status(400).json({
            error: "Subdivision marks must be a positive number",
          });
        }

        sum += subMarks;

        subdivisionsToSave.push({
          title: sub.title,
          maxMarks: subMarks,
        });
      }

      if (sum !== totalMarks) {
        return res.status(400).json({
          error: `Sum of subdivision marks (${sum}) must equal total marks (${totalMarks})`,
        });
      }
    }

    /* ---------------- Create Activity ---------------- */

    const activity = await Activity.create({
      name,
      description,
      scheduleDate: parsedDate,
      coordinatorId: userId,
      assignmentId,
    });

    /* ---------------- Save mark subdivisions (DISPLAY ONLY) ---------------- */

    if (subdivisionsToSave.length > 0) {
      const subdivisionDocs = subdivisionsToSave.map((s) => ({
        activityId: activity._id,
        title: s.title,
        maxMarks: s.maxMarks,
      }));

      await ActivityMarkSubdivision.insertMany(subdivisionDocs);
    }

    /* ---------------- Send creation notification email ---------------- */

    try {
      const assignmentWithDetails = await TeachingAssignment.findById(
        activity.assignmentId
      )
        .populate("subjectId")
        .lean();

      if (assignmentWithDetails) {
        const coordinator = await User.findById(activity.coordinatorId)
          .select("name")
          .lean();
        const className = `${assignmentWithDetails.year} - ${assignmentWithDetails.division}`;
        const subjectName =
          assignmentWithDetails.subjectId?.name || "Unknown Subject";
        const facultyName = coordinator?.name || "Unknown Faculty";

        const classDoc = await Class.findOne({
          year: assignmentWithDetails.year,
          division: assignmentWithDetails.division,
        })
          .select("google_group_email")
          .lean();

        if (classDoc?.google_group_email) {
          const markSubdivisionDocs = await ActivityMarkSubdivision.find({
            activityId: activity._id,
          }).lean();

          const { html, text } = generateActivityNotificationTemplate(
            activity,
            className,
            subjectName,
            facultyName,
            [],
            markSubdivisionDocs,
            totalMarks
          );

          await sendNotificationEmail(
            classDoc.google_group_email,
            `New Activity: ${activity.name}`,
            html,
            text
          );
        }
      }
    } catch (notificationError) {
      console.error("Error sending creation notification:", notificationError);
    }

    /* ---------------- Reminder scheduling ---------------- */

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

    /* ---------------- Final Response ---------------- */

    res.status(201).json({
      message: "Activity created successfully",
      activityId: activity._id,
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
        
        // Also fetch mark subdivisions if rubric is empty
        let finalRubric = rubric;
        if (rubric.length === 0) {
          const subdivisions = await ActivityMarkSubdivision.find({
            activityId: act._id,
          }).select("title maxMarks");
          
          // Convert subdivisions to rubric format
          finalRubric = subdivisions.map(sub => ({
            name: sub.title,
            maxMarks: sub.maxMarks
          }));
        }
        
        return { ...act.toObject(), rubric: finalRubric };
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
      // Check if activity is already conducted
      if (activity.status === "Conducted" || activity.status === "Marks_Updated") {
        return res.status(400).json({
          error: "Cannot edit marks after activity has been conducted or marked as updated",
        });
      }

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



    // Send update notification email
    try {
      const assignmentWithDetails = await TeachingAssignment.findById(
        activity.assignmentId
      )
        .populate("subjectId")
        .lean();

      if (assignmentWithDetails) {
        const coordinator = await User.findById(activity.coordinatorId)
          .select("name")
          .lean();
        const className = `${assignmentWithDetails.year} - ${assignmentWithDetails.division}`;
        const subjectName =
          assignmentWithDetails.subjectId?.name || "Unknown Subject";
        const facultyName = coordinator?.name || "Unknown Faculty";

        const classDoc = await Class.findOne({
          year: assignmentWithDetails.year,
          division: assignmentWithDetails.division,
        })
          .select("google_group_email")
          .lean();

        if (classDoc?.google_group_email) {
          const { html, text } = generateActivityUpdateTemplate(
            activity,
            className,
            subjectName,
            facultyName
          );

          await sendNotificationEmail(
            classDoc.google_group_email,
            `Activity Updated: ${activity.name}`,
            html,
            text
          );
          
        }
      }
    } catch (notificationError) {
      console.error("Error sending update notification:", notificationError);
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
/*---------------- DELETE ACTIVITY ----------------*/
export const deleteActivity = async (req, res) => {
  try {
    const activityId = req.params.id;

    // Fetch activity first
    const activity = await Activity.findById(activityId);
    if (!activity) {
      return res.status(404).json({ error: "Activity not found" });
    }

    //  Do NOT allow delete after Conducted
    if (activity.status === "Conducted" || activity.status === "Marks_Updated") {
      return res.status(400).json({
        error: "Cannot delete activity after it is conducted",
      });
    }

    //  Safe to delete (Scheduled only)
    await Activity.findByIdAndDelete(activityId);

    await RubricCriteria.deleteMany({ activityId });
    await StudentActivityMarks.deleteMany({ activityId });

    await StudentSubjectMarks.updateMany(
      {},
      { $pull: { activities: { activityId } } }
    );



    // Send delete notification email
    try {
      const assignmentWithDetails = await TeachingAssignment.findById(
        activity.assignmentId
      )
        .populate("subjectId")
        .lean();

      if (assignmentWithDetails) {
        const coordinator = await User.findById(activity.coordinatorId)
          .select("name")
          .lean();
        const className = `${assignmentWithDetails.year} - ${assignmentWithDetails.division}`;
        const subjectName =
          assignmentWithDetails.subjectId?.name || "Unknown Subject";
        const facultyName = coordinator?.name || "Unknown Faculty";

        const classDoc = await Class.findOne({
          year: assignmentWithDetails.year,
          division: assignmentWithDetails.division,
        })
          .select("google_group_email")
          .lean();

        if (classDoc?.google_group_email) {
          const { html, text } = generateActivityDeleteTemplate(
            activity.name,
            className,
            subjectName,
            facultyName
          );

          await sendNotificationEmail(
            classDoc.google_group_email,
            `Activity Deleted: ${activity.name}`,
            html,
            text
          );
          
        }
      }
    } catch (notificationError) {
      console.error("Error sending delete notification:", notificationError);
    }

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

// Get mark subdivisions of an activity

export const getMarkSubdivisions = async (req, res) => {
  try {
    const subdivisions = await ActivityMarkSubdivision.find({
      activityId: req.params.id,
    }).select("title maxMarks");

    res.json(subdivisions);
  } catch (error) {
    console.error("Error fetching mark subdivisions:", error);
    res.status(500).json({ message: "Server error" });
  }
};
