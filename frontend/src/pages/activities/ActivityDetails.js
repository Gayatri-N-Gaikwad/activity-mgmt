import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../../services/api";
import showToast from "../../utils/toast";

function ActivityDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activity, setActivity] = useState(null);
  const [rubric, setRubric] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markSubdivisions, setMarkSubdivisions] = useState([]);

  useEffect(() => {
    const loadActivity = async () => {
      try {
        const res = await API.get(`/activities/${id}`);
        setActivity(res.data.activity);
        setRubric(res.data.rubric || []);

        const subsRes = await API.get(`/activities/${id}/mark-subdivisions`);
        console.log("Mark Subdivisions:", subsRes.data);  // <--- add this
        setMarkSubdivisions(subsRes.data || []);

      } catch (err) {
        console.error("Error loading activity:", err);
        showToast("error", "Failed to load activity details");
      } finally {
        setLoading(false);
      }
    };

    loadActivity();
  }, [id]);

  const totalMarks = markSubdivisions.reduce(
    (sum, m) => sum + (m.maxMarks || 0),
    0
  );

  if (loading) {
    return <div className="card">Loading activity details...</div>;
  }

  if (!activity) {
    return <div className="card">Activity not found</div>;
  }

  return (
    <div className="details-page-wrap">
      <div className="details-card">
        <div className="details-header">
          <h2>{activity.name}</h2>
          <button onClick={() => navigate(-1)} className="btn btn-outline">
            <i className="fa fa-arrow-left" style={{ marginRight: 8 }}></i>
            Back to Activities
          </button>
        </div>

        <div style={{ marginBottom: 24 }}>
          <h3>Description</h3>
          <p>{activity.description}</p>
        </div>

        <div style={{ marginBottom: 24 }}>
          <h3>Details</h3>
          <div className="subject-table-wrap">
            <table className="subject-table" style={{ width: "100%", minWidth: "auto", textAlign: "left" }}>
              <tbody>
                <tr>
                  <td style={{ fontWeight: "600", padding: "12px 16px", width: "30%", textAlign: "left" }}>Status:</td>
                  <td style={{ padding: "12px 16px", textAlign: "left" }}><span className={`status-pill ${String(activity.status || "").toLowerCase()}`}>{String(activity.status || "").replace("_", " ")}</span></td>
                </tr>
                <tr>
                  <td style={{ fontWeight: "600", padding: "12px 16px", textAlign: "left" }}>Coordinator:</td>
                  <td style={{ padding: "12px 16px", textAlign: "left" }}>{activity.coordinatorId?.name || "N/A"}</td>
                </tr>
                {activity.assignmentId && (
                  <>
                    <tr>
                      <td style={{ fontWeight: "600", padding: "12px 16px", textAlign: "left" }}>Class:</td>
                      <td style={{ padding: "12px 16px", textAlign: "left" }}>
                        {activity.assignmentId?.year && activity.assignmentId?.division
                          ? `${activity.assignmentId.year}-${activity.assignmentId.division}`
                          : "N/A"}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: "600", padding: "12px 16px", textAlign: "left" }}>Subject:</td>
                      <td style={{ padding: "12px 16px", textAlign: "left" }}>{activity.assignmentId.subjectId?.name || "N/A"}</td>
                    </tr>
                  </>
                )}
                <tr>
                  <td style={{ fontWeight: "600", padding: "12px 16px", textAlign: "left" }}>Scheduled Date:</td>
                  <td style={{ padding: "12px 16px", textAlign: "left" }}>
                    {activity.scheduleDate
                      ? new Date(activity.scheduleDate).toLocaleString("en-GB", {
                        timeZone: "Asia/Kolkata",
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                      : <span className="not-scheduled">Not Scheduled</span>}
                  </td>
                </tr>
                <tr>
                  <td style={{ fontWeight: "600", padding: "12px 16px", textAlign: "left" }}>Created:</td>
                  <td style={{ padding: "12px 16px", textAlign: "left" }}>
                    {activity.createdAt
                      ? new Date(activity.createdAt).toLocaleString("en-GB", {
                        timeZone: "Asia/Kolkata",
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                      : "N/A"}
                  </td>
                </tr>
                {activity.conductedConfirmation && (
                  <>
                    <tr>
                      <td style={{ fontWeight: "600", padding: "12px 16px", textAlign: "left" }}>Conducted On:</td>
                      <td style={{ padding: "12px 16px", textAlign: "left" }}>
                        {new Date(activity.conductedConfirmation.confirmedAt).toLocaleString("en-GB", {
                          timeZone: "Asia/Kolkata",
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: "600", padding: "12px 16px", textAlign: "left" }}>Conducted By:</td>
                      <td style={{ padding: "12px 16px", textAlign: "left" }}>{activity.conductedConfirmation.confirmedBy?.name || "N/A"}</td>
                    </tr>
                    {activity.conductedConfirmation.notes && (
                      <tr>
                        <td style={{ fontWeight: "600", padding: "12px 16px", textAlign: "left" }}>Conducted Notes:</td>
                        <td style={{ padding: "12px 16px", textAlign: "left" }}>{activity.conductedConfirmation.notes}</td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {activity.modelAnswerFiles && activity.modelAnswerFiles.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <h3>Model Answer Files</h3>
            <div style={{ display: "grid", gap: "16px" }}>
              {activity.modelAnswerFiles.map((file, index) => {
                const originalFilename = file.split("/").pop() || `File ${index + 1}`;
                const fileExtension = originalFilename.split(".").pop() || "";
                const displayFilename = `ModelAns.${fileExtension}`;
                const fileUrl = `http://localhost:5000${file}`;
                const isPDF = originalFilename.toLowerCase().endsWith(".pdf");
                const isImage = /\.(jpg|jpeg|png|gif)$/i.test(originalFilename);

                return (
                  <div key={index} className="card" style={{ padding: "16px", border: "1px solid #e4eaf3", boxShadow: "none" }}>
                    <h4 style={{ marginTop: 0, color: "#1a3d63" }}>{displayFilename}</h4>

                    {isPDF && (
                      <div style={{ marginBottom: 12 }}>
                        <iframe src={fileUrl} width="100%" height="400px" style={{ border: "1px solid #dbe4f1", borderRadius: "8px" }} title={`Model Answer ${index + 1}`} />
                      </div>
                    )}

                    {isImage && (
                      <div style={{ marginBottom: 12 }}>
                        <img src={fileUrl} alt={`Model Answer ${index + 1}`} style={{ maxWidth: "100%", height: "auto", border: "1px solid #dbe4f1", borderRadius: "8px" }} />
                      </div>
                    )}

                    <a href={fileUrl} download className="btn btn-info" style={{ display: "inline-flex", alignItems: "center" }}>
                      <i className="fa fa-download" style={{ marginRight: 8 }}></i> Download {displayFilename}
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {rubric && rubric.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <h3>Rubric</h3>
            <div className="subject-table-wrap">
              <table className="subject-table" style={{ width: "100%", minWidth: "auto", textAlign: "left" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>Criteria</th>
                    <th style={{ textAlign: "left", width: "20%" }}>Max Marks</th>
                  </tr>
                </thead>
                <tbody>
                  {rubric.map((r, index) => (
                    <tr key={index}>
                      <td style={{ textAlign: "left" }}>{r.name}</td>
                      <td style={{ textAlign: "left" }}><strong>{r.maxMarks}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {markSubdivisions.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <h3>
              Marks Distribution <span className="muted" style={{ fontSize: 14, fontWeight: "normal" }}>(Total: {totalMarks})</span>
            </h3>

            <div className="subject-table-wrap">
              <table className="subject-table" style={{ width: "100%", minWidth: "auto", textAlign: "left" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>Component</th>
                    <th style={{ textAlign: "left", width: "20%" }}>Max Marks</th>
                  </tr>
                </thead>
                <tbody>
                  {markSubdivisions.map((m) => (
                    <tr key={m._id}>
                      <td style={{ textAlign: "left" }}>{m.title}</td>
                      <td style={{ textAlign: "left" }}><strong>{m.maxMarks}</strong></td>
                    </tr>
                  ))}

                  {/* Total row */}
                  <tr style={{ background: "#f8fbff" }}>
                    <td style={{ textAlign: "left", fontWeight: "bold" }}>Total</td>
                    <td style={{ textAlign: "left", fontWeight: "bold", color: "#145ab8" }}>{totalMarks}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <small className="muted" style={{ display: "block", marginTop: "8px" }}>
              Marks breakdown is for transparency only.
            </small>
          </div>
        )}
      </div>
    </div>
  );
}

export default ActivityDetails;
