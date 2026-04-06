import express from "express";
// import multer from "multer";

import {
  suggestActivities,
  activityOptions,
  generateFinalActivity
} from "../controllers/aiController.js";

const router = express.Router();

// const upload = multer({
//   dest: "src/uploads/"
// });


// Step 1
router.post(
  "/suggest-activities",
  suggestActivities
);


// Step 2
router.post(
  "/activity-options",
  activityOptions
);


// Step 3
router.post(
  "/generate-final-activity",
  generateFinalActivity
);

export default router;