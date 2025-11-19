import cron from "node-cron";
import { sendEmailNotification } from "./sendEmail.js";   // ✅ FIXED IMPORT

export function scheduleActivityReminder(activity) {
    if (!activity || !activity.deadline) {
        console.log("⛔ No deadline provided, skipping scheduler");
        return;
    }

    const deadline = new Date(activity.deadline);

    if (isNaN(deadline.getTime())) {
        console.log("⛔ Invalid deadline format:", activity.deadline);
        return;
    }

    console.log("⏳ Scheduling reminder for deadline:", deadline);

    const minute = deadline.getMinutes();
    const hour = deadline.getHours();
    const day = deadline.getDate();
    const month = deadline.getMonth() + 1;

    const cronPattern = `${minute} ${hour} ${day} ${month} *`;

    console.log("🟢 Cron Pattern:", cronPattern);

    cron.schedule(
        cronPattern,
        () => {
            console.log(`📧 Sending reminder email for activity ${activity._id}`);

            sendEmailNotification(                // ✅ FIXED FUNCTION NAME
                activity.assignedToEmail || "test@example.com",
                `Reminder: Activity Deadline Approaching`,
                `Your activity "${activity.title}" is due soon.`
            );
        },
        {
            scheduled: true,
            timezone: "Asia/Kolkata",
        }
    );
}