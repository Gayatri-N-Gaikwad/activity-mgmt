import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

// REGISTER USER
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    console.log("Login payload:", req.body);
    console.log("JWT_SECRET:", process.env.JWT_SECRET);


    // Check existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Save user
    const user = new User({ name, email, password: hashedPassword, role, isFirstLogin: false });
    await user.save();

    res.status(201).json({ message: "User registered successfully ✅" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// LOGIN USER
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("Login payload:", req.body);
    console.log("JWT_SECRET:", process.env.JWT_SECRET);


    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful ✅",
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, isFirstLogin: user.isFirstLogin },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// CHANGE PASSWORD ON FIRST LOGIN
export const changePasswordFirstTime = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    // Validate inputs
    if (!email || !newPassword) {
      return res.status(400).json({ message: "Email and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long" });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    if (!user.isFirstLogin) {
      return res.status(400).json({ message: "User has already reset password" });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update user password and isFirstLogin
    user.password = hashedPassword;
    user.isFirstLogin = false;
    await user.save();

    res.json({
      message: "Password changed successfully ✅",
      user: { id: user._id, name: user.name, email: user.email, role: user.role, isFirstLogin: user.isFirstLogin }
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// HEALTH TEST
export const healthCheck = (req, res) => {
  res.json({ message: "Auth route working ✅" });
};
