import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
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
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["Faculty", "HOD", "admin"],  // coordinator role removed (each subject will have a coordinator)
      default: "Faculty",
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
