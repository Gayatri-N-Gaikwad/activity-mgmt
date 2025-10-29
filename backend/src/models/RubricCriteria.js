// src/models/RubricCriteria.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const rubricSchema = new Schema({
  activityId: { type: Schema.Types.ObjectId, ref: 'Activity', required: true },
  name: { type: String, required: true }, // e.g. Report
  maxMarks: { type: Number, required: true } // e.g. 10 or 8 etc
}, { timestamps: true });

module.exports = mongoose.model('RubricCriteria', rubricSchema);
