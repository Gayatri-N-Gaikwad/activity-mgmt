import mongoose from "mongoose";

const { Schema } = mongoose;

const activityMarkSubdivisionSchema = new Schema({
  activityId: {
    type: Schema.Types.ObjectId,
    ref: "Activity",
    required: true,
  },
  title: {
    type: String,
    required: true, // e.g. Attendance, Viva, Report
  },
  maxMarks: {
    type: Number,
    required: true,
    min: 0,
  },
}, { timestamps: true });

const ActivityMarkSubdivision = mongoose.model(
  "ActivityMarkSubdivision",
  activityMarkSubdivisionSchema
);

export default ActivityMarkSubdivision;