import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { checkAuthStatus } from "../services/api";

// This wrapper checks if a token exists and is valid before rendering a page
function ProtectedRoute({ children }) {
  const isAuthenticated = checkAuthStatus();
  const location = useLocation();

  if (!isAuthenticated) {
    // ❌ Not logged in or token expired → redirect to login page
    return <Navigate to="/login" replace />;
  }

  const userRaw = localStorage.getItem("user");
  const user = userRaw ? JSON.parse(userRaw) : null;

  if (user?.isFirstLogin && user?.role !== "admin" && location.pathname !== "/reset-password-first-login") {
    return <Navigate to="/reset-password-first-login" replace />;
  }

  // ✅ Logged in with valid token → show the requested page
  return children;
}

export default ProtectedRoute;
