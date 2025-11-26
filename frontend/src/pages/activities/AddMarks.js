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

        setActivity({ ...activityDetails, rubric });

        // Fetch assignment to get classId and subjectId
        const resAssign = await API.get(`/teaching-assignment/${activityDetails.assignmentId}`);
        const assignment = resAssign.data.assignment;

        if (!assignment) {
          showToast("error", "Teaching assignment not found");
          setLoading(false);
          return;
        }

        const subjId = assignment.subjectId?._id || assignment.subjectId;
        const clsId = assignment.classId?._id || assignment.classId;

        if (!subjId || !clsId) {
          showToast("error", "Subject ID or Class ID not found");
          setLoading(false);
          return;
        }

        setSubjectId(subjId);
        setClassId(clsId);

        // Fetch students for this class
        const resStudents = await API.get(`/students/by-class/${clsId}`);
        const studentsList = resStudents.data.students || [];
        setStudents(studentsList);

        // Fetch existing marks
        const resMarks = await API.get(`/marks/activity/${activityId}`);
        const existingMarks = resMarks.data.marks || [];

        // Initialize marksData for all students
        const initialMarks = {};
        studentsList.forEach((student) => {
          const existing = existingMarks.find(
            (m) => (m.studentId?._id || m.studentId) === student._id
          );
          initialMarks[student._id] = {
            rubricMarks: rubric.map((r) => ({
              criteriaId: r._id,
              name: r.name,
              maxMarks: r.maxMarks,
              marks: existing
                ? existing.rubricMarks.find(rr => rr.criteriaId._id === r._id)?.marks || 0
                : 0,
            })),
            attendanceMarks: existing?.attendanceMarks || 0,
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
    setMarksData((prev) => {
      const newRubric = [...prev[studentId].rubricMarks];
      newRubric[index].marks = Number(value);
      return {
        ...prev,
        [studentId]: { ...prev[studentId], rubricMarks: newRubric },
      };
    });
  };

  // const handleAttendanceChange = (studentId, value) => {
  //   setMarksData((prev) => ({
  //     ...prev,
  //     [studentId]: { ...prev[studentId], attendanceMarks: Number(value) },
  //   }));
  // };

  const submitAllMarks = async () => {
    const violations = [];

    Object.entries(marksData).forEach(([studentId, payload]) => {
      payload?.rubricMarks?.forEach((r) => {
        const entered = Number(r.marks ?? 0);
        const allowed = Number(r.maxMarks ?? 0);
        if (entered > allowed) {
          const student = students.find((s) => s._id === studentId);
          violations.push(
            `${student?.name || "Student"} → ${r.name || "Criteria"} (${entered}/${allowed})`
          );
        }
      });
    });

    if (violations.length) {
      showToast(
        "error",
        `Marks exceed allowed values:\n${violations.slice(0, 3).join("\n")}${
          violations.length > 3 ? "…" : ""
        }`
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
          subjectId,
          classId,
        };

        if (payload.exists) {
          await API.put(`/marks/update/${payload.id}`, data);
        } else {
          const res = await API.post(`/marks/add`, { studentId, activityId, ...data });
          setMarksData((prev) => ({
            ...prev,
            [studentId]: { ...prev[studentId], exists: true, id: res.data._id || res.data.mark?._id },
          }));
        }
      }

      // Update activity status to "Marks_Updated"
      await API.put(`/activities/update/${activityId}`, { status: "Marks_Updated" });

      showToast("success", "All marks saved and activity status updated");
    } catch (err) {
      console.error(err);
      showToast("error", err.response?.data?.error || "Error saving marks");
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!activity) return <div>Activity not found</div>;

  return (
    <div className="card">
      <h2>Add Marks for: {activity.name}</h2>
      {students.length === 0 ? (
        <p>No students enrolled for this activity.</p>
      ) : (
        <table className="marks-table">
          <thead>
            <tr>
              <th>Student</th>
              {activity.rubric.map((r) => (
                <th key={r._id}>{r.name} (out of {r.maxMarks})</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map((student) => {
              const data = marksData[student._id];
              if (!data) return null;

              return (
                <tr key={student._id}>
                  <td>{student.name} ({student.rollNumber})</td>
                  {data.rubricMarks.map((r, idx) => (
                    <td key={r.criteriaId}>
                      <input
                        type="number"
                        min="0"
                        max={r.maxMarks}
                        value={r.marks}
                        onChange={(e) => handleRubricChange(student._id, idx, e.target.value)}
                        style={{ width: 60 }}
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <button className="btn btn-primary" onClick={submitAllMarks} style={{ marginTop: 12 }}>
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
