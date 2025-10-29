// src/models/TeachingAssignment.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const assignmentSchema = new Schema({
  facultyId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
  classId:   { type: Schema.Types.ObjectId, ref: 'Class', required: true }
}, { timestamps: true });

assignmentSchema.index({ facultyId:1, subjectId:1, classId:1 }, { unique: true });

module.exports = mongoose.model('TeachingAssignment', assignmentSchema);
