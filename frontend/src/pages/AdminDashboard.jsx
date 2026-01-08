import React, { useEffect, useState } from "react";
import API from "../services/api";

const AdminDashboard = () => {
  const user = JSON.parse(localStorage.getItem("user"));

  const [facultyMap, setFacultyMap] = useState({});
  const [students, setStudents] = useState({});
  const [marksData, setMarksData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== "admin") return;

    const fetchAll = async () => {
      try {
        setLoading(true);

        const res = await API.get("/teaching-assignment/assignments");
        const assignments = res.data?.data || [];

        const facultyMapTemp = {};
        const studentsTemp = {};
        const marksTemp = {};
        const marksLoaded = {}; // prevent duplicate calls

        for (const a of assignments) {
          // 🚨 Skip broken / unassigned records
          if (!a.facultyId || !a.classId || !a.subjectId) continue;

          const facultyId = a.facultyId._id;
          const classId = a.classId._id;
          const subjectId = a.subjectId._id;

          // ---------- FACULTY GROUPING ----------
          if (!facultyMapTemp[facultyId]) {
            facultyMapTemp[facultyId] = {
              faculty: a.facultyId,
              classes: {}
            };
          }

          if (!facultyMapTemp[facultyId].classes[classId]) {
            facultyMapTemp[facultyId].classes[classId] = {
              class: a.classId,
              subjects: []
            };
          }

          const subjects =
            facultyMapTemp[facultyId].classes[classId].subjects;

          // prevent duplicate subjects
          if (!subjects.find((s) => s._id === subjectId)) {
            subjects.push(a.subjectId);
          }

          // ---------- STUDENTS (PER CLASS) ----------
          if (!studentsTemp[classId]) {
            const resStudents = await API.get(
              `/activities/class/${classId}/students`
            );
            studentsTemp[classId] = resStudents.data?.students || [];
          }

          // ---------- MARKS ----------
          const marksKey = `${classId}_${subjectId}`;

          if (!marksLoaded[marksKey]) {
            const resMarks = await API.get(
              `/marks/class/${classId}/subject/${subjectId}`
            );

            (resMarks.data?.marks || []).forEach((m) => {
              const studentId = m.studentId?._id;
              if (!studentId) return;

              if (!marksTemp[studentId]) marksTemp[studentId] = {};

              marksTemp[studentId][subjectId] = {
                activities: m.activities || [],
                totalMarks: m.totalMarks || 0
              };
            });

            marksLoaded[marksKey] = true;
          }
        }

        setFacultyMap(facultyMapTemp);
        setStudents(studentsTemp);
        setMarksData(marksTemp);
      } catch (err) {
        console.error("Admin dashboard error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [user?.role]);

  if (loading) return <p>Loading...</p>;
  if (user?.role !== "admin") return <p>Access denied</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ textAlign: "center" }}>Admin Dashboard</h2>

      {Object.values(facultyMap).map((fac) => (
        <div key={fac.faculty._id} style={{ marginBottom: 40 }}>
          <h3>👨‍🏫 {fac.faculty.name}</h3>

          {Object.values(fac.classes).map((cls) => (
            <div key={cls.class._id} style={{ marginBottom: 30 }}>
              <h4>📘 {cls.class.name}</h4>

              {cls.subjects.map((sub) => (
                <div key={sub._id} style={{ marginBottom: 20 }}>
                  <h5>📗 {sub.name}</h5>

                  <table width="100%" border="1" cellPadding="8">
                    <thead>
                      <tr>
                        <th>Roll No</th>
                        <th>Student</th>
                        <th>Activity 1</th>
                        <th>Activity 2</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(students[cls.class._id] || []).map((stu) => {
                        const data =
                          marksData[stu._id]?.[sub._id] || {
                            activities: [],
                            totalMarks: 0
                          };

                        const a1 =
                          data.activities?.[0]?.totalRubricMarks || 0;
                        const a2 =
                          data.activities?.[1]?.totalRubricMarks || 0;

                        return (
                          <tr key={stu._id}>
                            <td>{stu.rollNumber}</td>
                            <td>{stu.name}</td>
                            <td>{a1}</td>
                            <td>{a2}</td>
                            <td>{a1 + a2}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default AdminDashboard;
