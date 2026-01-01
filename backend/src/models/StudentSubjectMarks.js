import mongoose from "mongoose";
const { Schema } = mongoose;

const activityMarksSchema = new Schema({
  activityId: { type: Schema.Types.ObjectId, ref: "Activity", required: true },
  rubricMarks: [
    {
      criteriaId: { type: Schema.Types.ObjectId, ref: "RubricCriteria" },
      marks: { type: Number, default: 0 }
    }
  ],
  totalRubricMarks: { type: Number, default: 0 }, // sum of rubricMarks
  attendance: { type: String, enum: ['Present', 'Absent'], default: 'Present' } // Attendance status
}, { _id: false }); // keep activity subdocs without their own generated _id if you prefer

const studentSubjectMarksSchema = new Schema({
  studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
  subjectId: { type: Schema.Types.ObjectId, ref: "Subject", required: true },
  classId: { type: Schema.Types.ObjectId, ref: "Class", required: false }, // optional convenience
  activities: [activityMarksSchema], // array of activity entries
  totalMarks: { type: Number, default: 0 } // sum of totalRubricMarks
}, { timestamps: true });

// unique per student + subject
studentSubjectMarksSchema.index({ studentId: 1, subjectId: 1 }, { unique: true });

export default mongoose.model("StudentSubjectMarks", studentSubjectMarksSchema);
