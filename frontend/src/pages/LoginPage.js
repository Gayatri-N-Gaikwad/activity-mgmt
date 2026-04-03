import React, { useState } from "react";
import api from "../services/api";
import { Link, useNavigate } from "react-router-dom";
import showToast from "../utils/toast";

function LoginPage() {
  const navigate = useNavigate(); // ✅ React Router navigation hook
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    showToast("info", "Logging in...");
    try {
      const res = await api.post("/auth/login", formData);
      const { token, user } = res.data;

      // ✅ Save token + user info in localStorage
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      showToast("success", "Login successful! Redirecting...");
      
      // Redirect first-time users to password reset page
      if (user?.isFirstLogin && user?.role !== "admin") {
        setTimeout(() => navigate("/reset-password-first-login"), 1000);
      } else {
        setTimeout(() => navigate("/"), 1000);
      }
    } catch (err) {
      showToast("error", "Invalid email or password");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card login-card">
        <div className="auth-brand">Faculty Portal</div>
        <h2 className="auth-title">Welcome back</h2>
        <p className="auth-subtitle">Sign in to continue managing academic activities.</p>

        <form className="auth-form" onSubmit={handleLogin}>
          <div className="auth-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="faculty@example.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Enter password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <button className="btn btn-primary auth-submit" type="submit">
            Login
          </button>
        </form>

        <p className="auth-footer">
          Don’t have an account? <Link to="/register">Create account</Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
