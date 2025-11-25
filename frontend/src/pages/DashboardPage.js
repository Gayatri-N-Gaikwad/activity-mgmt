import React, { useState, useEffect } from "react";
import API from "../services/api";
import showToast from "../utils/toast";

function DashboardPage() {
  const user = JSON.parse(localStorage.getItem("user"));
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState({});
  const [students, setStudents] = useState([]);
  const [marksData, setMarksData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const fetchAll = async () => {
      try {
        setLoading(true);

        const resClasses = await API.get(`/classes/faculty/${user.id}`);
        const classList = resClasses.data.classes || [];
        setClasses(classList);

        let subjectMap = {};
        let studentMap = {};
        let marksMap = {};

        for (const cls of classList) {
          // fetch subjects
          const resSubjects = await API.get(
            `/teaching-assignment/subjects/${user.id}/${cls._id}`
          );
          subjectMap[cls._id] = resSubjects.data.data || [];

          // fetch students
          const resStudents = await API.get(`/activities/class/${cls._id}/students`);
          studentMap[cls._id] = resStudents.data.students || [];

          // fetch marks for each subject
          for (const sub of subjectMap[cls._id]) {
            const resMarks = await API.get(
              `/marks/class/${cls._id}/subject/${sub._id}`
            );

            const arr = resMarks.data.marks || [];

            arr.forEach((m) => {
              const studentId = m.studentId?._id;
              if (!studentId) return;

              marksMap[studentId] = {
                ...marksMap[studentId],
                [sub._id]: {
                  activities: m.activities || [],
                  attendanceMarks: m.attendanceMarks || 0,
                  totalMarks: m.totalMarks || 0,
                },
              };
            });
          }
        }

        setSubjects(subjectMap);
        setStudents(Object.values(studentMap).flat());
        setMarksData(marksMap);
      } catch (err) {
        console.error("Dashboard loading error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [user?.id]);

  // Handle attendance input change
  const handleAttendanceChange = (studentId, subjectId, value) => {
    setMarksData((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [subjectId]: {
          ...prev[studentId]?.[subjectId],
          attendanceMarks: Number(value),
        },
      },
    }));
  };

  // Save attendance
  const saveSubjectAttendance = async (classId, subjectId) => {
    try {
      const classStudents = students.filter((s) => s.classId === classId);

      for (const stu of classStudents) {
        const data = marksData[stu._id]?.[subjectId];
        if (!data) continue;

        await API.put("/student-subject-marks/update-attendance", {
          studentId: stu._id,
          subjectId,
          attendanceMarks: data.attendanceMarks,
        });
      }

      showToast("success", "Attendance updated successfully");
    } catch (err) {
      console.error(err);
      showToast("error", "Failed to update attendance");
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ padding: "20px" }}>
      <h2 style={{ textAlign: "center", marginBottom: "30px" }}>
        Dashboard - Welcome {user?.name} 👋
      </h2>

      {classes.length === 0 && <p>No classes assigned.</p>}

      {classes.map((cls) => (
        <div key={cls._id} style={{ marginBottom: 40 }}>
          <h3>{cls.name}</h3>

          {(subjects[cls._id] || []).length === 0 && <p>No subjects assigned.</p>}

          {(subjects[cls._id] || []).map((sub) => {
            const classStudents = students.filter((s) => s.classId === cls._id);
            if (!classStudents.length) return null;

            return (
              <div key={sub._id} style={{ marginBottom: 20 }}>
                <h4>{sub.name}</h4>

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
                    {classStudents.map((stu) => {
                      const data =
                        marksData[stu._id]?.[sub._id] || {
                          activities: [],
                          attendanceMarks: 0,
                          totalMarks: 0,
                        };

                      const act1 = data.activities?.[0]?.totalRubricMarks || 0;
                      const act2 = data.activities?.[1]?.totalRubricMarks || 0;
                      const attendance = data.attendanceMarks || 0;

                      const total = act1 + act2 + attendance;

                      return (
                        <tr key={stu._id}>
                          <td>{stu.name}</td>
                          <td>{act1}</td>
                          <td>{act2}</td>

                          <td>
                            <input
                              type="number"
                              min="0"
                              max="5"
                              value={attendance}
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
                  onClick={() => saveSubjectAttendance(cls._id, sub._id)}
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
