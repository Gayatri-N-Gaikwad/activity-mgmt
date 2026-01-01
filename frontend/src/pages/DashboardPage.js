import React, { useState, useEffect } from "react";
import API from "../services/api";

function DashboardPage() {
  const user = JSON.parse(localStorage.getItem("user"));
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState({});
  const [students, setStudents] = useState([]);
  const [marksData, setMarksData] = useState({});
  const [loading, setLoading] = useState(true);

  const [refreshKey, setRefreshKey] = useState(0);

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
  }, [user?.id, refreshKey]);

  // Removed attendance handling functions

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ padding: "20px" }}>
      <h2 style={{ textAlign: "center", marginBottom: "30px" }}>
        Dashboard - Welcome {user?.name} 👋
      </h2>
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <button 
          onClick={() => setRefreshKey(prev => prev + 1)} 
          style={{ padding: "10px 20px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}
        >
          Refresh Data
        </button>
      </div>

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
                      <th>Roll No</th>
                      <th>Student</th>
                      <th>Activity 1</th>
                      <th>Activity 1 Attendance</th>
                      <th>Activity 2</th>
                      <th>Activity 2 Attendance</th>
                      <th>Total (out of 15)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classStudents.map((stu) => {
                      const data =
                        marksData[stu._id]?.[sub._id] || {
                          activities: [],
                          totalMarks: 0,
                        };

                      const act1Data = data.activities?.[0];
                      const act2Data = data.activities?.[1];
                      
                      const act1Marks = act1Data?.totalRubricMarks || 0;
                      const act1Attendance = act1Data?.attendance || 'Present';
                      
                      const act2Marks = act2Data?.totalRubricMarks || 0;
                      const act2Attendance = act2Data?.attendance || 'Present';

                      // Calculate total (only include marks from present students)
                      const act1Numeric = act1Attendance === 'Present' ? act1Marks : 0;
                      const act2Numeric = act2Attendance === 'Present' ? act2Marks : 0;
                      const total = act1Numeric + act2Numeric;

                      return (
                        <tr key={stu._id}>
                          <td>{stu.rollNumber}</td>
                          <td>{stu.name}</td>
                          <td>{act1Marks}</td>
                          <td>{act1Attendance}</td>
                          <td>{act2Marks}</td>
                          <td>{act2Attendance}</td>
                          <td>{total}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default DashboardPage;
