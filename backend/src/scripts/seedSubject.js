import mongoose from "mongoose";
import Subject from "../models/Subject.js"; 
import dotenv from "dotenv";

dotenv.config();

// connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("MongoDB connected"))
.catch((err) => console.error("MongoDB connection error:", err));

const subjects = [
  { name: "Mathematics I", code: "EMATH101" },
  { name: "Physics I", code: "PHYS101" },
  { name: "Engineering Mechanics", code: "ENGM101" },
  { name: "Basic Electrical Engineering", code: "BEE101" },
  { name: "Programming in C", code: "CS101" },
];


const seedSubjects = async () => {
  try {
    const inserted = await Subject.insertMany(subjects);
    console.log("Subjects added:", inserted);
    mongoose.disconnect();
  } catch (err) {
    console.error(err);
    mongoose.disconnect();
  }
};

seedSubjects();
