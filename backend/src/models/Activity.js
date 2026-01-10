import mongoose from "mongoose";

const { Schema } = mongoose;

const activitySchema = new Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  // scheduleDate is required for this application
  scheduleDate: { type: Date, required: true },
  status: { type: String, enum: ['Scheduled','Conducted','Marks_Updated'], default: 'Scheduled' },
  coordinatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  assignmentId: { type: Schema.Types.ObjectId, ref: 'TeachingAssignment', required: false },
  modelAnswerFiles: [{ type: String }], // Array of file paths/URLs for model answers
  conductedConfirmation: {
    confirmedAt: { type: Date },
    confirmedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String }
  }
}, { timestamps: true });

const Activity = mongoose.model("Activity", activitySchema);

export default Activity;   // <-- IMPORTANT
