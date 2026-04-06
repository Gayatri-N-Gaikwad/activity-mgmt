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

  // Stores Google Group link for the class
  google_group_email: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function (value) {
        try {
          const parsedUrl = new URL(value);
          return parsedUrl.protocol === 'https:' && parsedUrl.hostname === 'groups.google.com';
        } catch {
          return false;
        }
      },
      message: 'Enter a valid Google Group link'
    }
  }
  
}, { timestamps: true });

const Class = mongoose.model('Class', classSchema);
export default Class;
