import mongoose from 'mongoose';

const { Schema } = mongoose;

const subjectSchema = new Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
    coordinator: {
    type: Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
}, { timestamps: true });

const Subject = mongoose.model('Subject', subjectSchema);
export default Subject;
