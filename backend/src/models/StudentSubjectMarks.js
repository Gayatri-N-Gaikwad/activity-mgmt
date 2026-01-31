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

  attendance: {
    type: String,
    enum: ['Present', 'Absent'],
    default: 'Present'
  }
}, { _id: false });

const studentSubjectMarksSchema = new Schema({
  studentId: {
    type: Schema.Types.ObjectId,
    ref: "Student",
    required: true
  },

  subjectId: {
    type: Schema.Types.ObjectId,
    ref: "Subject",
    required: true
  },

  year: {
    type: String,
    required: true,
    enum: ['SY', 'TE', 'BE'] 
  },

  division: {
    type: String,
    required: true
  }, 

  activities: [activityMarksSchema],

  totalMarks: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

/* 
   unique per student + subject + year + division
*/
studentSubjectMarksSchema.index(
  { studentId: 1, subjectId: 1, year: 1, division: 1 },
  { unique: true }
);

export default mongoose.model("StudentSubjectMarks", studentSubjectMarksSchema);
