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
  const [subjectId, setSubjectId] = useState(null);
  const [classId, setClassId] = useState(null);
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

        // Extract IDs - handle both populated objects and plain IDs
        const subjId = assignment.subjectId?._id || assignment.subjectId;
        const clsId = assignment.classId?._id || assignment.classId;

        console.log("Assignment data:", assignment);
        console.log("Extracted classId:", clsId);
        console.log("Extracted subjectId:", subjId);

        if (!subjId || !clsId) {
          console.error("Missing IDs - Subject:", subjId, "Class:", clsId);
          showToast("error", "Subject ID or Class ID not found");
          setLoading(false);
          return;
        }

        // Convert to string to ensure consistent format
        const subjIdStr = String(subjId);
        const clsIdStr = String(clsId);

        setSubjectId(subjIdStr);
        setClassId(clsIdStr);

        // Fetch students for this class
        console.log("Fetching students for classId:", clsIdStr);
        const resStudents = await API.get(`/students/by-class/${clsIdStr}`);
        const studentsList = resStudents.data?.students || [];

        console.log("Fetched students:", studentsList.length, studentsList);

        if (studentsList.length === 0) {
          console.warn("No students found for classId:", clsIdStr);
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
            (m) => (m.studentId?._id || m.studentId) === student._id,
          );
          const existingActivity = existing?.activities.find(
            (a) => (a.activityId?._id || a.activityId) === activityId,
          );

          initialMarks[student._id] = {
            rubricMarks: rubric.map((r) => {
              const existingMark = existingActivity?.rubricMarks.find(
                (rm) => (rm.criteriaId?._id || rm.criteriaId) === r._id,
              );
              return {
                criteriaId: r._id,
                name: r.name,
                maxMarks: r.maxMarks,
                marks: existingMark?.marks || 0,
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

  const handleRubricChange = (studentId, index, value) => {
    const numericValue = value === "" ? 0 : Number(value);
    setMarksData((prev) => {
      const newRubric = [...prev[studentId].rubricMarks];
      newRubric[index].marks = numericValue;
      return {
        ...prev,
        [studentId]: { ...prev[studentId], rubricMarks: newRubric },
      };
    });
  };

  const handleAttendanceChange = (studentId, value) => {
    setMarksData((prev) => {
      const updated = { ...prev[studentId], attendance: value };

      // If marking as absent, clear all marks
      if (value === "Absent") {
        updated.rubricMarks = updated.rubricMarks.map((r) => ({
          ...r,
          marks: 0,
        }));
      }

      return {
        ...prev,
        [studentId]: updated,
      };
    });
  };

  const submitAllMarks = async () => {
    const violations = [];

    Object.entries(marksData).forEach(([studentId, payload]) => {
      // Check if student is marked absent but has marks entered
      if (payload.attendance === "Absent") {
        const hasMarks = payload.rubricMarks.some((r) => r.marks > 0);
        if (hasMarks) {
          const student = students.find((s) => s._id === studentId);
          violations.push(
            `${student?.name || "Student"} is marked as Absent but has marks entered`,
          );
        }
        return; // Skip further validation for absent students
      }

      // Validate marks for present students
      payload?.rubricMarks?.forEach((r) => {
        const entered = Number(r.marks ?? 0);
        const allowed = Number(r.maxMarks ?? 0);
        if (entered > allowed) {
          const student = students.find((s) => s._id === studentId);
          violations.push(
            `${student?.name || "Student"} → ${r.name || "Criteria"} (${entered}/${allowed})`,
          );
        }
      });
    });

    if (violations.length) {
      showToast(
        "error",
        `Marks exceed allowed values:\n${violations.slice(0, 3).join("\n")}${
          violations.length > 3 ? "…" : ""
        }`,
      );
      return;
    }

    try {
      for (const studentId of Object.keys(marksData)) {
        const payload = marksData[studentId];
        const data = {
          rubricMarks: payload.rubricMarks.map((r) => ({
            criteriaId: r.criteriaId,
            marks: r.marks,
          })),
          attendance: payload.attendance || "Present",
          subjectId,
          classId,
        };

        if (payload.exists) {
          await API.put(`/marks/update/${payload.id}/${activityId}`, {
            rubricMarks: data.rubricMarks,
            attendance: data.attendance,
          });
        } else {
          const res = await API.post(`/marks/add`, {
            studentId,
            activityId,
            ...data,
          });
          setMarksData((prev) => ({
            ...prev,
            [studentId]: {
              ...prev[studentId],
              exists: true,
              id: res.data._id || res.data.mark?._id,
            },
          }));
        }
      }

      // Update activity status to "Marks_Updated"
      await API.put(`/activities/update/${activityId}`, {
        status: "Marks_Updated",
      });

      showToast("success", "All marks saved and activity status updated");
    } catch (err) {
      console.error(err);
      showToast("error", err.response?.data?.error || "Error saving marks");
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
    <div className="card">
      <h2>Add Marks for: {activity.name}</h2>
      <div style={{ marginBottom: 12 }}>
        <input
          type="file"
          accept=".xlsx"
          id="marksExcelInput"
          style={{ display: "none" }}
          onChange={handleExcelUpload}
        />

        <button
          className="btn btn-secondary"
          disabled={uploading}
          onClick={() => document.getElementById("marksExcelInput").click()}
        >
          {uploading ? "Uploading..." : "Upload Marks (Excel)"}
        </button>

        <a
          href={`${API.defaults.baseURL}/marks/activity/${activityId}/template`}
          className="btn btn-outline"
          style={{ marginLeft: 10 }}
          target="_blank"
          rel="noopener noreferrer"
        >
          Download Template
        </a>
      </div>

      {students.length === 0 ? (
        <p>No students enrolled for this activity.</p>
      ) : (
        <table className="marks-table">
          <thead>
            <tr>
              <th>Student</th>
              {activity.rubric.map((r) => (
                <th key={r._id}>
                  {r.name} (out of {r.maxMarks})
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
                  <td>
                    {student.name} ({student.rollNumber})
                  </td>
                  {data.rubricMarks.map((r, idx) => (
                    <td key={r.criteriaId}>
                      <input
                        type="number"
                        value={r.marks}
                        onChange={(e) =>
                          handleRubricChange(student._id, idx, e.target.value)
                        }
                        min="0"
                        max={r.maxMarks}
                        disabled={data.attendance === "Absent" || uploading}
                        style={{
                          width: 60,
                          opacity:
                            data.attendance === "Absent" || uploading ? 0.5 : 1,
                          cursor:
                            data.attendance === "Absent" || uploading
                              ? "not-allowed"
                              : "auto",
                        }}
                      />
                    </td>
                  ))}
                  <td>
                    <select
                      value={data.attendance}
                      onChange={(e) =>
                        handleAttendanceChange(student._id, e.target.value)
                      }
                      style={{ width: 100 }}
                    >
                      <option value="Present">Present</option>
                      <option value="Absent">Absent</option>
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <button
        className="btn btn-primary"
        onClick={submitAllMarks}
        style={{ marginTop: 12 }}
      >
        Save All Marks
      </button>
      <button
        className="btn btn-outline"
        onClick={() => navigate("/activities")}
        style={{ marginTop: 12, marginLeft: 10 }}
      >
        Back to Activities
      </button>
    </div>
  );
}

export default AddMarks;
