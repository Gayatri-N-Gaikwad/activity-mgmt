import mongoose from "mongoose";

const { Schema } = mongoose;

const facultyDirectorySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    roles: {
      type: [String],
      default: ["Faculty"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

facultyDirectorySchema.index({ email: 1 }, { unique: true });

const FacultyDirectory = mongoose.model("FacultyDirectory", facultyDirectorySchema);

export default FacultyDirectory;
