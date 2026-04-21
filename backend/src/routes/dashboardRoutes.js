import express from "express";
import {
  getAdminDashboardStats,
  getHodDashboardStats,
  getFacultyDashboardStats,
} from "../controllers/dashboardController.js";

import { getCoordinatorDashboardStats } from "../controllers/dashboardController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js"
const router = express.Router();

router.get("/admin", getAdminDashboardStats);
router.get("/hod", getHodDashboardStats);
router.get("/faculty", authMiddleware, getFacultyDashboardStats);
router.get(
  "/coordinator-dashboard",
  authMiddleware,
  getCoordinatorDashboardStats
);
export default router;
