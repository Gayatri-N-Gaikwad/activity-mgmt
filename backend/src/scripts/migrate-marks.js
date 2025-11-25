import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import StudentActivityMarks from "../models/StudentActivityMarks.js";
import StudentSubjectMarks from "../models/StudentSubjectMarks.js";
import Activity from "../models/Activity.js";
import TeachingAssignment from "../models/TeachingAssignment.js";

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  try {
    console.log("Fetching all StudentActivityMarks...");
    const allMarks = await StudentActivityMarks.find({}).lean();

    // Map key: "studentId::subjectId"
    const grouped = new Map();

    for (const mark of allMarks) {
      const studentId = mark.studentId.toString();
      const activityId = mark.activityId.toString();

      // Find activity → assignment
      const activity = await Activity.findById(activityId).lean();
      if (!activity || !activity.assignmentId) {
        console.log("Skipping: activity without assignment", activityId);
        continue;
      }

      const assignment = await TeachingAssignment.findById(activity.assignmentId).lean();
      if (!assignment) {
        console.log("Skipping: activity with missing assignment", activityId);
        continue;
      }

      const subjectId = assignment.subjectId.toString();
      const classId = assignment.classId ? assignment.classId.toString() : null;

      const key = `${studentId}::${subjectId}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          studentId,
          subjectId,
          classId,
          attendanceMarks: mark.attendanceMarks || 0,
          activities: []
        });
      }

      const entry = grouped.get(key);

      // Store activity + rubric
      entry.activities.push({
  activityId: new mongoose.Types.ObjectId(activityId),
  rubricMarks: mark.rubricMarks || [],
  totalRubricMarks: mark.totalRubricMarks || 0
});


      // Attendance once → pick max or latest
      entry.attendanceMarks = mark.attendanceMarks || entry.attendanceMarks;
    }

    console.log("Writing consolidated documents...");

    let inserted = 0;

    for (const [key, doc] of grouped) {
      const totalRubric = doc.activities.reduce((s, a) => s + (a.totalRubricMarks || 0), 0);
      const totalMarks = totalRubric + (doc.attendanceMarks || 0);

      await StudentSubjectMarks.updateOne(
        { studentId: doc.studentId, subjectId: doc.subjectId },
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

    console.log("Migration complete. Documents inserted/updated:", inserted);

  } catch (error) {
    console.error("Migration error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

main();
