import mongoose from "mongoose";
import dotenv from "dotenv";

import User from "../models/User.js";
import Subject from "../models/Subject.js";
import Class from "../models/Class.js";
import TeachingAssignment from "../models/TeachingAssignment.js";

dotenv.config();

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err));

const seedTeachingAssignments = async () => {
  try {
    await TeachingAssignment.deleteMany();
    console.log("🧹 Old assignments cleared");

    // ⭐ ALLOW ONLY THESE THREE FACULTIES ⭐
    const allowedFacultyIds = [
      "691f1accbc10ac411f204275",
      "69209cac3871c7c3d35fb271",
      "69209cc53871c7c3d35fb274",
    ];

    const faculties = await User.find({ _id: { $in: allowedFacultyIds } });
    const subjects = await Subject.find();
    const classes = await Class.find();

    if (!faculties.length || !subjects.length || !classes.length) {
      console.log("❌ Missing data: faculties / subjects / classes");
      return mongoose.disconnect();
    }

    let facultyIndex = 0;
    let subjectIndex = 0;

    const assignments = [];

    for (const classItem of classes) {
      const subject = subjects[subjectIndex];
      subjectIndex = (subjectIndex + 1) % subjects.length;

      const faculty = faculties[facultyIndex];
      facultyIndex = (facultyIndex + 1) % faculties.length;

      assignments.push({
        facultyId: faculty._id,
        subjectId: subject._id,
        classId: classItem._id,
      });
    }

    await TeachingAssignment.insertMany(assignments);

    console.log("🎉 Teaching Assignments Seeded Successfully");
    console.table(
      assignments.map((a) => ({
        class: a.classId.toString(),
        subject: a.subjectId.toString(),
        faculty: a.facultyId.toString(),
      }))
    );

    mongoose.disconnect();
  } catch (error) {
    console.error("❌ Error seeding:", error);
    mongoose.disconnect();
  }
};

seedTeachingAssignments();
