import express from "express";
import {
  getAdminDashboardStats,
  getHodDashboardStats,
} from "../controllers/dashboardController.js";

const router = express.Router();

router.get("/admin", getAdminDashboardStats);
router.get("/hod", getHodDashboardStats);

export default router;
