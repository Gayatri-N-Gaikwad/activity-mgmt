import mongoose from "mongoose";
const { Schema } = mongoose;

const notificationSchema = new Schema(
  {
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    activityId: {
      type: Schema.Types.ObjectId,
      ref: "Activity",
      index: true,
    },
    type: {
      type: String,
      enum: [
        "REMINDER_BEFORE",
        "NOT_CONDUCTED",
        "MARKS_NOT_UPDATED",
      ],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Prevent duplicate notifications
notificationSchema.index(
  { recipientId: 1, activityId: 1, type: 1 },
  { unique: true }
);

export default mongoose.model("Notification", notificationSchema);