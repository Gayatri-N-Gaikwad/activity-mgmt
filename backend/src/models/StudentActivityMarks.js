import mongoose from 'mongoose';

const { Schema } = mongoose;

const marksSchema = new Schema({
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  activityId: { type: Schema.Types.ObjectId, ref: 'Activity', required: true },
  attendanceMarks: { type: Number, default: 0 }, // out of 5
  rubricMarks: [{ criteriaId: { type: Schema.Types.ObjectId, ref: 'RubricCriteria' }, marks: Number }],
  totalRubricMarks: { type: Number, default: 0 }, // sum of rubric marks
  totalMarks: { type: Number, default: 0 } // totalRubricMarks + attendanceMarks
}, { timestamps: true });

marksSchema.index({ studentId: 1, activityId: 1 }, { unique: true });

const StudentActivityMarks = mongoose.model('StudentActivityMarks', marksSchema);

export default StudentActivityMarks;
