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
  const [saving, setSaving] = useState(false);
  const [manualEdits, setManualEdits] = useState(new Set()); // studentIds that have been manually touched

  const toRollNumber = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  };

  const fetchData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      // Fetch activity with rubric
      const resAct = await API.get(`/activities/${activityId}`);
      const activityDetails = resAct.data.activity;
      const rubric = resAct.data.rubric || [];

      if (!activityDetails) {
        showToast("error", "Activity not found");
        if (showLoading) setLoading(false);
        return;
      }

      setActivity({ ...activityDetails, rubric });

      // Fetch assignment to get classId and subjectId
      const assignmentId =
        activityDetails.assignmentId?._id || activityDetails.assignmentId;

      const resAssign = await API.get(`/teaching-assignment/${assignmentId}`);
      const assignment = resAssign.data.assignment;

      if (!assignment) {
        showToast("error", "Teaching assignment not found");
        if (showLoading) setLoading(false);
        return;
      }

      const year = assignment.year;
      const division = assignment.division;

      // Fetch students by year and division
      const resStudents = await API.get(`/students/by-year-division/${year}/${division}`);
      const studentsList = [...(resStudents.data?.students || [])].sort(
        (a, b) => toRollNumber(a.rollNumber) - toRollNumber(b.rollNumber)
      );

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
          originallyAbsent: (existingActivity?.attendance || "Present") === "Absent",
          attendance: existingActivity?.attendance || "Present",
          exists: !!existing,
          id: existing?._id,
        };
      });

      setMarksData(initialMarks);
      if (showLoading) setLoading(false);
    } catch (err) {
      console.error(err);
      showToast("error", "Failed to load data");
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activityId]);

 
  const handleToggleAttendance = (studentId) => {
    setMarksData((prev) => {
      const current = prev[studentId];
      if (!current.originallyAbsent) return prev; // Only toggle if originally absent

      const newAttendance = current.attendance === "Absent" ? "Present" : "Absent";
      
      const newRubricMarks = current.rubricMarks.map(rm => ({
          ...rm,
          marks: newAttendance === "Absent" ? 0 : (rm.marks || 0)
      }));

      return {
        ...prev,
        [studentId]: {
          ...current,
          attendance: newAttendance,
          rubricMarks: newRubricMarks
        }
      };
    });
    setManualEdits(prev => new Set(prev).add(studentId));
  };

  const handleMarkChange = (studentId, criteriaId, value) => {
    setMarksData((prev) => {
      const current = prev[studentId];
      const newRubricMarks = current.rubricMarks.map((rm) =>
        String(rm.criteriaId) === String(criteriaId) ? { ...rm, marks: value } : rm
      );

      return {
        ...prev,
        [studentId]: {
          ...current,
          rubricMarks: newRubricMarks,
        },
      };
    });
    setManualEdits(prev => new Set(prev).add(studentId));
  };

  const handleSaveManual = async () => {
    if (manualEdits.size === 0) {
      showToast("info", "No changes to save");
      return;
    }

    try {
      setSaving(true);
      const updates = Array.from(manualEdits).map(studentId => ({
        studentId,
        attendance: marksData[studentId].attendance,
        rubricMarks: marksData[studentId].rubricMarks.map(rm => ({
          criteriaId: rm.criteriaId,
          marks: Number(rm.marks || 0)
        }))
      }));

      await API.post(`/marks/activity/${activityId}/bulk-update`, { updates });
      showToast("success", "Manual marks saved successfully");
      setManualEdits(new Set()); // Reset edits
      await fetchData(false); // Refresh data from server quietly
    } catch (err) {
      console.error(err);
      showToast("error", err.response?.data?.error || "Failed to save marks");
    } finally {
      setSaving(false);
    }
  };

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

        <div className="status-alert status-alert-info" style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
          <i className="fa fa-info-circle"></i>
          <div>
            Students marked as <strong>Absent</strong> can be manually edited. Change their status to <strong>Present</strong> to enter marks.
          </div>
        </div>
        {manualEdits.size > 0 && (
          <div className="status-alert status-alert-warn" style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px", animation: "pulse 2s infinite" }}>
            <i className="fa fa-exclamation-triangle"></i>
            <div>You have unsaved manual changes. Please click <strong>Save Manual Changes</strong> below.</div>
          </div>
        )}
        {activity.rubric.length === 0 && (
          <div className="status-alert status-alert-warn" style={{ marginBottom: "16px" }}>
            No user-defined subdivisions were configured. Using default "Total Marks" rubric. You can still upload marks via Excel.
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
                  const isEdited = manualEdits.has(student._id);

                  return (
                    <tr key={student._id} style={{ background: isEdited ? "#fffbeb" : "inherit", transition: "background 0.3s" }}>
                      <td style={{ textAlign: "left" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                           {isEdited && <i className="fa fa-pencil" title="Modified" style={{ color: "#d97706", fontSize: "12px" }}></i>}
                           <strong>{student.name}</strong> 
                        </div>
                        <span className="muted" style={{ fontSize: "13px" }}>Roll: {student.rollNumber}</span>
                      </td>
                      {data.rubricMarks.map((r, idx) => (
                        <td key={r.criteriaId}>
                          <div
                            style={{
                              width: 80,
                              padding: "4px",
                              margin: "0 auto",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: "6px",
                              border: data.originallyAbsent && data.attendance === "Present" ? "2px solid #3b82f6" : "1px solid #dbe4f1",
                              background: data.originallyAbsent && data.attendance === "Present" ? "#fff" : "#f8fbff",
                              color: data.attendance === "Absent" ? "#9ca3af" : "#111827",
                              minHeight: "38px",
                            }}
                          >
                            {data.originallyAbsent && data.attendance === "Present" ? (
                                <input
                                    type="number"
                                    value={r.marks}
                                    onChange={(e) => handleMarkChange(student._id, r.criteriaId, e.target.value)}
                                    max={r.maxMarks}
                                    min={0}
                                    placeholder="0"
                                    style={{
                                        width: "100%",
                                        border: "none",
                                        background: "transparent",
                                        textAlign: "center",
                                        outline: "none",
                                        fontSize: "14px",
                                        fontWeight: "600"
                                    }}
                                />
                            ) : (
                                <span style={{ fontWeight: "500" }}>
                                  {r.marks === "" || r.marks === null || r.marks === undefined ? "-" : r.marks}
                                </span>
                            )}
                          </div>
                        </td>
                      ))}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleAttendance(student._id)}
                            disabled={!data.originallyAbsent}
                            style={{
                              margin: "0 auto",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "8px",
                              background: data.attendance === "Present" ? "#e8f9ef" : "#fef2f2",
                              color: data.attendance === "Present" ? "#047857" : "#dc2626",
                              border: `1px solid ${data.attendance === 'Present' ? '#10b981' : '#fecaca'}`,
                              fontWeight: "600",
                              padding: "6px 12px",
                              borderRadius: "20px",
                              minWidth: "110px",
                              fontSize: "13px",
                              cursor: data.originallyAbsent ? "pointer" : "default",
                              opacity: data.originallyAbsent ? 1 : 0.7,
                              boxShadow: data.originallyAbsent ? "0 1px 2px rgba(0,0,0,0.05)" : "none"
                            }}
                          >
                            <i className={`fa fa-user-${data.attendance === 'Present' ? 'check' : 'times'}`}></i>
                            {data.attendance}
                          </button>
                          {data.originallyAbsent && (
                            <span style={{ fontSize: '10px', color: '#6b7280', fontWeight: '500' }}>
                              {data.attendance === 'Absent' ? 'Click to mark Present' : 'Click to revert'}
                            </span>
                          )}
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
            className="btn btn-primary"
            onClick={handleSaveManual}
            disabled={saving || manualEdits.size === 0}
            style={{ padding: "10px 20px" }}
          >
            <i className="fa fa-save" style={{ marginRight: 8 }}></i>
            {saving ? "Saving..." : "Save Manual Changes"}
          </button>
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
