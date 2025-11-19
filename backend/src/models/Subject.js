import mongoose from 'mongoose';

const { Schema } = mongoose;

const subjectSchema = new Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
}, { timestamps: true });

const Subject = mongoose.model('Subject', subjectSchema);
export default Subject;
