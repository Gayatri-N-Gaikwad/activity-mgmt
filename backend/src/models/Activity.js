// src/models/Activity.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const activitySchema = new Schema({
  name: { type: String, required: true },
  scheduleDate: { type: Date, required: true },
  status: { type: String, enum: ['Scheduled','Conducted','Marks_Updated'], default: 'Scheduled' },
  coordinatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  assignmentId: { type: Schema.Types.ObjectId, ref: 'TeachingAssignment', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Activity', activitySchema);
