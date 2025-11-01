import React from "react";
import { Navigate } from "react-router-dom";

// This wrapper checks if a token exists before rendering a page
function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");

  if (!token) {
    // ❌ Not logged in → redirect to login page
    return <Navigate to="/login" replace />;
  }

  // ✅ Logged in → show the requested page
  return children;
}

export default ProtectedRoute;
