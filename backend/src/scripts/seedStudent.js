import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Student from '../models/Student.js';
import Class from '../models/Class.js';

dotenv.config();

const dummyStudents = [
  { rollNumber: '23101', name: 'Ananya Sharma', className: 'SY-09' },
  { rollNumber: '23102', name: 'Rohit Verma', className: 'SY-09' },
  { rollNumber: '23103', name: 'Karan Mehta', className: 'SY-09' },
  { rollNumber: '23104', name: 'Maya Kulkarni', className: 'SY-09' },
  { rollNumber: '23105', name: 'Vikram Joshi', className: 'SY-09' },
  { rollNumber: '23203', name: 'Sneha Patil', className: 'SY-10' },
  { rollNumber: '23204', name: 'Aditya Singh', className: 'SY-10' },
  { rollNumber: '23205', name: 'Ishaan Kapoor', className: 'SY-10' },
  { rollNumber: '23206', name: 'Riya Deshmukh', className: 'SY-10' },
  { rollNumber: '23207', name: 'Tarun Agarwal', className: 'SY-10' },
  { rollNumber: '23305', name: 'Priya Nair', className: 'SY-11' },
  { rollNumber: '23306', name: 'Siddharth Rao', className: 'SY-11' },
  { rollNumber: '23307', name: 'Neha Patil', className: 'SY-11' },
  { rollNumber: '23308', name: 'Rahul Gupta', className: 'SY-11' },
  { rollNumber: '23309', name: 'Ankit Sharma', className: 'SY-11' },
];

const seedStudents = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    for (const s of dummyStudents) {
      const cls = await Class.findOne({ name: s.className });
      if (!cls) {
        console.log(`Class ${s.className} not found, skipping student ${s.name}`);
        continue;
      }

      const existingStudent = await Student.findOne({
        rollNumber: s.rollNumber,
        classId: cls._id,
      });

      if (existingStudent) {
        console.log(`Student ${s.name} already exists, skipping.`);
        continue;
      }

      await Student.create({
        rollNumber: s.rollNumber,
        name: s.name,
        classId: cls._id,
      });

      console.log(`Added student: ${s.name}`);
    }

    console.log("Dummy students seeding complete!");
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
};

seedStudents();
