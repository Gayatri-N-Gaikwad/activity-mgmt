import mongoose from 'mongoose';

const { Schema } = mongoose;

const subjectSchema = new Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  year: { type: String, required: true },
  coordinator: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
}, { timestamps: true });

const Subject = mongoose.model('Subject', subjectSchema);
export default Subject;
