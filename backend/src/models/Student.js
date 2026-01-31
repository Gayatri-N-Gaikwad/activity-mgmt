import mongoose from "mongoose";

const { Schema } = mongoose;

const studentSchema = new Schema({
  rollNumber: { 
    type: String, 
    required: true 
  },

  name: { 
    type: String, 
    required: true 
  },

  year: {
    type: String,
    required: true,
    enum: ['SY', 'TE', 'BE'] 
  },

  division: {
    type: String,
    required: true
  } 

}, { timestamps: true });

/*
   Unique roll number within same year & division
*/
studentSchema.index(
  { rollNumber: 1, year: 1, division: 1 },
  { unique: true }
);

const Student = mongoose.model('Student', studentSchema);

export default Student;
