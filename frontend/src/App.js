import React, { useEffect, useState } from "react";
import axios from "axios";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  const [backendStatus, setBackendStatus] = useState("Checking backend...");

const backendURL =
  process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

useEffect(() => {
  axios
    .get(`${backendURL}/api/auth/health`)
    .then((res) => setBackendStatus(res.data.message))
    .catch(() => setBackendStatus("❌ Could not connect to backend"));
}, []);


  return (
    <Router>
      <div style={{ textAlign: "center", marginTop: "30px" }}>
        <h1>Activity Management System</h1>
        <p>Frontend is running successfully!</p>
        <h3>Backend Status: {backendStatus}</h3>

        {/* Simple Navigation */}
        <nav style={{ marginTop: "20px" }}>
          <Link to="/" style={{ margin: "0 10px" }}>
            Home
          </Link>
          <Link to="/login" style={{ margin: "0 10px" }}>
            Login
          </Link>
          <Link to="/register" style={{ margin: "0 10px" }}>
            Register
          </Link>
          <Link to="/dashboard" style={{ margin: "0 10px" }}>
            Dashboard
          </Link>
        </nav>

        <hr style={{ margin: "20px 0" }} />

        {/* Routes */}
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
            
            {/* ✅ Protected route example */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

        </Routes>
      </div>
    </Router>
  );
}

export default App;
