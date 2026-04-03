import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import FacultyDirectory from "../models/FacultyDirectory.js";

// REGISTER USER
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const requestedRole = String(role || "Faculty").trim();

    console.log("Login payload:", req.body);
    console.log("JWT_SECRET:", process.env.JWT_SECRET);

    if (!name || !normalizedEmail || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    const directoryEntry = await FacultyDirectory.findOne({ email: normalizedEmail }).lean();
    if (!directoryEntry) {
      return res.status(403).json({
        message: "This email is not registered in the faculty directory. Contact admin to add it first.",
      });
    }

    const allowedRoles = new Set((directoryEntry.roles || []).map((item) => String(item).trim()));
    if (allowedRoles.size > 0 && !allowedRoles.has(requestedRole)) {
      return res.status(400).json({
        message: `This email can register only as: ${Array.from(allowedRoles).join(", ")}`,
      });
    }


    // Check existing user
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Save user
    const user = new User({
      name: String(name).trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: requestedRole,
      isFirstLogin: false,
    });
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
