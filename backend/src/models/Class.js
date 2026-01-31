import mongoose from 'mongoose';

const { Schema } = mongoose;

const classSchema = new Schema({
  year: {
    type: String,
    required: true,
    enum: ['SY', 'TE', 'BE'] // year enum
  },

  division: {
    type: String,
    required: true
  } 
  
}, { timestamps: true });

const Class = mongoose.model('Class', classSchema);
export default Class;
