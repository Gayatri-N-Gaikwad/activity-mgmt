import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import API from "../../services/api";
import showToast from "../../utils/toast";

function AdminActivityList() {
  const [searchParams] = useSearchParams();
  const facultyId = searchParams.get("facultyId");
  const subjectId = searchParams.get("subjectId");
  const year = searchParams.get("year");
  const division = searchParams.get("division");
  const facultyName = searchParams.get("facultyName");
  const subjectName = searchParams.get("subjectName");

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadActivities = async () => {
      if (!facultyId || !subjectId) return;

      try {
        const res = await API.get("/admin/activities", {
          params: { facultyId, subjectId, year, division },
        });
        console.log("Activities loaded:", res.data.activities);
        setActivities(res.data.activities || []);
      } catch (err) {
        console.error(err);
        showToast("error", "Failed to load activities");
      } finally {
        setLoading(false);
      }
    };

    loadActivities();
  }, [facultyId, subjectId, year, division]);

  if (loading) return (
    <div className="card" style={{ padding: "40px", textAlign: "center" }}>
      <i className="fa fa-spinner fa-spin" style={{ fontSize: "24px", color: "var(--primary)" }}></i>
      <div style={{ marginTop: "16px", color: "var(--text-color)" }}>Loading activities...</div>
    </div>
  );

  return (
    <div className="card activities-card">
      <div className="activities-header" style={{ marginBottom: "24px" }}>
        <div>
          <h2>Activities Details</h2>
          <p className="muted">Viewing {activities.length} internal activities assigned for this setup.</p>
        </div>
        <Link to="/admin" className="btn btn-outline" style={{ textDecoration: "none" }}>
          <i className="fa fa-arrow-left" style={{ marginRight: "8px" }}></i> Back to Admin Dashboard
        </Link>
      </div>

      {facultyName && (
        <div style={{ marginBottom: "24px", display: "flex", gap: "16px", flexWrap: "wrap" }}>
          <div className="status-chip" style={{ background: "#f8fbff", border: "1px solid #c8d8f0" }}>
            <span className="muted" style={{ marginRight: "6px" }}>Faculty:</span>
            <strong>{decodeURIComponent(facultyName)}</strong>
          </div>
          <div className="status-chip" style={{ background: "#f8fbff", border: "1px solid #c8d8f0" }}>
            <span className="muted" style={{ marginRight: "6px" }}>Subject:</span>
            <strong>{decodeURIComponent(subjectName || '')}</strong>
          </div>
          <div className="status-chip" style={{ background: "#f8fbff", border: "1px solid #c8d8f0" }}>
            <span className="muted" style={{ marginRight: "6px" }}>Class:</span>
            <strong>{year}-{division}</strong>
          </div>
        </div>
      )}

      {activities.length === 0 ? (
        <div style={{ padding: "40px", textAlign: "center", background: "#fbfcff", borderRadius: "12px", border: "1px dashed #c8d8f0" }}>
          <i className="fa fa-folder-open muted" style={{ fontSize: "32px", marginBottom: "16px" }}></i>
          <p className="muted" style={{ fontSize: "16px" }}>No activities found for this assignment.</p>
        </div>
      ) : (
        <div className="subject-table-wrap">
          <table className="subject-table activities-table" style={{ width: "100%", textAlign: "left" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Name</th>
                <th style={{ textAlign: "left" }}>Status</th>
                <th style={{ textAlign: "left" }}>Scheduled Date</th>
                <th style={{ textAlign: "center" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((a) => (
                <tr key={a._id}>
                  <td style={{ textAlign: "left" }}>
                    <strong>{a.name || "N/A"}</strong>
                  </td>
                  <td style={{ textAlign: "left" }}>
                    <span className={`status-pill ${String(a.status || "").toLowerCase()}`}>
                      {String(a.status || "N/A").replace("_", " ")}
                    </span>
                  </td>
                  <td style={{ textAlign: "left" }}>
                    {a.scheduleDate ? (
                      <span className="status-chip">
                        <i className="fa fa-calendar-alt" style={{ marginRight: '6px', color: '#667' }}></i>
                        {new Date(a.scheduleDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        <span style={{ margin: '0 6px', color: '#ccc' }}>|</span>
                        {new Date(a.scheduleDate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    ) : (
                      <span className="status-chip not-scheduled">
                        <i className="fa fa-clock" style={{ marginRight: '6px' }}></i>
                        Not Scheduled
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <Link
                      to={`/activity/details/${a._id}`}
                      state={{ fromAdmin: true }}
                      className="btn btn-info btn-compact"
                      style={{ textDecoration: "none", display: "inline-block" }}
                    >
                      <i className="fa fa-eye" style={{ marginRight: "6px" }}></i> View Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminActivityList;
