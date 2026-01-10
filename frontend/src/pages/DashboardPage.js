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
  const [downloading, setDownloading] = useState(false);
  const [updatedActivitiesCount, setUpdatedActivitiesCount] = useState(0);

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
            try {
              const resMarks = await API.get(
                `/marks/class/${cls._id}/subject/${sub._id}`
              );

              const arr = resMarks.data?.marks || [];
              
              if (arr.length === 0) {
                console.log(`No marks found for class ${cls._id}, subject ${sub._id}`);
              }

              arr.forEach((m) => {
                const studentId = m.studentId?._id;
                if (!studentId) {
                  console.warn("Mark entry missing studentId:", m);
                  return;
                }

                // Convert to string to ensure consistent key matching
                const studentIdStr = String(studentId);
                
                marksMap[studentIdStr] = {
                  ...marksMap[studentIdStr],
                  [sub._id]: {
                    activities: m.activities || [],
                    totalMarks: m.totalMarks || 0,
                  },
                };
              });
            } catch (markError) {
              console.error(`Error fetching marks for class ${cls._id}, subject ${sub._id}:`, markError);
            }
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

  // Fetch activities to check if both have Marks_Updated status
  useEffect(() => {
    const checkActivitiesStatus = async () => {
      try {
        const resActivities = await API.get("/activities/all");
        const allActivities = resActivities.data.activities || [];

        // Filter for Marks_Updated activities for this user
        const updatedActivities = allActivities.filter(
          (act) => act.status === "Marks_Updated" && String(act.coordinatorId) === String(user?.id)
        );

        setUpdatedActivitiesCount(updatedActivities.length);
      } catch (err) {
        console.error("Error checking activities status:", err);
      }
    };

    if (user?.id) {
      checkActivitiesStatus();
    }
  }, [user?.id, refreshKey]);

  const downloadSubjectReport = async (classId, subjectId, subjectName, className) => {
    try {
      setDownloading(true);
      
      // Get activity IDs from marksData for this subject
      const activityIdsSet = new Set();
      
      Object.values(marksData).forEach(studentMarks => {
        if (studentMarks[subjectId]?.activities) {
          studentMarks[subjectId].activities.forEach(activity => {
            if (activity.activityId) {
              activityIdsSet.add(activity.activityId);
            }
          });
        }
      });

      if (activityIdsSet.size === 0) {
        showToast('error', 'No marks available for this subject');
        return;
      }

      // Verify that activities have "Marks_Updated" status
      const resActivities = await API.get("/activities/all");
      const allActivities = resActivities.data.activities || [];
      
      const validActivityIds = Array.from(activityIdsSet).filter(actId => {
        const activity = allActivities.find(a => String(a._id) === String(actId));
        return activity && activity.status === "Marks_Updated";
      });

      if (validActivityIds.length === 0) {
        showToast('error', 'No activities with updated marks for this subject');
        return;
      }

      const response = await API.post("/marks/download-combined", {
        activityIds: validActivityIds
      }, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${className}_${subjectName}_Report_${new Date().toLocaleDateString()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      showToast('success', `Report for ${subjectName} downloaded successfully`);
    } catch (err) {
      console.error('Download error:', err);
      showToast('error', 'Error downloading report');
    } finally {
      setDownloading(false);
    }
  };

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
          style={{ padding: "10px 20px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", marginRight: "10px" }}
        >
          Refresh Data
        </button>
        
        {updatedActivitiesCount < 2 && (
          <p style={{ color: "#d9534f", marginTop: "10px", fontSize: "14px" }}>
             Marks updated for {updatedActivitiesCount}/2 activities. Please update marks for both activities before downloading.
          </p>
        )}
      </div>

      {classes.length === 0 && <p>No classes assigned.</p>}

      {classes.map((cls) => (
        <div key={cls._id} style={{ marginBottom: 40 }}>
          <h3>{cls.name}</h3>

          {(subjects[cls._id] || []).length === 0 && <p>No subjects assigned.</p>}

          {(subjects[cls._id] || []).map((sub) => {
            // Convert IDs to strings for consistent comparison
            const classStudents = students.filter((s) => String(s.classId) === String(cls._id));
            if (!classStudents.length) return null;

            return (
              <div key={sub._id} style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <h4>{sub.name}</h4>
                  <button 
                    onClick={() => downloadSubjectReport(cls._id, sub._id, sub.name, cls.name)}
                    disabled={downloading}
                    style={{
                      padding: "8px 12px",
                      backgroundColor: "#17a2b8",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: downloading ? "not-allowed" : "pointer",
                      fontSize: "14px",
                      opacity: downloading ? 0.6 : 1
                    }}
                    title={`Download marks report for ${sub.name}`}
                  >
                    <i className="fa fa-download" style={{ marginRight: 6 }}></i>
                    Download
                  </button>
                </div>

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
                      // Convert student ID to string for consistent key matching
                      const studentIdStr = String(stu._id);
                      const data =
                        marksData[studentIdStr]?.[sub._id] || {
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
