import React from "react";
import { useNavigate } from "react-router-dom";

function LogoutButton() {
  const navigate = useNavigate();

  const handleLogout = () => {
    // 🧹 Clear token & user data
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    // ✅ Redirect to login
    navigate("/login");
  };

  return (
    <button
      onClick={handleLogout}
      style={{
        padding: "8px 16px",
        backgroundColor: "#e74c3c",
        color: "white",
        border: "none",
        borderRadius: "6px",
        cursor: "pointer",
        marginTop: "10px",
      }}
    >
      Logout
    </button>
  );
}

export default LogoutButton;
