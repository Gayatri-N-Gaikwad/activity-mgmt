import mongoose from 'mongoose';

const academicYearSchema = new mongoose.Schema({
    year: {type: String, required: true, unique: true},
    isActive : {type: Boolean, default: false},
    semesterStartDate: {type: Date,required: true,},
    semesterEndDate: {type: Date,required: true,},
}, { timestamps: true });

export default mongoose.model("AcademicYear", academicYearSchema);
