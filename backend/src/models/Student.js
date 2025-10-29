// src/models/Student.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const studentSchema = new Schema({
  rollNumber: { type: String, required: true },
  name: { type: String, required: true },
  classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true }
}, { timestamps: true });

studentSchema.index({ rollNumber: 1, classId: 1 }, { unique: true });

module.exports = mongoose.model('Student', studentSchema);
