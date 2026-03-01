import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { sendNotificationEmail } from "./emailService.js";

export const createNotification = async ({
  recipientId,
  activity,
  type,
  subject,
  message,
}) => {
  try {
    const filter = {
      recipientId,
      activityId: activity._id,
      type,
    };

    const update = {
      $setOnInsert: {
        recipientId,
        activityId: activity._id,
        type,
        message,
      },
    };

    const result = await Notification.updateOne(
      filter,
      {
        $setOnInsert: {
          recipientId,
          activityId: activity._id,
          type,
          message,
        },
      },
      { upsert: true },
    );

    const isNew = result.upsertedCount > 0;

    if (!isNew) {
      console.log("⚠ Duplicate prevented. Email not sent.");
      return;
    }

    const faculty = await User.findById(recipientId);

    if (!faculty?.email) {
      console.log("❌ Faculty email not found.");
      return;
    }

    // ✅ Convert scheduled date to IST string
    const scheduleDateIST = new Date(activity.scheduleDate).toLocaleString(
      "en-IN",
      {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short",
      },
    );

    // HTML Email template
    const html = `
      <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.5;">
        <h2 style="color: #0056b3;">Activity Notification</h2>
        <p>Dear <strong>${faculty.name}</strong>,</p>
        <p>${message}</p>

        <div style="
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 16px;
          background-color: #f9f9f9;
          margin: 16px 0;
        ">
          <h3 style="margin-top: 0; color: #333;">Activity Details</h3>
          <p><strong>Name:</strong> ${activity.name}</p>
          <p><strong>Description:</strong> ${activity.description}</p>
          <p><strong>Scheduled Date:</strong> ${scheduleDateIST}</p>
          ${activity.status ? `<p><strong>Status:</strong> ${activity.status}</p>` : ""}
        </div>

        <p style="font-size: 0.9em; color: #555;">
          This is a system-generated notification on behalf of Admin.
        </p>
      </div>
    `;

    // Plain text fallback
    const text = `
Dear ${faculty.name},

${message}

Activity Details:
- Name: ${activity.name}
- Description: ${activity.description}
- Scheduled Date: ${scheduleDateIST}
${activity.status ? `- Status: ${activity.status}` : ""}

This is a system-generated notification on behalf of Admin.
    `;

    await sendNotificationEmail(faculty.email, subject, html, text);
    console.log("✅ Email sent successfully.");
  } catch (err) {
    console.error("❌ Notification Error:", err);
  }
};
