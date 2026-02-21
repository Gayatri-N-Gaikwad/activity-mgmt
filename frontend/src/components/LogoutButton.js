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
      className="btn btn-danger"
      onClick={handleLogout}
    >
      Logout
    </button>
  );
}

export default LogoutButton;
