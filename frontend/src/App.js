import React, { useEffect, useState } from "react";
import axios from "axios";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import ProtectedRoute from "./components/ProtectedRoute";
import Header from "./components/Header";

// ✅ Activity Module
import ActivityList from "./pages/activities/ActivityList";
import CreateActivity from "./pages/activities/CreateActivity";
import EditActivity from "./pages/activities/EditActivity";
import ScheduleActivity from "./pages/activities/ScheduleActivity";
import AddMarks from "./pages/activities/AddMarks";

// Admin
import AdminDashboard from "./pages/AdminDashboard";

function App() {
  const [backendStatus, setBackendStatus] = useState("Checking backend...");

  const backendURL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  useEffect(() => {
    axios
      .get(`${backendURL}/api/auth/health`)
      .then((res) => setBackendStatus(res.data.message))
      .catch(() => setBackendStatus("❌ Could not connect to backend"));
  }, [backendURL]);

  return (
    <Router>
      <Header />
      <div className="app-container">
        <div style={{ textAlign: "left" }}>
          <h3 className="muted">Backend Status: {backendStatus}</h3>
        </div>

        {/* Routes */}
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          {/* ⭐ Admin Dashboard */}
          <Route
            path="/teaching-assignment/assignments"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* ⭐ Activity Module Routes */}
          <Route
            path="/activities"
            element={
              <ProtectedRoute>
                <ActivityList />
              </ProtectedRoute>
            }
          />

          <Route
            path="/activity/create"
            element={
              <ProtectedRoute>
                <CreateActivity />
              </ProtectedRoute>
            }
          />

          <Route
            path="/activity/edit/:id"
            element={
              <ProtectedRoute>
                <EditActivity />
              </ProtectedRoute>
            }
          />

          <Route
            path="/activity/schedule/:id"
            element={
              <ProtectedRoute>
                <ScheduleActivity />
              </ProtectedRoute>
            }
          />

          <Route
            path="/marks/activity/:activityId"
            element={
              <ProtectedRoute>
                <AddMarks />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
