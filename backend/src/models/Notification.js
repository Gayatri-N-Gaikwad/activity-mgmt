// src/models/Notification.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const notificationSchema = new Schema({
  recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  activityId: { type: Schema.Types.ObjectId, ref: 'Activity' },
  message: { type: String },
  sentAt: { type: Date, default: Date.now },
  type: { type: String } // e.g., "Schedule", "Reminder"
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
