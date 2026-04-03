import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import showToast from "../utils/toast";

function FirstLoginResetPasswordPage() {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const userRaw = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    if (!token || !userRaw) {
      navigate("/login");
      return;
    }

    const user = JSON.parse(userRaw);

    if (!newPassword || newPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      await api.post("/auth/change-password-first-time", {
        email: user.email,
        newPassword,
      });

      const updatedUser = { ...user, isFirstLogin: false };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      showToast("success", "Password updated successfully");
      navigate("/");
    } catch (err) {
      const message = err?.response?.data?.message || "Failed to reset password";
      setError(message);
      showToast("error", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card login-card">
        <div className="auth-brand">Faculty Portal</div>
        <h2 className="auth-title">Set New Password</h2>
        <p className="auth-subtitle">This is your first login. Please update your password to continue.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="newPassword">New Password</label>
            <input
              id="newPassword"
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <div className="auth-field">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {error ? (
            <div className="status-alert status-alert-warn" style={{ marginBottom: "12px" }}>
              <i className="fa fa-exclamation-circle"></i>
              <span>{error}</span>
            </div>
          ) : null}

          <button className="btn btn-primary auth-submit" type="submit" disabled={loading}>
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>

        <p className="auth-footer">Use a strong password with letters, numbers, and symbols.</p>
      </div>
    </div>
  );
}

export default FirstLoginResetPasswordPage;
