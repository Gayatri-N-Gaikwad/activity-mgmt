import mongoose from 'mongoose';

const { Schema } = mongoose;

const assignmentSchema = new Schema({
  facultyId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
  classId:   { type: Schema.Types.ObjectId, ref: 'Class', required: true }
}, { timestamps: true });

assignmentSchema.index({ facultyId:1, subjectId:1, classId:1 }, { unique: true });

const TeachingAssignment = mongoose.model('TeachingAssignment', assignmentSchema);
export default TeachingAssignment;
