import React from "react";
import { Navigate } from "react-router-dom";
import { checkAuthStatus } from "../services/api";

// This wrapper checks if a token exists and is valid before rendering a page
function ProtectedRoute({ children }) {
  const isAuthenticated = checkAuthStatus();

  if (!isAuthenticated) {
    // ❌ Not logged in or token expired → redirect to login page
    return <Navigate to="/login" replace />;
  }

  // ✅ Logged in with valid token → show the requested page
  return children;
}

export default ProtectedRoute;
