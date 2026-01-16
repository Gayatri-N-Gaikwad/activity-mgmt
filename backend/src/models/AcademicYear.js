import mongoose from 'mongoose';

const academicYearSchema = new mongoose.Schema({
    year: {type: String, required: true, unique: true},
    isActive : {type: Boolean, default: false}
}, { timestamps: true });

export default mongoose.model("AcademicYear", academicYearSchema);
