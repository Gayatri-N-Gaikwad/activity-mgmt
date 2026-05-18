import React, { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useNavigate } from "react-router-dom";
import showToast from "../utils/toast";
import ChartCard from "../components/charts/ChartCard";
import { getFacultyDashboardAnalytics } from "../services/dashboardAnalyticsApi";

const PIE_COLORS = ["#4a8ff7", "#f2a65a", "#5dbb86", "#d36b6b"];

function FacultyDashboardCharts() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [stats, setStats] = useState({
    performance: [],
    attendance: [],
    marksDistribution: [],
    lifecycle: [],
    topStudents: [],
    pendingActivities: [],
    hasAssignments: false
  });

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getFacultyDashboardAnalytics();
      setStats(data);
    } catch (error) {
      console.error("Error fetching faculty stats:", error);
      showToast("error", "Unable to load statistics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats, refreshKey]);

  if (!stats.hasAssignments && !loading) {
    return (
      <div className="dashboard-panel" style={{ textAlign: "center", padding: "40px" }}>
        <h3>No Statistics Available</h3>
        <p className="muted">You don't have any teaching assignments yet.</p>
      </div>
    );
  }

  return (
    <div className="analytics-section" style={{ padding: "0 10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
         <div>
            <h2 style={{ margin: 0 }}>Faculty Analytics</h2>
            <p className="muted">Visual overview of your performance, attendance, and pending tasks.</p>
         </div>
         <button className="btn btn-outline" onClick={() => setRefreshKey(k => k + 1)}>
            <i className="fa fa-sync-alt" style={{ marginRight: 8 }}></i> Refresh
         </button>
      </div>

      <div className="analytics-grid analytics-grid-three" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px", marginBottom: "30px" }}>
        <ChartCard
          title="Subject Performance"
          subtitle="Average marks across your subjects"
          loading={loading}
          hasData={stats.performance.length > 0}
        >
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats.performance}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="avgMarks" fill="#4a8ff7" name="Avg Marks" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Attendance Overview"
          subtitle="Present vs Absent across all activities"
          loading={loading}
          hasData={stats.attendance.some(d => d.value > 0)}
        >
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={stats.attendance} dataKey="value" nameKey="name" outerRadius={80} label>
                {stats.attendance.map((entry, index) => (
                  <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Activity Status"
          subtitle="Progress of your assigned activities"
          loading={loading}
          hasData={stats.lifecycle.length > 0}
        >
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats.lifecycle} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" />
              <YAxis dataKey="stage" type="category" width={100} />
              <Tooltip />
              <Bar dataKey="count" fill="#5dbb86" name="Activities" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="analytics-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "20px" }}>
        {/* Top Performing Students */}
        <div className="card" style={{ padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "15px" }}>
             <i className="fa fa-trophy" style={{ color: "#f2a65a", fontSize: "20px" }}></i>
             <h3 style={{ margin: 0 }}>Top Performing Students</h3>
          </div>
          {loading ? (
             <p className="muted">Loading students...</p>
          ) : stats.topStudents.length > 0 ? (
            <div className="subject-table-wrap" style={{ boxShadow: "none", border: "1px solid #eee" }}>
              <table className="subject-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Avg Marks</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topStudents.map((stu, idx) => (
                    <tr key={idx}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ 
                            width: "24px", 
                            height: "24px", 
                            borderRadius: "50%", 
                            background: idx === 0 ? "#fef3c7" : "#f3f4f6", 
                            color: idx === 0 ? "#d97706" : "#4b5563",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "12px",
                            fontWeight: "bold"
                          }}>{idx + 1}</span>
                          {stu.name}
                        </div>
                      </td>
                      <td><strong>{stu.avgMarks}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">No performance data available.</p>
          )}
        </div>

        {/* Pending Activities (To-Do List) */}
        <div className="card" style={{ padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "15px" }}>
             <i className="fa fa-list-check" style={{ color: "#4a8ff7", fontSize: "20px" }}></i>
             <h3 style={{ margin: 0 }}>Pending Marks Entry</h3>
          </div>
          {loading ? (
             <p className="muted">Loading activities...</p>
          ) : stats.pendingActivities.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {stats.pendingActivities.map((act) => (
                <div key={act._id} style={{ 
                  padding: "12px", 
                  borderRadius: "8px", 
                  border: "1px solid #e5e7eb", 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center",
                  background: "#f9fafb"
                }}>
                  <div>
                    <div style={{ fontWeight: "bold" }}>{act.name}</div>
                    <div className="muted" style={{ fontSize: "12px" }}>
                      {act.subjectName} • {act.class} • {new Date(act.date).toLocaleDateString()}
                    </div>
                  </div>
                  <button 
                    className="btn btn-primary" 
                    style={{ padding: "6px 12px", fontSize: "12px" }}
                    onClick={() => navigate(`/activities/${act._id}/marks`)}
                  >
                    Add Marks
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "20px" }}>
               <i className="fa fa-check-circle" style={{ color: "#10b981", fontSize: "32px", marginBottom: "10px" }}></i>
               <p style={{ margin: 0, fontWeight: "500" }}>All caught up!</p>
               <p className="muted" style={{ fontSize: "12px" }}>No activities pending marks entry.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FacultyDashboardCharts;
