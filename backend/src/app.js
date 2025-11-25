import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";

// Import routes
import authRoutes from "./routes/authRoutes.js";
import activityRoutes from "./routes/activityRoutes.js";
import marksRoutes from "./routes/marksRoutes.js";
import classRoutes from "./routes/classRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import teachingAssignmentRoutes from "./routes/teachingAssignmentRoutes.js";
import subjectRoutes from "./routes/subjectRoutes.js";
import rubricRoutes from "./routes/rubricRoutes.js"
import studentSubjectMarksRoutes from "./routes/studentSubjectMarksRoutes.js";

dotenv.config();
console.log("✅ ENV file loaded");
console.log("MONGO_URI value:", process.env.MONGO_URI);

const app = express();

// --------------------
// 🔹 CORS Configuration
// --------------------
const allowedOrigins = [
  "http://localhost:3000",                // for local dev
  process.env.FRONTEND_URL                // your Netlify URL (set in Render env vars)
].filter(Boolean); // remove undefined

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like Postman) or if origin is in the list
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// --------------------
// 🔹 Middlewares
// --------------------
app.use(express.json());

// --------------------
// 🔹 Connect to MongoDB
// --------------------
connectDB();

// --------------------
// 🔹 Routes
// --------------------
app.get("/", (req, res) => {
  res.send("✅ Activity Management Backend is running 🚀");
});

app.use("/api/auth", authRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/marks", marksRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/teaching-assignment", teachingAssignmentRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/rubric", rubricRoutes);
app.use("/api/student-subject-marks", studentSubjectMarksRoutes); // Added route for student-subject-marks

// --------------------
// 🔹 Start server
// --------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
