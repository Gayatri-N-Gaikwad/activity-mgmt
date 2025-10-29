// src/models/User.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['Faculty','Coordinator','HOD'], required: true },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
