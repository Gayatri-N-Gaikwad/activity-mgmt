import express from "express";
import { registerUser, loginUser, healthCheck } from "../controllers/authController.js";
import jwt from "jsonwebtoken";

// Debug helper: decode token and return payload (no role checks)
const debugToken = (req, res) => {
	try {
		const authHeader = req.header("Authorization");
		const token = authHeader?.replace("Bearer ", "") || null;
		if (!token) return res.status(400).json({ error: "No token provided" });

		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		return res.json({ decoded });
	} catch (err) {
		return res.status(400).json({ error: "Invalid token", details: err.message });
	}
};

const router = express.Router();

router.get("/health", healthCheck);
router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/debug-token", debugToken);

export default router;
