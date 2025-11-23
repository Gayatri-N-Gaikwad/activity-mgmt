import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Class from '../models/Class.js';

dotenv.config();

const dummyClasses = [
  { name: 'SY-09' },
  { name: 'SY-10' },
  { name: 'SY-11' },
];

const seedClasses = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to Atlas for class seeding.");

    for (const c of dummyClasses) {
      const existing = await Class.findOne({ name: c.name });
      if (!existing) {
        await Class.create(c);
        console.log(`Added class: ${c.name}`);
      } else {
        console.log(`Class ${c.name} already exists, skipping.`);
      }
    }

    console.log("Class seeding complete!");
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
};

seedClasses();
