// import React, { useEffect, useState } from "react";
// import axios from "axios";
// import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
// import HomePage from "./pages/HomePage";
// import LoginPage from "./pages/LoginPage";
// import RegisterPage from "./pages/RegisterPage";
// import DashboardPage from "./pages/DashboardPage";
// import ProtectedRoute from "./components/ProtectedRoute";

// function App() {
//   const [backendStatus, setBackendStatus] = useState("Checking backend...");

// const backendURL =
//   process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

// useEffect(() => {
//   axios
//     .get(`${backendURL}/api/auth/health`)
//     .then((res) => setBackendStatus(res.data.message))
//     .catch(() => setBackendStatus("❌ Could not connect to backend"));
// }, [backendURL]); // ✅ Added backendURL to dependency array



//   return (
//     <Router>
//       <div style={{ textAlign: "center", marginTop: "30px" }}>
//         <h1>Activity Management System</h1>
//         <p>Frontend is running successfully!</p>
//         <h3>Backend Status: {backendStatus}</h3>

//         {/* Simple Navigation */}
//         <nav style={{ marginTop: "20px" }}>
//           <Link to="/" style={{ margin: "0 10px" }}>
//             Home
//           </Link>
//           <Link to="/login" style={{ margin: "0 10px" }}>
//             Login
//           </Link>
//           <Link to="/register" style={{ margin: "0 10px" }}>
//             Register
//           </Link>
//           <Link to="/dashboard" style={{ margin: "0 10px" }}>
//             Dashboard
//           </Link>
//         </nav>

//         <hr style={{ margin: "20px 0" }} />

//         {/* Routes */}
//         <Routes>
//           <Route path="/" element={<HomePage />} />
//           <Route path="/login" element={<LoginPage />} />
//           <Route path="/register" element={<RegisterPage />} />
            
//             {/* ✅ Protected route example */}
//           <Route
//             path="/dashboard"
//             element={
//               <ProtectedRoute>
//                 <DashboardPage />
//               </ProtectedRoute>
//             }
//           />

//         </Routes>
//       </div>
//     </Router>
//   );
// }

// export default App;





import React, { useEffect, useState } from "react";
import axios from "axios";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";

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
import UpdateMarks from "./pages/UpdateMarks";

function App() {
  const [backendStatus, setBackendStatus] = useState("Checking backend...");

  const backendURL =
    process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

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
            path="/marks/update"
            element={
              <ProtectedRoute>
                <UpdateMarks />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;