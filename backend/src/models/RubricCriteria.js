import mongoose from 'mongoose';

const { Schema } = mongoose;

const rubricSchema = new Schema({
  activityId: { type: Schema.Types.ObjectId, ref: 'Activity', required: true },
  name: { type: String, required: true }, // e.g. Report
  maxMarks: { type: Number, required: true } // e.g. 10 or 8 etc
}, { timestamps: true });

const RubricCriteria = mongoose.model('RubricCriteria', rubricSchema);

export default RubricCriteria;
