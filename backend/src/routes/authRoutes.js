import express from "express";
import { registerUser, loginUser, healthCheck } from "../controllers/authController.js";

const router = express.Router();

router.get("/health", healthCheck);
router.post("/register", registerUser);
router.post("/login", loginUser);

export default router;
