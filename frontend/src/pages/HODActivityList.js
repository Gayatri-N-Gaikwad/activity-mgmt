import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import API from "../services/api";
import showToast from "../utils/toast";

function HODActivityList() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const facultyId = searchParams.get("facultyId");
  const subjectId = searchParams.get("subjectId");
  const year = searchParams.get("year");
  const division = searchParams.get("division");
  const facultyName = searchParams.get("facultyName");
  const subjectName = searchParams.get("subjectName");

  const [activities, setActivities] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [rubric, setRubric] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadActivities = async () => {
      if (!facultyId || !subjectId) return;

      try {
        const res = await API.get("/admin/activities", {
          params: { facultyId, subjectId, year, division },
        });
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

  const handleViewDetails = async (activityId) => {
    try {
      const res = await API.get(`/activities/${activityId}`);
      setSelectedActivity(res.data.activity);
      setRubric(res.data.rubric || []);
    } catch (err) {
      console.error("Error loading activity details:", err);
      showToast("error", "Failed to load activity details");
    }
  };

  const handleBackFromActivity = () => {
    setSelectedActivity(null);
  };

  if (loading) return (
    <div className="card" style={{ padding: "40px", textAlign: "center", margin: "24px" }}>
      <i className="fa fa-spinner fa-spin" style={{ fontSize: "24px", color: "var(--primary)" }}></i>
      <div style={{ marginTop: "16px", color: "var(--text-color)" }}>Loading activities...</div>
    </div>
  );

  if (selectedActivity) {
    // Activity Details View
    return (
      <div className="card create-activity-card" style={{ maxWidth: "800px", margin: "24px auto" }}>
        <div className="activities-header" style={{ marginBottom: "24px" }}>
          <div>
            <h2 className="form-title">{selectedActivity.name}</h2>
            <p className="form-subtitle">Detailed view of the activity configuration and status.</p>
          </div>
          <button className="btn btn-outline" onClick={handleBackFromActivity}>
            <i className="fa fa-arrow-left" style={{ marginRight: "8px" }}></i> Back
          </button>
        </div>

        <div className="create-form">
          <div className="form-row">
            <label>Description</label>
            <div style={{ padding: "12px", background: "#f8fbff", borderRadius: "8px", border: "1px solid #e8eef7" }}>
              {selectedActivity.description || "No description provided."}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginTop: "20px" }}>
            <div className="status-chip" style={{ background: "#f8fbff", border: "1px solid #c8d8f0" }}>
              <span className="muted" style={{ marginRight: "6px" }}>Status:</span>
              <span className={`status-pill ${String(selectedActivity.status || "").toLowerCase()}`}>{String(selectedActivity.status || "N/A").replace("_", " ")}</span>
            </div>
            <div className="status-chip" style={{ background: "#f8fbff", border: "1px solid #c8d8f0" }}>
              <span className="muted" style={{ marginRight: "6px" }}>Coordinator:</span>
              <strong>{selectedActivity.coordinatorId?.name || 'N/A'}</strong>
            </div>

            {selectedActivity.assignmentId && (
              <>
                <div className="status-chip" style={{ background: "#f8fbff", border: "1px solid #c8d8f0" }}>
                  <span className="muted" style={{ marginRight: "6px" }}>Class:</span>
                  <strong>
                    {selectedActivity.assignmentId?.year && selectedActivity.assignmentId?.division
                      ? `${selectedActivity.assignmentId.year}-${selectedActivity.assignmentId.division}`
                      : 'N/A'}
                  </strong>
                </div>
                <div className="status-chip" style={{ background: "#f8fbff", border: "1px solid #c8d8f0" }}>
                  <span className="muted" style={{ marginRight: "6px" }}>Subject:</span>
                  <strong>{selectedActivity.assignmentId.subjectId?.name || 'N/A'}</strong>
                </div>
              </>
            )}

            <div className="status-chip" style={{ background: "#f8fbff", border: "1px solid #c8d8f0" }}>
              <span className="muted" style={{ marginRight: "6px" }}>Scheduled Date:</span>
              <strong>
                {selectedActivity.scheduleDate ? new Date(selectedActivity.scheduleDate).toLocaleDateString("en-GB") : "Not Scheduled"}
              </strong>
            </div>

            <div className="status-chip" style={{ background: "#f8fbff", border: "1px solid #c8d8f0" }}>
              <span className="muted" style={{ marginRight: "6px" }}>Created:</span>
              <strong>
                {selectedActivity.createdAt ? new Date(selectedActivity.createdAt).toLocaleDateString("en-GB") : "N/A"}
              </strong>
            </div>
          </div>

          {selectedActivity.conductedConfirmation && (
            <div style={{ marginTop: "24px", padding: "16px", background: "#f0fceb", border: "1px solid #c3e6cb", borderRadius: "8px" }}>
              <h4 style={{ margin: "0 0 12px 0", color: "#155724" }}><i className="fa fa-check-circle" style={{ marginRight: "8px" }}></i> Conducted Confirmation</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "14px" }}>
                <div><strong>Conducted On:</strong> {new Date(selectedActivity.conductedConfirmation.confirmedAt).toLocaleString("en-GB")}</div>
                <div><strong>Confirmed By:</strong> {selectedActivity.conductedConfirmation.confirmedBy?.name || 'N/A'}</div>
                {selectedActivity.conductedConfirmation.notes && (
                  <div style={{ gridColumn: "1 / -1", marginTop: "8px" }}>
                    <strong>Notes:</strong> {selectedActivity.conductedConfirmation.notes}
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedActivity.modelAnswerFiles && selectedActivity.modelAnswerFiles.length > 0 && (
            <div style={{ marginTop: "24px" }}>
              <h3 style={{ fontSize: "16px", marginBottom: "12px", color: "#142f4f" }}>Model Answer Files</h3>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                {selectedActivity.modelAnswerFiles.map((file, index) => {
                  const displayFilename = `ModelAns_${index + 1}`;
                  const fileUrl = `http://localhost:5000${file}`;

                  return (
                    <a key={index} href={fileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
                      <i className="fa fa-file-download" style={{ marginRight: "8px", color: "var(--primary)" }}></i> {displayFilename}
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {rubric && rubric.length > 0 && (
            <div className="subject-table-wrap" style={{ marginTop: "24px" }}>
              <table className="subject-table activities-table" style={{ width: "100%", textAlign: "left" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>Rubric Criteria</th>
                    <th style={{ textAlign: "center", width: "120px" }}>Max Marks</th>
                  </tr>
                </thead>
                <tbody>
                  {rubric.map((r, index) => (
                    <tr key={index}>
                      <td style={{ textAlign: "left" }}><strong>{r.name}</strong></td>
                      <td style={{ textAlign: "center" }}><span className="status-chip">{r.maxMarks}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Activities List View
  return (
    <div className="card activities-card" style={{ margin: "24px" }}>
      <div className="activities-header" style={{ marginBottom: "24px" }}>
        <div>
          <h2>Activities Details</h2>
          <p className="muted">Viewing {activities.length} internal activities assigned for this setup.</p>
        </div>
        <button className="btn btn-outline" onClick={() => navigate('/hod')}>
          <i className="fa fa-arrow-left" style={{ marginRight: "8px" }}></i> Back to Dashboard
        </button>
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
                    <button
                      onClick={() => handleViewDetails(a._id)}
                      className="btn btn-info btn-compact"
                      style={{ textDecoration: "none", display: "inline-block" }}
                    >
                      <i className="fa fa-eye" style={{ marginRight: "6px" }}></i> View Details
                    </button>
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

export default HODActivityList;
