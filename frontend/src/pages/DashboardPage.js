import React, { useState, useEffect } from "react";
import API from "../services/api";
import showToast from "../utils/toast";

import { getActiveAcademicYear } from "../services/teachingAssignmentApi";

function DashboardPage() {
  const user = JSON.parse(localStorage.getItem("user"));
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState({});
  const [students, setStudents] = useState([]);
  const [marksData, setMarksData] = useState({});
  const [activityMaxMarks, setActivityMaxMarks] = useState({}); // key: subjectId, value: sum of max marks
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [updatedActivitiesCount, setUpdatedActivitiesCount] = useState(0);
  const [academicYear, setAcademicYear] = useState("");


  const [refreshKey, setRefreshKey] = useState(0);

  // Normalize activityId whether it's populated or plain string/ObjectId
  const getActivityId = (raw) => {
    if (!raw) return null;
    if (typeof raw === "object") {
      return String(raw._id || raw.id || raw);
    }
    return String(raw);
  };

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
        let maxMarksMap = {}; // Track sum of max marks per subject

        for (const cls of classList) {
          // fetch subjects
          const resSubjects = await API.get(
            `/teaching-assignment/subjects/${user.id}/${cls._id}`
          );
          subjectMap[cls._id] = resSubjects.data.data || [];

          // fetch students
          const resStudents = await API.get(`/activities/class/${cls._id}/students`);
          studentMap[cls._id] = resStudents.data.students || [];

          // fetch marks for each subject and calculate activity max marks
          for (const sub of subjectMap[cls._id]) {
            try {
              const resMarks = await API.get(
                `/marks/class/${cls._id}/subject/${sub._id}`
              );

              const arr = resMarks.data?.marks || [];

              if (arr.length === 0) {
                console.log(`No marks found for class ${cls._id}, subject ${sub._id}`);
              }

              // Collect unique activities to calculate max marks
              const uniqueActivityIds = new Set();
              arr.forEach((m) => {
                if (m.activities && Array.isArray(m.activities)) {
                  m.activities.forEach((act) => {
                    const actId = getActivityId(act.activityId);
                    if (actId) uniqueActivityIds.add(actId);
                  });
                }
              });

              // Fetch rubric for each unique activity to get max marks
              let sumMaxMarks = 0;
              for (const actId of uniqueActivityIds) {
                try {
                  const actRes = await API.get(`/activities/${actId}`);
                  const rubric = actRes.data?.rubric || [];
                  const actMaxMarks = rubric.reduce(
                    (sum, r) => sum + Number(r.maxMarks || 0),
                    0
                  );
                  sumMaxMarks += actMaxMarks;
                } catch (e) {
                  console.error(`Error fetching activity ${actId} rubric:`, e);
                }
              }

              maxMarksMap[String(sub._id)] = sumMaxMarks || 0;

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
        setActivityMaxMarks(maxMarksMap);
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


  useEffect(() => {
    const fetchAcademicYear = async () => {
      try {
        const res = await getActiveAcademicYear();
        setAcademicYear(res.year); // backend returns { year: "2024-25" }
      } catch (err) {
        console.error("No active academic year found");
      }
    };

    fetchAcademicYear();
  }, []);


  const downloadSubjectReport = async (classId, subjectId, subjectName, className) => {
    try {
      setDownloading(true);

      /* ----------------- COLLECT ACTIVITY IDS SAFELY ----------------- */
      const activityIdsSet = new Set();

      Object.values(marksData).forEach(studentMarks => {
        const subjectMarks = studentMarks?.[subjectId];
        if (!subjectMarks?.activities) return;

        subjectMarks.activities.forEach(activity => {
          if (!activity?.activityId) return;

          // Normalize activityId (handles ObjectId / populated object / string)
          const activityId =
            typeof activity.activityId === "object"
              ? activity.activityId._id || activity.activityId
              : activity.activityId;

          activityIdsSet.add(String(activityId));
        });
      });

      if (activityIdsSet.size === 0) {
        showToast("error", "No marks available for this subject");
        return;
      }

      /* ----------------- FETCH ACTIVITIES ----------------- */
      const resActivities = await API.get("/activities/all");
      const allActivities = (resActivities.data.activities || []).map(a => ({
        ...a,
        _id: String(a._id),
        status: a.status?.trim()
      }));

      /* ----------------- FILTER VALID ACTIVITIES ----------------- */
      const validActivityIds = [];

      activityIdsSet.forEach(actId => {
        const activity = allActivities.find(a => a._id === actId);

        if (!activity) {
          console.warn("Activity not found in /activities/all:", actId);
          return;
        }

        if (activity.status === "Marks_Updated") {
          validActivityIds.push(actId);
        }
      });

      if (validActivityIds.length === 0) {
        showToast("error", "No activities with updated marks for this subject");
        return;
      }

      /* ----------------- DOWNLOAD REPORT ----------------- */
      const response = await API.post(
        "/marks/download-combined",
        { activityIds: validActivityIds },
        { responseType: "blob" }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${className}_${subjectName}_Report_${new Date().toLocaleDateString()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showToast("success", `Report for ${subjectName} downloaded successfully`);
    } catch (err) {
      console.error("Download error:", err);
      showToast("error", "Error downloading report");
    } finally {
      setDownloading(false);
    }
  };


  // Removed attendance handling functions

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ padding: "20px" }}>
      <h2 style={{ textAlign: "center", marginBottom: "10px" }}>
        Dashboard – Welcome {user?.name} 👋
      </h2>

      {academicYear && (
        <p style={{ textAlign: "center", color: "#555", marginBottom: "25px" }}>
          <b>Academic Year:</b> {academicYear}
        </p>
      )}

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

            const subjectMaxMarks = activityMaxMarks[String(sub._id)] || 0;

            // Determine the ordered list of activities for this subject (use first student with data)
            let activityList = [];
            const firstWithActivities = classStudents.find((stu) => {
              const data = marksData[String(stu._id)]?.[sub._id];
              return data?.activities?.length > 0;
            });

            if (firstWithActivities) {
              const data = marksData[String(firstWithActivities._id)]?.[sub._id];
              activityList = (data?.activities || []).map((act, idx) => ({
                id: getActivityId(act.activityId),
                name: act.activityId?.name || `Activity ${idx + 1}`,
              }));
            }

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
                      {activityList.map((act, idx) => (
                        <React.Fragment key={act.id || idx}>
                          <th>{act.name || `Activity ${idx + 1}`}</th>
                          <th>{act.name || `Activity ${idx + 1}`} Attendance</th>
                        </React.Fragment>
                      ))}
                      <th>Total {subjectMaxMarks > 0 ? `(out of ${subjectMaxMarks})` : ""}</th>
                      <th>Normalized out of 15</th>
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

                      // Build a map for quick lookup by activity id
                      const activityMap = new Map(
                        (data.activities || []).map((a) => [getActivityId(a.activityId), a])
                      );

                      // Prepare per-activity cells and compute totals
                      let total = 0;
                      const activityCells = activityList.map((act, idx) => {
                        const entry = activityMap.get(act.id);
                        const marks = entry?.totalRubricMarks || 0;
                        const attendance = entry?.attendance || 'Present';
                        const numeric = attendance === 'Present' ? marks : 0;
                        total += numeric;
                        return {
                          key: act.id || idx,
                          marks,
                          attendance,
                        };
                      });

                      // Calculate normalized marks out of 15
                      const normalizedMarks = subjectMaxMarks > 0 
                        ? Math.round((total / subjectMaxMarks) * 15)
                        : 0;

                      return (
                        <tr key={stu._id}>
                          <td>{stu.rollNumber}</td>
                          <td>{stu.name}</td>
                          {activityCells.map((c) => (
                            <React.Fragment key={c.key}>
                              <td>{c.marks}</td>
                              <td>{c.attendance}</td>
                            </React.Fragment>
                          ))}
                          <td>{total}</td>
                          <td>{normalizedMarks}</td>
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
