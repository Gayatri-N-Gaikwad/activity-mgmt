import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
import adminRoutes from "./routes/adminRoutes.js";
import hodRoutes from "./routes/hodRoutes.js";

dotenv.config();
console.log("✅ ENV file loaded");
console.log("MONGO_URI value:", process.env.MONGO_URI);

const app = express();

// --------------------
// 🔹 CORS Configuration
// --------------------
const allowedOrigins = [
  "http://localhost:3000",                // for local dev (default port)
  "http://localhost:3001",                // for local dev (alternative port)
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
app.use(express.json({
  type: ['application/json', 'application/x-www-form-urlencoded']
}));

// --------------------
// 🔹 Static File Serving
// --------------------
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --------------------
// 🔹 File Upload Configuration
// --------------------
import multer from "multer";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "uploads"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// Make upload available globally
app.use((req, res, next) => {
  req.upload = upload;
  next();
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

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
app.use("/api/admin", adminRoutes);
app.use("/api/hod", hodRoutes);

// --------------------
// 🔹 Start server
// --------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
