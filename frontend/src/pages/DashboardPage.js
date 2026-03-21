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

  const toRollNumber = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  };

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
          studentMap[cls._id] = [...(resStudents.data.students || [])].sort(
            (a, b) => toRollNumber(a.rollNumber) - toRollNumber(b.rollNumber)
          );

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
        setStudents(
          Object.values(studentMap)
            .flat()
            .sort((a, b) => toRollNumber(a.rollNumber) - toRollNumber(b.rollNumber))
        );
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

  if (loading) {
    return (
      <div className="faculty-dashboard">
        <div className="dashboard-panel" style={{ textAlign: "center" }}>
          <h3>Loading dashboard...</h3>
          <p className="muted">Fetching classes, subjects, students and activity marks.</p>
        </div>
      </div>
    );
  }

  const totalSubjects = classes.reduce(
    (sum, cls) => sum + (subjects[cls._id] || []).length,
    0
  );

  const totalStudents = students.length;

  return (
    <div className="faculty-dashboard">
      <div className="marquee-container" style={{ margin: "0" }}>
        <div className="marquee-text">
          🚀 Welcome back, {user?.name}! This is your <span className="marquee-highlight">Faculty Dashboard</span>. Track classes, subjects, student performance, and download comprehensive activity reports seamlessly. {academicYear ? `| Current Academic Year: ${academicYear}` : ""} ⚙️
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px", marginBottom: "8px" }}>
        <button className="btn btn-primary" onClick={() => setRefreshKey((prev) => prev + 1)}>
          <i className="fa fa-sync-alt" style={{ marginRight: "8px" }}></i> Refresh Data
        </button>
      </div>

      <section className="stats-grid">
        <article className="stat-card">
          <span>Assigned Classes</span>
          <strong>{classes.length}</strong>
        </article>
        <article className="stat-card">
          <span>Assigned Subjects</span>
          <strong>{totalSubjects}</strong>
        </article>
        <article className="stat-card">
          <span>Total Students</span>
          <strong>{totalStudents}</strong>
        </article>
        <article className="stat-card">
          <span>Updated Activities</span>
          <strong>{updatedActivitiesCount}</strong>
        </article>
      </section>

      {/* {updatedActivitiesCount < 2 && (
        <div className="status-alert status-alert-warn">
          Marks updated for {updatedActivitiesCount}/2 activities. Please update marks for both activities before downloading reports.
        </div>
      )} */}

      {classes.length === 0 && <div className="dashboard-panel">No classes assigned.</div>}

      {classes.map((cls) => (
        <div key={cls._id || `${cls.year}-${cls.division}`} className="class-block">
          <div className="class-block-header">
            <h3>
              Class {cls.year}-{cls.division}
            </h3>
          </div>

          {(subjects[cls._id] || []).length === 0 && <div className="dashboard-panel">No subjects assigned.</div>}

          {(subjects[cls._id] || []).map((sub) => {
            // Convert IDs to strings for consistent comparison
            const classStudents = students.filter((s) =>
              (s.year === cls.year && s.division === cls.division) || String(s.classId) === String(cls._id)
            ).sort((a, b) => toRollNumber(a.rollNumber) - toRollNumber(b.rollNumber));
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
              <section key={sub._id} className="subject-card">
                <div className="subject-card-header">
                  <div>
                    <h4>{sub.name}</h4>
                    <p className="muted">
                      Students: {classStudents.length} {subjectMaxMarks > 0 ? `• Total max marks: ${subjectMaxMarks}` : ""}
                    </p>
                  </div>
                  <button
                    className="btn btn-info"
                    onClick={() => downloadSubjectReport(cls._id, sub._id, sub.name, `${cls.year}-${cls.division}`)}
                    disabled={downloading}
                    style={{ opacity: downloading ? 0.6 : 1 }}
                    title={`Download marks report for ${sub.name}`}
                  >
                    {downloading ? "Downloading..." : "Download Report"}
                  </button>
                </div>

                <div className="subject-table-wrap">
                  <table className="subject-table">
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
                                <td>
                                  <span className={`attendance-pill ${c.attendance === "Present" ? "present" : "absent"}`}>
                                    {c.attendance}
                                  </span>
                                </td>
                              </React.Fragment>
                            ))}
                            <td><strong>{total}</strong></td>
                            <td><strong>{normalizedMarks}</strong></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default DashboardPage;
