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
  },

  // Google Group email for the class - used for sending activity notifications
  google_group_email: {
    type: String,
    default: null,
    lowercase: true,
    trim: true
  }
  
}, { timestamps: true });

const Class = mongoose.model('Class', classSchema);
export default Class;
