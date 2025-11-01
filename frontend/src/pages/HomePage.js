import React from "react";

function HomePage() {
  const user = JSON.parse(localStorage.getItem("user"));

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h2>Welcome to Activity Management System</h2>
      {user ? (
        <p>Hello, <strong>{user.name}</strong> 👋 (Role: {user.role})</p>
      ) : (
        <p>You are not logged in. Please login to continue.</p>
      )}
    </div>
  );
}

export default HomePage;
