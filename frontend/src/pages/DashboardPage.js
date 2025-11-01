import React from "react";
import LogoutButton from "../components/LogoutButton";

function DashboardPage() {
  const user = JSON.parse(localStorage.getItem("user"));

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h2>Dashboard</h2>
      <p>Welcome back, <strong>{user?.name}</strong> 👋</p>
      <p>Your role: {user?.role}</p>

      {/* ✅ Logout button */}
      <LogoutButton />
    </div>
  );
}

export default DashboardPage;
