import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import API from "../../services/api";
import showToast from "../../utils/toast";

function ActivityDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [activity, setActivity] = useState(null);
  const [rubric, setRubric] = useState([]);
  const [loading, setLoading] = useState(true);

  // Check if coming from admin activities
  const fromAdmin = location.state?.fromAdmin;

  useEffect(() => {
    const loadActivity = async () => {
      try {
        const res = await API.get(`/activities/${id}`);
        setActivity(res.data.activity);
        setRubric(res.data.rubric || []);
      } catch (err) {
        console.error("Error loading activity:", err);
        showToast("error", "Failed to load activity details");
      } finally {
        setLoading(false);
      }
    };

    loadActivity();
  }, [id]);

  if (loading) {
    return <div className="card">Loading activity details...</div>;
  }

  if (!activity) {
    return <div className="card">Activity not found</div>;
  }

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2>{activity.name}</h2>
        <button 
          onClick={() => navigate(-1)} 
          className="btn btn-secondary"
        >
          <i className="fa fa-arrow-left" style={{ marginRight: 8 }}></i>
          {fromAdmin ? 'Back to Activities' : 'Back to Activities'}
        </button>
      </div>

      <div style={{ marginBottom: 24 }}>
        <h3>Description</h3>
        <p>{activity.description}</p>
      </div>

      <div style={{ marginBottom: 24 }}>
        <h3>Details</h3>
        <table style={{ width: "100%" }}>
          <tbody>
            <tr>
              <td style={{ fontWeight: "bold", padding: "8px 0" }}>Status:</td>
              <td style={{ padding: "8px 0" }}>{activity.status}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: "bold", padding: "8px 0" }}>Coordinator:</td>
              <td style={{ padding: "8px 0" }}>{activity.coordinatorId?.name || 'N/A'}</td>
            </tr>
            {activity.assignmentId && (
              <>
                <tr>
                  <td style={{ fontWeight: "bold", padding: "8px 0" }}>Class:</td>
                  <td style={{ padding: "8px 0" }}>
                    {activity.assignmentId?.year && activity.assignmentId?.division
                      ? `${activity.assignmentId.year}-${activity.assignmentId.division}`
                      : 'N/A'}
                  </td>
                </tr>
                <tr>
                  <td style={{ fontWeight: "bold", padding: "8px 0" }}>Subject:</td>
                  <td style={{ padding: "8px 0" }}>{activity.assignmentId.subjectId?.name || 'N/A'}</td>
                </tr>
              </>
            )}
            <tr>
              <td style={{ fontWeight: "bold", padding: "8px 0" }}>Scheduled Date:</td>
              <td style={{ padding: "8px 0" }}>
                {activity.scheduleDate
                  ? new Date(activity.scheduleDate).toLocaleString("en-GB", {
                      timeZone: "Asia/Kolkata",
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Not Scheduled"}
              </td>
            </tr>
            <tr>
              <td style={{ fontWeight: "bold", padding: "8px 0" }}>Created:</td>
              <td style={{ padding: "8px 0" }}>
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
                  <td style={{ fontWeight: "bold", padding: "8px 0" }}>Conducted On:</td>
                  <td style={{ padding: "8px 0" }}>
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
                  <td style={{ fontWeight: "bold", padding: "8px 0" }}>Conducted By:</td>
                  <td style={{ padding: "8px 0" }}>{activity.conductedConfirmation.confirmedBy?.name || 'N/A'}</td>
                </tr>
                {activity.conductedConfirmation.notes && (
                  <tr>
                    <td style={{ fontWeight: "bold", padding: "8px 0" }}>Conducted Notes:</td>
                    <td style={{ padding: "8px 0" }}>{activity.conductedConfirmation.notes}</td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>

      {activity.modelAnswerFiles && activity.modelAnswerFiles.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3>Model Answer Files</h3>
          <div>
            {activity.modelAnswerFiles.map((file, index) => {
              const originalFilename = file.split('/').pop() || `File ${index + 1}`;
              const fileExtension = originalFilename.split('.').pop() || '';
              const displayFilename = `ModelAns.${fileExtension}`;
              const fileUrl = `http://localhost:5000${file}`;
              const isPDF = originalFilename.toLowerCase().endsWith('.pdf');
              const isImage = /\.(jpg|jpeg|png|gif)$/i.test(originalFilename);

              return (
                <div key={index} style={{ marginBottom: 16 }}>
                  <h4>{displayFilename}</h4>
                  
                  {isPDF && (
                    <div style={{ marginBottom: 8 }}>
                      <iframe
                        src={fileUrl}
                        width="100%"
                        height="600px"
                        style={{ border: '1px solid #ccc' }}
                        title={`Model Answer ${index + 1}`}
                      />
                    </div>
                  )}
                  
                  {isImage && (
                    <div style={{ marginBottom: 8 }}>
                      <img
                        src={fileUrl}
                        alt={`Model Answer ${index + 1}`}
                        style={{ maxWidth: '100%', height: 'auto', border: '1px solid #ccc' }}
                      />
                    </div>
                  )}
                  
                  <a
                    href={fileUrl}
                    download
                    className="btn btn-info"
                    style={{ marginRight: 8 }}
                  >
                    <i className="fa fa-download" style={{ marginRight: 6 }}></i>
                    Download {displayFilename}
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
          <table>
            <thead>
              <tr>
                <th>Criteria</th>
                <th>Max Marks</th>
              </tr>
            </thead>
            <tbody>
              {rubric.map((r, index) => (
                <tr key={index}>
                  <td>{r.name}</td>
                  <td>{r.maxMarks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ActivityDetails;