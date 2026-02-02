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

  if (loading) return <div style={{ padding: "20px" }}>Loading activities...</div>;

  if (selectedActivity) {
    // Activity Details View
    return (
      <div style={{ padding: "20px" }}>
        <button 
          onClick={handleBackFromActivity}
          style={{
            padding: "8px 16px",
            marginBottom: "20px",
            cursor: "pointer"
          }}
        >
          ← Back to Activities
        </button>

        <h2>{selectedActivity.name}</h2>

        <div style={{ marginTop: "20px" }}>
          <h3>Description</h3>
          <p>{selectedActivity.description}</p>
        </div>

        <div style={{ marginTop: "20px" }}>
          <h3>Details</h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr style={{ borderBottom: "1px solid #ddd" }}>
                <td style={{ fontWeight: "bold", padding: "8px 0", width: "200px" }}>Status:</td>
                <td style={{ padding: "8px 0" }}>{selectedActivity.status}</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #ddd" }}>
                <td style={{ fontWeight: "bold", padding: "8px 0" }}>Coordinator:</td>
                <td style={{ padding: "8px 0" }}>{selectedActivity.coordinatorId?.name || 'N/A'}</td>
              </tr>
              {selectedActivity.assignmentId && (
                <>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ fontWeight: "bold", padding: "8px 0" }}>Class:</td>
                    <td style={{ padding: "8px 0" }}>
                      {selectedActivity.assignmentId?.year && selectedActivity.assignmentId?.division
                        ? `${selectedActivity.assignmentId.year}-${selectedActivity.assignmentId.division}`
                        : 'N/A'}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ fontWeight: "bold", padding: "8px 0" }}>Subject:</td>
                    <td style={{ padding: "8px 0" }}>{selectedActivity.assignmentId.subjectId?.name || 'N/A'}</td>
                  </tr>
                </>
              )}
              <tr style={{ borderBottom: "1px solid #ddd" }}>
                <td style={{ fontWeight: "bold", padding: "8px 0" }}>Scheduled Date:</td>
                <td style={{ padding: "8px 0" }}>
                  {selectedActivity.scheduleDate
                    ? new Date(selectedActivity.scheduleDate).toLocaleString("en-GB")
                    : "Not Scheduled"}
                </td>
              </tr>
              <tr style={{ borderBottom: "1px solid #ddd" }}>
                <td style={{ fontWeight: "bold", padding: "8px 0" }}>Created:</td>
                <td style={{ padding: "8px 0" }}>
                  {selectedActivity.createdAt
                    ? new Date(selectedActivity.createdAt).toLocaleString("en-GB")
                    : "N/A"}
                </td>
              </tr>
              {selectedActivity.conductedConfirmation && (
                <>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ fontWeight: "bold", padding: "8px 0" }}>Conducted On:</td>
                    <td style={{ padding: "8px 0" }}>
                      {new Date(selectedActivity.conductedConfirmation.confirmedAt).toLocaleString("en-GB")}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ fontWeight: "bold", padding: "8px 0" }}>Conducted By:</td>
                    <td style={{ padding: "8px 0" }}>{selectedActivity.conductedConfirmation.confirmedBy?.name || 'N/A'}</td>
                  </tr>
                  {selectedActivity.conductedConfirmation.notes && (
                    <tr style={{ borderBottom: "1px solid #ddd" }}>
                      <td style={{ fontWeight: "bold", padding: "8px 0" }}>Conducted Notes:</td>
                      <td style={{ padding: "8px 0" }}>{selectedActivity.conductedConfirmation.notes}</td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>

        {selectedActivity.modelAnswerFiles && selectedActivity.modelAnswerFiles.length > 0 && (
          <div style={{ marginTop: "20px" }}>
            <h3>Model Answer Files</h3>
            <div>
              {selectedActivity.modelAnswerFiles.map((file, index) => {
                const originalFilename = file.split('/').pop() || `File ${index + 1}`;
                const fileExtension = originalFilename.split('.').pop() || '';
                const displayFilename = `ModelAns.${fileExtension}`;
                const fileUrl = `http://localhost:5000${file}`;

                return (
                  <div key={index} style={{ marginBottom: "10px" }}>
                    <strong>{displayFilename}</strong>
                    <div style={{ marginTop: "5px" }}>
                      <a href={fileUrl} target="_blank" rel="noopener noreferrer" style={{ marginRight: "10px" }}>
                        View in New Tab
                      </a>
                      <a href={fileUrl} download={displayFilename}>
                        Download
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {rubric && rubric.length > 0 && (
          <div style={{ marginTop: "20px" }}>
            <h3>Rubric</h3>
            <table border="1" cellPadding="8" style={{ width: "100%" }}>
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

  // Activities List View
  return (
    <div style={{ padding: "20px" }}>
      <button 
        onClick={() => navigate('/hod')}
        style={{
          padding: "8px 16px",
          marginBottom: "20px",
          cursor: "pointer"
        }}
      >
        ← Back to Dashboard
      </button>

      <h2>Activities ({activities.length})</h2>
      
      {facultyName && (
        <div style={{ marginBottom: "20px" }}>
          <p><strong>Faculty:</strong> {decodeURIComponent(facultyName)}</p>
          <p><strong>Subject:</strong> {decodeURIComponent(subjectName || '')}</p>
          <p><strong>Class:</strong> {year}-{division}</p>
        </div>
      )}

      {activities.length === 0 ? (
        <p>No activities found.</p>
      ) : (
        <table border="1" cellPadding="8" style={{ marginTop: "20px", width: "100%" }}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Scheduled Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {activities.map((a) => (
              <tr key={a._id}>
                <td>{a.name || "N/A"}</td>
                <td>{a.status || "N/A"}</td>
                <td>
                  {a.scheduleDate
                    ? new Date(a.scheduleDate).toLocaleString("en-GB")
                    : "Not Scheduled"}
                </td>
                <td>
                  <button 
                    onClick={() => handleViewDetails(a._id)}
                    style={{
                      padding: "6px 12px",
                      backgroundColor: "#17a2b8",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer"
                    }}
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default HODActivityList;
