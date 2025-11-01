import express from "express";
const router = express.Router();

router.get("/", (req, res) => {
  res.send("Marks routes working ✅");
});

export default router;
