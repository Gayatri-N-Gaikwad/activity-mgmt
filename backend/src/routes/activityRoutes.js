import express from "express";
const router = express.Router();

// Example route
router.get("/", (req, res) => {
  res.send("Activity routes working ✅");
});

export default router; // ✅ this fixes the error
