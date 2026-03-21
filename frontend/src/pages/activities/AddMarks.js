import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../../services/api";
import showToast from "../../utils/toast";

function AddMarks() {
  const { activityId } = useParams();
  const navigate = useNavigate();
  const [activity, setActivity] = useState(null);
  const [students, setStudents] = useState([]);
  const [marksData, setMarksData] = useState({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch activity with rubric
        const resAct = await API.get(`/activities/${activityId}`);
        const activityDetails = resAct.data.activity;
        const rubric = resAct.data.rubric || [];

        if (!activityDetails) {
          showToast("error", "Activity not found");
          setLoading(false);
          return;
        }

        console.log("Activity details:", activityDetails);

        if (!activityDetails.assignmentId) {
          console.error("Activity missing assignmentId:", activityDetails);
          showToast("error", "Activity is missing assignment information");
          setLoading(false);
          return;
        }

        setActivity({ ...activityDetails, rubric });

        // Fetch assignment to get classId and subjectId
        const assignmentId =
          activityDetails.assignmentId?._id || activityDetails.assignmentId;

        const resAssign = await API.get(`/teaching-assignment/${assignmentId}`);
        const assignment = resAssign.data.assignment;

        console.log("Assignment response:", resAssign.data);

        if (!assignment) {
          console.error(
            "Assignment not found for assignmentId:",
            activityDetails.assignmentId,
          );
          showToast("error", "Teaching assignment not found");
          setLoading(false);
          return;
        }

        // Extract IDs - assignment has year, division (no classId)
        const subjId = assignment.subjectId?._id || assignment.subjectId;
        const year = assignment.year;
        const division = assignment.division;

        console.log("Assignment data:", assignment);

        if (!subjId || !year || !division) {
          console.error("Missing IDs - Subject:", subjId, "Year:", year, "Division:", division);
          showToast("error", "Subject or class (year/division) not found");
          setLoading(false);
          return;
        }

        // Fetch students by year and division
        const resStudents = await API.get(`/students/by-year-division/${year}/${division}`);
        const studentsList = resStudents.data?.students || [];

        console.log("Fetched students:", studentsList.length, studentsList);

        if (studentsList.length === 0) {
          console.warn("No students found for", year, division);
          showToast("warning", "No students found for this class");
        }

        setStudents(studentsList);

        // Fetch existing marks
        const resMarks = await API.get(`/marks/activity/${activityId}`);
        const existingMarks = resMarks.data.marks || [];

        // Initialize marksData for all students
        const initialMarks = {};
        studentsList.forEach((student) => {
          const existing = existingMarks.find(
            (m) => String(m.studentId?._id || m.studentId) === String(student._id),
          );
          const existingActivity = existing?.activities.find(
            (a) => String(a.activityId?._id || a.activityId) === String(activityId),
          );

          initialMarks[student._id] = {
            rubricMarks: rubric.map((r) => {
              const existingMark = existingActivity?.rubricMarks.find(
                (rm) => String(rm.criteriaId?._id || rm.criteriaId) === String(r._id),
              );
              return {
                criteriaId: r._id,
                name: r.name,
                maxMarks: r.maxMarks,
                marks: existingMark?.marks ?? "",
              };
            }),
            attendance: existingActivity?.attendance || "Present",
            exists: !!existing,
            id: existing?._id,
          };
        });

        setMarksData(initialMarks);
        setLoading(false);
      } catch (err) {
        console.error(err);
        showToast("error", "Failed to load activity or students");
        setLoading(false);
      }
    };

    fetchData();
  }, [activityId]);

  const handleExcelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith(".xlsx")) {
      showToast("error", "Please upload a valid .xlsx file");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploading(true);

      const res = await API.post(
        `/marks/activity/${activityId}/upload`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      showToast("success", res.data.message || "Marks uploaded successfully");

      // 🔁 Refresh page data after upload
      window.location.reload();
    } catch (err) {
      if (err.response?.data?.errors) {
        showToast("error", err.response.data.errors.slice(0, 3).join("\n"));
      } else {
        showToast("error", err.response?.data?.error || "Upload failed");
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!activity) return <div>Activity not found</div>;

  return (
    <div className="create-activity-page">
      <div className="create-activity-card" style={{ maxWidth: "1000px" }}>
        <div className="form-brand">Add Marks</div>
        <h2 className="form-title">Marks for: {activity.name}</h2>
        <div style={{ marginBottom: 24, display: "flex", gap: "12px", alignItems: "center" }}>
          <input
            type="file"
            accept=".xlsx"
            id="marksExcelInput"
            style={{ display: "none" }}
            onChange={handleExcelUpload}
          />

          <button
            className="btn btn-info"
            disabled={uploading}
            onClick={() => document.getElementById("marksExcelInput").click()}
          >
            <i className="fa fa-upload" style={{ marginRight: 8 }}></i>
            {uploading ? "Uploading..." : "Upload Marks (Excel)"}
          </button>

          <a
            href={`${API.defaults.baseURL}/marks/activity/${activityId}/template`}
            className="btn btn-outline"
            target="_blank"
            rel="noopener noreferrer"
          >
            <i className="fa fa-download" style={{ marginRight: 8 }}></i>
            Download Editable Template
          </a>
        </div>

        <div className="status-alert status-alert-info" style={{ marginBottom: "16px" }}>
          Download the sheet, edit marks there, and re-upload it to update existing values. The table below is read-only.
        </div>
        {activity.rubric.length === 0 && (
          <div className="status-alert status-alert-warn" style={{ marginBottom: "16px" }}>
            No rubric criteria are configured for this activity. Excel upload will save attendance only until rubric or mark subdivisions are added.
          </div>
        )}

        {students.length === 0 ? (
          <p className="muted" style={{ padding: "20px", textAlign: "center", background: "#f8fbff", borderRadius: "8px" }}>No students enrolled for this activity.</p>
        ) : (
          <div className="subject-table-wrap">
            <table className="subject-table" style={{ width: "100%", minWidth: "auto" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Student</th>
                  {activity.rubric.map((r) => (
                    <th key={r._id}>
                      {r.name} <div className="muted" style={{ fontSize: "12px", fontWeight: "normal" }}>(out of {r.maxMarks})</div>
                    </th>
                  ))}
                  <th>Attendance</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const data = marksData[student._id];
                  if (!data) return null;

                  return (
                    <tr key={student._id}>
                      <td style={{ textAlign: "left" }}>
                        <strong>{student.name}</strong> <span className="muted" style={{ fontSize: "13px" }}>({student.rollNumber})</span>
                      </td>
                      {data.rubricMarks.map((r, idx) => (
                        <td key={r.criteriaId}>
                          <div
                            style={{
                              width: 80,
                              padding: "8px",
                              margin: "0 auto",
                              display: "block",
                              textAlign: "center",
                              borderRadius: "6px",
                              border: "1px solid #dbe4f1",
                              background: "#f8fbff",
                              color: data.attendance === "Absent" ? "#9ca3af" : "#111827",
                              minHeight: "38px",
                            }}
                          >
                            {r.marks === "" || r.marks === null || r.marks === undefined ? "" : r.marks}
                          </div>
                        </td>
                      ))}
                      <td>
                        <div
                          className="status-select"
                          style={{
                            margin: "0 auto",
                            display: "block",
                            textAlign: "center",
                            background: data.attendance === "Present" ? "#e8f9ef" : "#fce8e8",
                            color: data.attendance === "Present" ? "#147a4c" : "#c9404d",
                            border: "none",
                            fontWeight: "bold",
                            padding: "8px 12px",
                            borderRadius: "8px",
                            minWidth: "88px"
                          }}
                        >
                          {data.attendance}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="form-actions" style={{ marginTop: 24, display: "flex", gap: "12px" }}>
          <button
            className="btn btn-outline"
            onClick={() => navigate("/activities")}
            style={{ padding: "10px 20px" }}
          >
            Back to Activities
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddMarks;
