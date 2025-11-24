import React, { useState, useEffect } from "react";
import API from "../services/api";
import showToast from "../utils/toast";
// import LogoutButton from "../components/LogoutButton";

function DashboardPage() {
  const user = JSON.parse(localStorage.getItem("user"));
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState({}); // SUBJECT MAP
  const [students, setStudents] = useState([]);
  const [marksData, setMarksData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const fetchAll = async () => {
      try {
        setLoading(true);
        console.log("Fetching classes for faculty:", user.id);

        const resClasses = await API.get(`/classes/faculty/${user.id}`);
        const classList = resClasses.data.classes || [];
        setClasses(classList);
        console.log("Classes fetched:", classList);

        const facultyId = user.id;
        let subjectMap = {};
        let studentMap = {};

        for (const cls of classList) {
          const resSubjects = await API.get(
            `/teaching-assignment/subjects/${facultyId}/${cls._id}`
          );
          subjectMap[cls._id] = resSubjects.data.data || [];

          const resStudents = await API.get(`/activities/class/${cls._id}/students`);
          studentMap[cls._id] = resStudents.data.students || [];
        }

        setSubjects(subjectMap);
        const allStudents = Object.values(studentMap).flat();
        setStudents(allStudents);

        // Fetch marks for each class + subject
        let marksMap = {};
        for (const cls of classList) {
          for (const sub of subjectMap[cls._id]) {
            const resMarks = await API.get(`/marks/class/${cls._id}/subject/${sub._id}`);
            const marksByStudent = resMarks.data || {};

            Object.entries(marksByStudent).forEach(([studentId, markData]) => {
              marksMap[studentId] = {
                ...marksMap[studentId],
                [sub._id]: {
                  activityMarks: markData.activityMarks || [],
                  attendance: markData.attendance || 0,
                  studentMarksIds: markData.studentMarksIds || [],
                },
              };
            });
          }
        }

        setMarksData(marksMap);
      } catch (error) {
        console.error("Dashboard loading error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [user?.id]);

  const handleAttendanceChange = (studentId, subjectId, value) => {
    setMarksData((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [subjectId]: {
          ...prev[studentId]?.[subjectId],
          attendance: Number(value),
        },
      },
    }));
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ textAlign: "center", marginBottom: "30px" }}>
        <h2>Dashboard</h2>
        <p>
          Welcome back, <strong>{user?.name}</strong> 👋
        </p>
      </div>

      {classes.length === 0 && <p>No classes assigned.</p>}

      {classes.map((cls) => (
        <div key={cls._id} style={{ marginBottom: 40 }}>
          <h2>{cls.name}</h2>

          {(subjects[cls._id] || []).length === 0 && <p>No subjects assigned.</p>}

          {(subjects[cls._id] || []).map((sub) => {
            const classStudents = students.filter((s) => s.classId === cls._id);
            if (!classStudents.length) return null;

            // ✅ Save attendance for this subject
            const saveSubjectAttendance = async () => {
  try {
    const classStudents = students.filter((s) => s.classId === cls._id);
    
    for (const stu of classStudents) {
      const data = marksData[stu._id]?.[sub._id];
      if (!data) continue;

      for (let i = 0; i < data.studentMarksIds.length; i++) {
        const markId = data.studentMarksIds[i];
        if (!markId) continue;

        // Fetch existing marks record from marksData
        const activityMark = data.activityMarks[i] || 0;

        // Send PUT request with required fields
        await API.put(`/marks/update/${markId}`, {
          attendanceMarks: data.attendance,
          totalMarks: activityMark + data.attendance
        });
      }
    }

    showToast("success", `Attendance saved for ${sub.name}`);
  } catch (err) {
    console.error(err);
    showToast("error", `Error saving attendance for ${sub.name}`);
  }
};


            return (
              <div key={sub._id} style={{ marginBottom: 20 }}>
                <h3>{sub.name}</h3>

                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    textAlign: "center",
                  }}
                >
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Activity 1</th>
                      <th>Activity 2</th>
                      <th>Attendance (out of 5)</th>
                      <th>Total (out of 20)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classStudents.map((stu, idx) => {
                      const data = marksData[stu._id]?.[sub._id] || {
                        activityMarks: [0, 0],
                        attendance: 0,
                        studentMarksIds: [],
                      };
                      const total =
                        data.activityMarks.reduce((a, b) => a + b, 0) +
                        data.attendance;

                      return (
                        <tr key={idx}>
                          <td>{stu.name}</td>
                          <td>{data.activityMarks[0] || 0}</td>
                          <td>{data.activityMarks[1] || 0}</td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              max="5"
                              value={data.attendance}
                              onChange={(e) =>
                                handleAttendanceChange(
                                  stu._id,
                                  sub._id,
                                  e.target.value
                                )
                              }
                              style={{ width: 50 }}
                            />
                          </td>
                          <td>{total}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <button
                  className="btn btn-primary mt-2"
                  onClick={saveSubjectAttendance}
                >
                  Save Attendance for {sub.name}
                </button>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default DashboardPage;
