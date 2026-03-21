import React, { Suspense, lazy, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import showToast from "../utils/toast";

const HodDashboardCharts = lazy(() => import("./HodDashboardCharts"));

function HODDashboard() {
  const navigate = useNavigate();
  const [year, setYear] = useState(null);
  const [allocationData, setAllocationData] = useState([]); // Array of subjects with divisions as properties
  const [loading, setLoading] = useState(false);

  // Check if user is HOD
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || user.role !== "HOD") {
      showToast("error", "Access Denied: HOD only");
      navigate("/");
    }
  }, [navigate]);

  // Fetch allocation data when year is selected
  useEffect(() => {
    if (year) {
      fetchAllocationData(year);
    }
  }, [year]);

  const fetchAllocationData = async (year) => {
    try {
      setLoading(true);
      const assignmentsRes = await API.get(`/hod/assignments/${year}`);
      const allAssignments = assignmentsRes.data.data || [];

      // Group by subject with divisions as columns
      const subjectMap = new Map();

      allAssignments.forEach(assignment => {
        const subjectId = assignment.subjectId?._id;
        const subjectName = assignment.subjectId?.name || 'Unknown';
        const subjectCode = assignment.subjectId?.code || '';
        const division = assignment.division;
        const facultyName = assignment.facultyId?.name || 'Not Assigned';
        const facultyId = assignment.facultyId?._id;

        // Initialize subject if not exists
        if (!subjectMap.has(subjectId)) {
          subjectMap.set(subjectId, {
            subjectId: subjectId,
            subjectName: subjectName,
            subjectCode: subjectCode,
            div9: null,
            div10: null,
            div11: null,
            div9Info: null,
            div10Info: null,
            div11Info: null
          });
        }

        const subjectData = subjectMap.get(subjectId);

        // Match divisions: "09", "9", etc.
        if (division === '09' || division === '9' || division.toLowerCase().includes('9')) {
          subjectData.div9 = facultyName;
          subjectData.div9Info = { facultyId, division };
        } else if (division === '10' || division.toLowerCase().includes('10')) {
          subjectData.div10 = facultyName;
          subjectData.div10Info = { facultyId, division };
        } else if (division === '11' || division.toLowerCase().includes('11')) {
          subjectData.div11 = facultyName;
          subjectData.div11Info = { facultyId, division };
        }
      });

      setAllocationData(Array.from(subjectMap.values()));
    } catch (err) {
      console.error("Error fetching allocation data:", err);
      showToast("error", "Failed to load allocation data");
    } finally {
      setLoading(false);
    }
  };

  const handleFacultyClick = (facultyName, subjectId, subjectName, facultyId, division, year) => {
    if (!facultyName || facultyName === '-') return;

    navigate(`/hod/activities?facultyId=${facultyId}&subjectId=${subjectId}&year=${year}&division=${division}&facultyName=${encodeURIComponent(facultyName)}&subjectName=${encodeURIComponent(subjectName)}`);
  };

  const getYearLabel = () => {
    switch (year) {
      case 'SY': return 'Second Year';
      case 'TE': return 'Third Year';
      case 'BE': return 'Fourth Year';
      default: return year;
    }
  };

  return (
    <div className="admin-dashboard-page" style={{ padding: "0 24px" }}>
      <div className="marquee-container" style={{ margin: "0 0 24px 0" }}>
        <div className="marquee-text">
          🚀 Welcome to the <span className="marquee-highlight">HOD Dashboard</span>! Quickly view subject allocations, track faculty assignments, and monitor activities across all academic years seamlessly. ⚙️
        </div>
      </div>

      <div className="admin-layout">
        <div className="admin-content-area">
          <div className="card" style={{ padding: "24px" }}>
            {!year ? (
              <>
              <div className="activities-header" style={{ marginBottom: "24px" }}>
                <div>
                  <h2 style={{ marginTop: 0 }}>Subject Allocations</h2>
                  <p className="muted">Select an academic year to view mapped assignments and track activities.</p>
                </div>
              </div>

              <div style={{ display: "flex", gap: "16px", marginTop: "24px", flexWrap: "wrap" }}>
                <button
                  className="btn btn-outline"
                  style={{ flex: "1 1 auto", padding: "24px", fontSize: "16px", borderRadius: "12px" }}
                  onClick={() => setYear('SY')}
                >
                  <i className="fa fa-users-class" style={{ fontSize: "24px", display: "block", marginBottom: "12px", color: "var(--primary)" }}></i>
                  <strong>Second Year</strong> (SY)
                </button>
                <button
                  className="btn btn-outline"
                  style={{ flex: "1 1 auto", padding: "24px", fontSize: "16px", borderRadius: "12px" }}
                  onClick={() => setYear('TE')}
                >
                  <i className="fa fa-users-class" style={{ fontSize: "24px", display: "block", marginBottom: "12px", color: "var(--primary)" }}></i>
                  <strong>Third Year</strong> (TE)
                </button>
                <button
                  className="btn btn-outline"
                  style={{ flex: "1 1 auto", padding: "24px", fontSize: "16px", borderRadius: "12px" }}
                  onClick={() => setYear('BE')}
                >
                  <i className="fa fa-users-class" style={{ fontSize: "24px", display: "block", marginBottom: "12px", color: "var(--primary)" }}></i>
                  <strong>Fourth Year</strong> (BE)
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="activities-header" style={{ marginBottom: "24px" }}>
                <div>
                  <h2 style={{ marginTop: 0 }}>{getYearLabel()} Assignments</h2>
                  <p className="muted">Click on an assigned faculty to view details and activities across divisions.</p>
                </div>
                <button
                  className="btn btn-outline"
                  onClick={() => setYear(null)}
                  style={{ padding: "8px 16px" }}
                >
                  <i className="fa fa-arrow-left" style={{ marginRight: "8px" }}></i> Back
                </button>
              </div>

              {loading ? (
                <div style={{ padding: "40px", textAlign: "center" }}>
                  <i className="fa fa-spinner fa-spin" style={{ fontSize: "24px", color: "var(--primary)" }}></i>
                  <div style={{ marginTop: "16px", color: "var(--text-color)" }}>Loading allocations...</div>
                </div>
              ) : allocationData.length === 0 ? (
                <div style={{ padding: "40px", textAlign: "center", background: "#fbfcff", borderRadius: "12px", border: "1px dashed #c8d8f0" }}>
                  <i className="fa fa-folder-open muted" style={{ fontSize: "32px", marginBottom: "16px" }}></i>
                  <p className="muted" style={{ fontSize: "16px" }}>No subjects allocated for {getYearLabel()} yet.</p>
                </div>
              ) : (
                <div className="subject-table-wrap">
                  <table className="subject-table activities-table" style={{ width: "100%", textAlign: "left" }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: "left" }}>Subject</th>
                        <th style={{ textAlign: "left" }}>Div 9</th>
                        <th style={{ textAlign: "left" }}>Div 10</th>
                        <th style={{ textAlign: "left" }}>Div 11</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allocationData.map((item) => (
                        <tr key={item.subjectId}>
                          <td style={{ textAlign: "left" }}>
                            <strong>{item.subjectName}</strong>
                            <div className="muted" style={{ fontSize: "13px", marginTop: "4px" }}>{item.subjectCode}</div>
                          </td>
                          <td
                            style={{
                              cursor: item.div9 && item.div9 !== '-' ? 'pointer' : 'default',
                              textAlign: "left"
                            }}
                            onClick={() => item.div9 && item.div9 !== '-' && item.div9Info && handleFacultyClick(
                              item.div9, item.subjectId, item.subjectName, item.div9Info.facultyId, item.div9Info.division, year
                            )}
                          >
                            {item.div9 && item.div9 !== '-' ? (
                              <span className="status-chip" style={{ background: "#f8fbff", border: "1px solid #c8d8f0", color: "#1d5fa8", fontWeight: "600", padding: "6px 12px" }}>
                                <i className="fa fa-user" style={{ marginRight: "6px" }}></i> {item.div9}
                              </span>
                            ) : (
                              <span className="muted">-</span>
                            )}
                          </td>
                          <td
                            style={{
                              cursor: item.div10 && item.div10 !== '-' ? 'pointer' : 'default',
                              textAlign: "left"
                            }}
                            onClick={() => item.div10 && item.div10 !== '-' && item.div10Info && handleFacultyClick(
                              item.div10, item.subjectId, item.subjectName, item.div10Info.facultyId, item.div10Info.division, year
                            )}
                          >
                            {item.div10 && item.div10 !== '-' ? (
                              <span className="status-chip" style={{ background: "#f8fbff", border: "1px solid #c8d8f0", color: "#1d5fa8", fontWeight: "600", padding: "6px 12px" }}>
                                <i className="fa fa-user" style={{ marginRight: "6px" }}></i> {item.div10}
                              </span>
                            ) : (
                              <span className="muted">-</span>
                            )}
                          </td>
                          <td
                            style={{
                              cursor: item.div11 && item.div11 !== '-' ? 'pointer' : 'default',
                              textAlign: "left"
                            }}
                            onClick={() => item.div11 && item.div11 !== '-' && item.div11Info && handleFacultyClick(
                              item.div11, item.subjectId, item.subjectName, item.div11Info.facultyId, item.div11Info.division, year
                            )}
                          >
                            {item.div11 && item.div11 !== '-' ? (
                              <span className="status-chip" style={{ background: "#f8fbff", border: "1px solid #c8d8f0", color: "#1d5fa8", fontWeight: "600", padding: "6px 12px" }}>
                                <i className="fa fa-user" style={{ marginRight: "6px" }}></i> {item.div11}
                              </span>
                            ) : (
                              <span className="muted">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              </>
            )}
          </div>

          <Suspense fallback={<div className="card" style={{ marginTop: 20 }}>Loading analytics...</div>}>
            <HodDashboardCharts />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

export default HODDashboard;
