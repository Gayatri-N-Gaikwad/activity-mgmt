import cron from "node-cron";
import { processActivityAlerts } from "../services/activityAlertService.js";

export const startActivityCron = () => {
  cron.schedule("* * * * *", async () => {
    console.log("Running Activity Alert Cron...");
    await processActivityAlerts();
  });
};