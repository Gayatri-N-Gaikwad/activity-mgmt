import React, { useState } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";

function LoginPage() {
  const navigate = useNavigate(); // ✅ React Router navigation hook
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("Logging in...");
    try {
      const res = await api.post("/auth/login", formData);
      const { token, user } = res.data;

      // ✅ Save token + user info in localStorage
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      setMessage("✅ Login successful! Redirecting...");
      
      // ✅ Redirect to home page
      setTimeout(() => navigate("/"), 1000);
    } catch (err) {
      setMessage("❌ Invalid email or password");
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <input
          name="email"
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          required
        /><br /><br />

        <input
          name="password"
          type="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          required
        /><br /><br />

        <button type="submit">Login</button>
      </form>

      <p>{message}</p>
      <p>
        Don’t have an account? <a href="/register">Register</a>
      </p>
    </div>
  );
}

export default LoginPage;
