import mongoose from 'mongoose';

const { Schema } = mongoose;

const assignmentSchema = new Schema({
  facultyId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  subjectId: {
    type: Schema.Types.ObjectId,
    ref: 'Subject',
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
   unique per faculty + subject + year + division
*/
assignmentSchema.index(
  { facultyId: 1, subjectId: 1, year: 1, division: 1 },
  { unique: true }
);

const TeachingAssignment = mongoose.model('TeachingAssignment', assignmentSchema);
export default TeachingAssignment;
