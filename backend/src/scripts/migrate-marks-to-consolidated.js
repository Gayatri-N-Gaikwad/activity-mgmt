// scripts/migrate-marks-to-consolidated.js
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import StudentActivityMarks from "../models/StudentActivityMarks.js";
import StudentSubjectMarks from "../models/StudentSubjectMarks.js";
import Activity from "../models/Activity.js";
import TeachingAssignment from "../models/TeachingAssignment.js";

async function main() {
  await mongoose.connect(process.env.MONGO_URI, {});

  try {
    console.log("Loading all StudentActivityMarks...");
    const allMarks = await StudentActivityMarks.find({});

    // Map: (studentId + subjectId) -> consolidated doc
    const consolidated = new Map();

    for (const mark of allMarks) {
      const studentId = mark.studentId.toString();
      const activityId = mark.activityId.toString();

      // Get activity
      const activity = await Activity.findById(activityId);
      if (!activity || !activity.assignmentId) {
        console.warn("Skipping activity without assignment:", activityId);
        continue;
      }

      // Fetch assignment
      const assignment = await TeachingAssignment.findById(activity.assignmentId);
      if (!assignment) {
        console.warn("Skipping activity with missing assignment:", activityId);
        continue;
      }

      const subjectId = assignment.subjectId.toString();
      const classId = assignment.classId ? assignment.classId.toString() : null;

      const key = `${studentId}::${subjectId}`;

      // create entry if not exists
      if (!consolidated.has(key)) {
        consolidated.set(key, {
          studentId: new mongoose.Types.ObjectId(studentId),
          subjectId: new mongoose.Types.ObjectId(subjectId),
          classId: classId ? new mongoose.Types.ObjectId(classId) : null,
          attendanceMarks: mark.attendanceMarks || 0,
          activities: []
        });
      }

      const entry = consolidated.get(key);

      // Insert activity
      entry.activities.push({
        activityId: new mongoose.Types.ObjectId(activityId),
        rubricMarks: (mark.rubricMarks || []).map(r => ({
          criteriaId: new mongoose.Types.ObjectId(r.criteriaId),
          marks: r.marks
        })),
        totalRubricMarks: mark.totalRubricMarks || 0
      });

      // Attendance logic – keep latest or highest
      entry.attendanceMarks = mark.attendanceMarks || entry.attendanceMarks;
    }

    console.log(`Groups formed: ${consolidated.size}`);
    console.log("Writing to StudentSubjectMarks...");

    let inserted = 0;

    for (const [key, doc] of consolidated.entries()) {

      // compute totalMarks
      const totalRubric = doc.activities.reduce(
        (sum, act) => sum + (act.totalRubricMarks || 0),
        0
      );
      const totalMarks = totalRubric + (doc.attendanceMarks || 0);

      // UPSERT (IMPORTANT: use ObjectId filters)
      await StudentSubjectMarks.updateOne(
        {
          studentId: doc.studentId,
          subjectId: doc.subjectId
        },
        {
          $set: {
            studentId: doc.studentId,
            subjectId: doc.subjectId,
            classId: doc.classId,
            attendanceMarks: doc.attendanceMarks,
            activities: doc.activities,
            totalMarks
          }
        },
        { upsert: true }
      );

      inserted++;
    }

    console.log("Migration COMPLETE. Documents inserted/updated:", inserted);

  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

main();
