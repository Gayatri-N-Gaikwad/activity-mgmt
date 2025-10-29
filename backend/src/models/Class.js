// src/models/Class.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const classSchema = new Schema({
  name: { type: String, required: true, unique: true } // e.g., "TE-A"
}, { timestamps: true });

module.exports = mongoose.model('Class', classSchema);
