import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "./pages/LoginPage";
// import RegisterPage from "./pages/RegisterPage"; // Signup route disabled intentionally
import FirstLoginResetPasswordPage from "./pages/FirstLoginResetPasswordPage";
import DashboardPage from "./pages/DashboardPage";
import ProtectedRoute from "./components/ProtectedRoute";
import Header from "./components/Header";
import { checkAuthStatus, getDashboardRoute } from "./services/api";

// ✅ Activity Module
import ActivityList from "./pages/activities/ActivityList";
import CreateActivity from "./pages/activities/CreateActivity";
import EditActivity from "./pages/activities/EditActivity";
import ScheduleActivity from "./pages/activities/ScheduleActivity";
import AddMarks from "./pages/activities/AddMarks";
import ActivityDetails from "./pages/activities/ActivityDetails";

// Admin
import AdminDashboard from "./pages/AdminDashboard";
import AdminActivityList from "./pages/activities/AdminActivityList";

// HOD
import HODDashboard from "./pages/HODDashboard";
import HODActivityList from "./pages/HODActivityList";

// Subject Coordinator
import SubjectAnalytics from "./pages/SubjectAnalytics";

const RootRedirect = () => {
  if (!checkAuthStatus()) {
    return <Navigate to="/login" replace={true} />;
  }

  return <Navigate to={getDashboardRoute()} replace={true} />;
};

const LoginRedirect = () => {
  if (checkAuthStatus()) {
    return <Navigate to={getDashboardRoute()} replace={true} />;
  }

  return <LoginPage />;
};

function App() {
  return (
    <Router>
      <Header />
      <div className="app-container">
        {/* Routes */}
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginRedirect />} />
          {/* <Route path="/register" element={<RegisterPage />} /> */}

      <Route
        path="/reset-password-first-login"
        element={
          <ProtectedRoute>
            <FirstLoginResetPasswordPage />
          </ProtectedRoute>
        }
      />

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
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* ⭐ Subject Coordinator Analytics */}
          <Route
            path="/subject-analytics"
            element={
              <ProtectedRoute>
                <SubjectAnalytics />
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

          <Route
            path="/activity/details/:id"
            element={
              <ProtectedRoute>
                <ActivityDetails />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/activities"
            element={
              <ProtectedRoute>
                <AdminActivityList />
              </ProtectedRoute>
            }
          />

          {/* ⭐ HOD Dashboard Routes */}
          <Route
            path="/hod"
            element={
              <ProtectedRoute>
                <HODDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/hod/activities"
            element={
              <ProtectedRoute>
                <HODActivityList />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
