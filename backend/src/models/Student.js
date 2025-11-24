import mongoose from "mongoose";

const { Schema } = mongoose;

const studentSchema = new Schema({
  rollNumber: { type: String, required: true },
  name: { type: String, required: true },
  classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true }
}, { timestamps: true });

studentSchema.index({ rollNumber: 1, classId: 1 }, { unique: true });

const Student = mongoose.model('Student', studentSchema);

export default Student;
