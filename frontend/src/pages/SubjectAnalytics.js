import React from "react";
import CoordinatorDashboardCharts from "./CoordinatorDashboardCharts";

const SubjectAnalytics = () => {
  return (
    <div className="analytics-section">
      <div className="card">
        <div className="activities-header">
          <div>
            <h2 style={{ marginTop: 0 }}>Subject Analytics</h2>
            <p className="muted">
              Analytics for subjects where you are the coordinator.
            </p>
          </div>
        </div>
      </div>

      <CoordinatorDashboardCharts />
    </div>
  );
};

export default SubjectAnalytics;