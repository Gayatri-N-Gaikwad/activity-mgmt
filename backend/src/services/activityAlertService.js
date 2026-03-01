import Activity from "../models/Activity.js";
import { createNotification } from "./notificationService.js";
import { DateTime } from "luxon";

export const processActivityAlerts = async () => {
  try {
    console.log("🚀 Cron Triggered");

    const nowIST = DateTime.now().setZone("Asia/Kolkata");
    console.log("🕒 Current IST Time:", nowIST.toISO());

    // ✅ Proper 1 day before
    const tomorrowStart = nowIST.plus({ days: 1 }).startOf("day").toJSDate();
    const tomorrowEnd = nowIST.plus({ days: 1 }).endOf("day").toJSDate();

    // ✅ 1 day after
    const yesterdayStart = nowIST.minus({ days: 1 }).startOf("day").toJSDate();
    const yesterdayEnd = nowIST.minus({ days: 1 }).endOf("day").toJSDate();

    /* ===============================
       1️⃣ REMINDER BEFORE (Tomorrow)
    =============================== */

    const reminderActivities = await Activity.find({
      scheduleDate: { $gte: tomorrowStart, $lte: tomorrowEnd },
      status: "Scheduled",
    });

    console.log("📌 Reminder Activities Found:", reminderActivities.length);

    for (const activity of reminderActivities) {
      await createNotification({
        recipientId: activity.coordinatorId,
        activity,
        type: "REMINDER_BEFORE",
        subject: "Reminder: Conduct Activity Tomorrow",
        message: `Please ensure the activity "${activity.name}" is conducted tomorrow.`,
      });
    }

    /* ===============================
       2️⃣ NOT CONDUCTED (Yesterday)
    =============================== */

    const notConductedActivities = await Activity.find({
      scheduleDate: { $gte: yesterdayStart, $lte: yesterdayEnd },
      status: "Scheduled",
    });

    console.log("📌 Not Conducted Activities Found:", notConductedActivities.length);

    for (const activity of notConductedActivities) {
      await createNotification({
        recipientId: activity.coordinatorId,
        activity,
        type: "NOT_CONDUCTED",
        subject: "Activity Not Conducted",
        message: `The activity "${activity.name}" scheduled yesterday was not marked as conducted.`,
      });
    }

    /* ===============================
       3️⃣ MARKS NOT UPDATED
       (1 day after Conducted)
    =============================== */

    const marksPendingActivities = await Activity.find({
      status: "Conducted", // if marks updated, status becomes Marks_Updated
      "conductedConfirmation.confirmedAt": {
        $gte: yesterdayStart,
        $lte: yesterdayEnd,
      },
    });

    console.log("📌 Marks Pending Activities Found:", marksPendingActivities.length);

    for (const activity of marksPendingActivities) {
      await createNotification({
        recipientId: activity.coordinatorId,
        activity,
        type: "MARKS_NOT_UPDATED",
        subject: "Marks Not Updated",
        message: `Marks for activity "${activity.name}" have not been updated yet.`,
      });
    }

    console.log("🎯 Activity alerts processed successfully.\n");
  } catch (error) {
    console.error("❌ Error processing alerts:", error);
  }
};