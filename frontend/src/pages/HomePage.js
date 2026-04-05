import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getActiveAcademicYear,
  getAllClasses,
  getAllFaculties,
  getAllSubjects,
  getAllTeachingAssignments,
} from "../services/teachingAssignmentApi";
import { getCoordinatorDashboardAnalytics, getHodDashboardAnalytics } from "../services/dashboardAnalyticsApi";
import { getFacultyAssignments } from "../services/teaching";
import API from "../services/api";
import "./HomePage.css";

const YEAR_ORDER = ["SY", "TE", "BE"];
const YEAR_LABELS = {
  SY: "Second Year",
  TE: "Third Year",
  BE: "Fourth Year",
};
const YEAR_SHORT_LABELS = {
  SY: "SY",
  TE: "TY",
  BE: "BY",
};

const normalizeYear = (value) => {
  const cleaned = String(value || "").trim().toUpperCase();
  if (cleaned === "TY") return "TE";
  return cleaned;
};

const roundPct = (value) => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
};

const toId = (value) => {
  if (!value) return "";
  if (typeof value === "object") return String(value._id || value.id || "");
  return String(value);
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

function HomePage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Admin state
  const [activeYear, setActiveYear] = useState("-");
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [assignments, setAssignments] = useState([]);

  // Faculty state
  const [facultyAssignments, setFacultyAssignments] = useState([]);
  const [facultyActivities, setFacultyActivities] = useState([]);
  const [facultyStudentCountByClassKey, setFacultyStudentCountByClassKey] = useState({});
  const [coordinatorData, setCoordinatorData] = useState({
    isCoordinator: false,
    coordinatorSubjects: [],
    lifecycle: [],
    divisionActivity: [],
    activityTrend: [],
    facultyContribution: [],
  });
  const [coordinatorAssignments, setCoordinatorAssignments] = useState([]);
  const [coordinatorActivities, setCoordinatorActivities] = useState([]);
  const [coordinatorStudentCountByDivision, setCoordinatorStudentCountByDivision] = useState({});

  // HOD state
  const [hodAnalytics, setHodAnalytics] = useState({
    meta: { academicYears: [], divisions: [], subjects: [] },
    facultyStats: [],
    subjectPerformance: [],
    facultyStudentAnalysis: [],
    studentPerformanceTrend: [],
    passFail: [],
    facultyWorkload: [],
    facultyConsistency: [],
  });
  const [hodAssignments, setHodAssignments] = useState([]);
  const [hodActivities, setHodActivities] = useState([]);

  const [lastUpdated, setLastUpdated] = useState(null);

  const loadAdminHomeData = useCallback(async () => {
    setError("");
    try {
      const [yearRes, classesRes, subjectsRes, facultiesRes, assignmentsRes] = await Promise.all([
        getActiveAcademicYear(),
        getAllClasses(),
        getAllSubjects(),
        getAllFaculties(),
        getAllTeachingAssignments(),
      ]);

      setActiveYear(yearRes?.data?.year || "Not Set");
      setClasses(Array.isArray(classesRes) ? classesRes : []);
      setSubjects(Array.isArray(subjectsRes) ? subjectsRes : []);
      setFaculties(Array.isArray(facultiesRes) ? facultiesRes : []);
      setAssignments(Array.isArray(assignmentsRes) ? assignmentsRes : []);
      setLastUpdated(new Date());
    } catch (err) {
      setError("Unable to load admin home data right now.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFacultyHomeData = useCallback(async () => {
    setError("");

    try {
      const facultyId = user?.id || user?._id;
      if (!facultyId) {
        setError("Faculty session is missing user id.");
        setLoading(false);
        return;
      }

      const [yearRes, assignmentsRes, classesRes, activitiesRes] = await Promise.all([
        getActiveAcademicYear().catch(() => ({ data: { year: "Not Set" } })),
        getFacultyAssignments(facultyId).catch(() => []),
        API.get(`/classes/faculty/${facultyId}`).catch(() => ({ data: { classes: [] } })),
        API.get("/activities/all").catch(() => ({ data: { activities: [] } })),
      ]);

      const coordinatorAnalytics = await getCoordinatorDashboardAnalytics().catch(() => ({
        isCoordinator: false,
        coordinatorSubjects: [],
        lifecycle: [],
        divisionActivity: [],
        activityTrend: [],
        facultyContribution: [],
      }));

      setActiveYear(yearRes?.data?.year || "Not Set");

      const normalizedAssignments = Array.isArray(assignmentsRes) ? assignmentsRes : [];
      const normalizedClasses = Array.isArray(classesRes?.data?.classes) ? classesRes.data.classes : [];
      const allActivities = Array.isArray(activitiesRes?.data?.activities) ? activitiesRes.data.activities : [];

      setFacultyAssignments(normalizedAssignments);
      setCoordinatorData({
        isCoordinator: Boolean(coordinatorAnalytics?.isCoordinator),
        coordinatorSubjects: Array.isArray(coordinatorAnalytics?.coordinatorSubjects) ? coordinatorAnalytics.coordinatorSubjects : [],
        lifecycle: Array.isArray(coordinatorAnalytics?.lifecycle) ? coordinatorAnalytics.lifecycle : [],
        divisionActivity: Array.isArray(coordinatorAnalytics?.divisionActivity) ? coordinatorAnalytics.divisionActivity : [],
        activityTrend: Array.isArray(coordinatorAnalytics?.activityTrend) ? coordinatorAnalytics.activityTrend : [],
        facultyContribution: Array.isArray(coordinatorAnalytics?.facultyContribution) ? coordinatorAnalytics.facultyContribution : [],
      });

      const assignmentIds = new Set(normalizedAssignments.map((item) => toId(item._id)).filter(Boolean));
      const facultyActivitiesFiltered = allActivities
        .filter((item) => assignmentIds.has(toId(item.assignmentId)) || toId(item.coordinatorId) === String(facultyId))
        .sort((a, b) => new Date(a.scheduleDate || a.createdAt) - new Date(b.scheduleDate || b.createdAt));

      setFacultyActivities(facultyActivitiesFiltered);

      const studentCounts = {};
      await Promise.all(
        normalizedClasses.map(async (cls) => {
          try {
            const response = await API.get(`/activities/class/${cls._id}/students`);
            const count = Array.isArray(response?.data?.students) ? response.data.students.length : 0;
            studentCounts[`${normalizeYear(cls.year)}-${cls.division}`] = count;
          } catch (e) {
            studentCounts[`${normalizeYear(cls.year)}-${cls.division}`] = 0;
          }
        })
      );

      setFacultyStudentCountByClassKey(studentCounts);

      if (coordinatorAnalytics?.isCoordinator) {
        const [allAssignmentsRes, allClassesRes] = await Promise.all([
          getAllTeachingAssignments().catch(() => []),
          getAllClasses().catch(() => []),
        ]);

        const allAssignments = Array.isArray(allAssignmentsRes) ? allAssignmentsRes : [];
        const allClasses = Array.isArray(allClassesRes) ? allClassesRes : [];
        const subjectIdSet = new Set(
          (coordinatorAnalytics?.coordinatorSubjects || []).map((s) => String(s?._id || "")).filter(Boolean)
        );

        const relatedAssignments = allAssignments.filter((a) => {
          const sid = String(a?.subjectId?._id || a?.subjectId || "");
          return subjectIdSet.has(sid);
        });

        const assignmentIds = new Set(relatedAssignments.map((a) => String(a?._id || "")).filter(Boolean));
        const relatedActivities = allActivities
          .filter((act) => assignmentIds.has(String(act?.assignmentId || "")))
          .sort((a, b) => new Date(a.scheduleDate || a.createdAt) - new Date(b.scheduleDate || b.createdAt));

        setCoordinatorAssignments(relatedAssignments);
        setCoordinatorActivities(relatedActivities);

        const divisionCounts = {};
        await Promise.all(
          allClasses.map(async (cls) => {
            const key = `${normalizeYear(cls.year)}-${cls.division}`;
            try {
              const response = await API.get(`/activities/class/${cls._id}/students`);
              divisionCounts[key] = Array.isArray(response?.data?.students) ? response.data.students.length : 0;
            } catch {
              divisionCounts[key] = 0;
            }
          })
        );
        setCoordinatorStudentCountByDivision(divisionCounts);
      } else {
        setCoordinatorAssignments([]);
        setCoordinatorActivities([]);
        setCoordinatorStudentCountByDivision({});
      }

      setLastUpdated(new Date());
    } catch (err) {
      setError("Unable to load faculty home data right now.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadHodHomeData = useCallback(async () => {
    setError("");

    try {
      const [yearRes, hodRes, allAssignmentsRes, allActivitiesRes] = await Promise.all([
        getActiveAcademicYear().catch(() => ({ data: { year: "Not Set" } })),
        getHodDashboardAnalytics().catch(() => ({
          meta: { academicYears: [], divisions: [], subjects: [] },
          facultyStats: [],
          subjectPerformance: [],
          facultyStudentAnalysis: [],
          studentPerformanceTrend: [],
          passFail: [],
          facultyWorkload: [],
          facultyConsistency: [],
        })),
        getAllTeachingAssignments().catch(() => []),
        API.get("/activities/all").catch(() => ({ data: { activities: [] } })),
      ]);

      setActiveYear(yearRes?.data?.year || "Not Set");
      setHodAnalytics(hodRes || {
        meta: { academicYears: [], divisions: [], subjects: [] },
        facultyStats: [],
        subjectPerformance: [],
        facultyStudentAnalysis: [],
        studentPerformanceTrend: [],
        passFail: [],
        facultyWorkload: [],
        facultyConsistency: [],
      });
      setHodAssignments(Array.isArray(allAssignmentsRes) ? allAssignmentsRes : []);
      setHodActivities(Array.isArray(allActivitiesRes?.data?.activities) ? allActivitiesRes.data.activities : []);
      setLastUpdated(new Date());
    } catch (err) {
      setError("Unable to load HOD home data right now.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (user.role === "admin") {
      loadAdminHomeData();
      const intervalId = setInterval(loadAdminHomeData, 30000);
      return () => clearInterval(intervalId);
    }

    if (user.role === "Faculty") {
      loadFacultyHomeData();
      const intervalId = setInterval(loadFacultyHomeData, 30000);
      return () => clearInterval(intervalId);
    }

    if (user.role === "HOD") {
      loadHodHomeData();
      const intervalId = setInterval(loadHodHomeData, 30000);
      return () => clearInterval(intervalId);
    }

    setLoading(false);
    return undefined;
  }, [user, navigate, loadAdminHomeData, loadFacultyHomeData, loadHodHomeData]);

  const adminMetrics = useMemo(() => {
    const yearCards = YEAR_ORDER.map((year) => {
      const yearClasses = classes.filter((item) => normalizeYear(item.year) === year);
      const yearSubjects = subjects.filter((item) => normalizeYear(item.year) === year);
      const yearAssignments = assignments.filter((item) => normalizeYear(item.year) === year);

      const sectionCount = new Set(yearClasses.map((item) => String(item.division))).size;
      const subjectCount = yearSubjects.length;
      const assignedPairs = yearAssignments.length;
      const expectedPairs = sectionCount * subjectCount;
      const allocationPct = expectedPairs > 0 ? roundPct((assignedPairs / expectedPairs) * 100) : 0;

      return {
        year,
        shortLabel: YEAR_SHORT_LABELS[year] || year,
        label: YEAR_LABELS[year],
        sectionCount,
        subjectCount,
        assignedPairs,
        expectedPairs,
        allocationPct,
      };
    });

    const totalExpected = yearCards.reduce((sum, item) => sum + item.expectedPairs, 0);
    const totalAssigned = yearCards.reduce((sum, item) => sum + item.assignedPairs, 0);
    const overallAllocation = totalExpected > 0 ? roundPct((totalAssigned / totalExpected) * 100) : 0;

    return {
      yearCards,
      totalClasses: classes.length,
      totalSubjects: subjects.length,
      totalFaculties: faculties.length,
      totalAssignments: assignments.length,
      totalExpected,
      totalAssigned,
      overallAllocation,
      unassignedPairs: Math.max(totalExpected - totalAssigned, 0),
    };
  }, [classes, subjects, faculties, assignments]);

  const facultyMetrics = useMemo(() => {
    const assignmentsSorted = [...facultyAssignments].sort((a, b) => {
      const aYear = YEAR_ORDER.indexOf(normalizeYear(a.year));
      const bYear = YEAR_ORDER.indexOf(normalizeYear(b.year));
      if (aYear !== bYear) return aYear - bYear;
      return Number(a.division || 0) - Number(b.division || 0);
    });

    const activityByAssignmentId = new Map();
    facultyActivities.forEach((item) => {
      const assignmentId = toId(item.assignmentId);
      if (!assignmentId) return;
      activityByAssignmentId.set(assignmentId, (activityByAssignmentId.get(assignmentId) || 0) + 1);
    });

    const subjectCards = assignmentsSorted.map((item) => {
      const year = normalizeYear(item.year);
      const classKey = `${year}-${item.division}`;
      return {
        id: toId(item._id),
        subjectName: item.subjectId?.name || "Unnamed Subject",
        subjectCode: item.subjectId?.code || "-",
        classLabel: `${year}-${item.division}`,
        studentCount: facultyStudentCountByClassKey[classKey] || 0,
        activityCount: activityByAssignmentId.get(toId(item._id)) || 0,
      };
    });

    const now = Date.now();
    const upcoming = facultyActivities
      .filter((item) => item.scheduleDate && new Date(item.scheduleDate).getTime() >= now)
      .sort((a, b) => new Date(a.scheduleDate) - new Date(b.scheduleDate))
      .slice(0, 4)
      .map((item) => {
        const assignment = facultyAssignments.find((a) => toId(a._id) === toId(item.assignmentId));
        return {
          id: toId(item._id),
          name: item.name || "Unnamed Activity",
          date: item.scheduleDate,
          classLabel: assignment ? `${normalizeYear(assignment.year)}-${assignment.division}` : "-",
        };
      });

    const ongoing = facultyActivities
      .filter((item) => item.status !== "Marks_Updated")
      .sort((a, b) => new Date(a.scheduleDate || a.createdAt) - new Date(b.scheduleDate || b.createdAt))
      .slice(0, 8)
      .map((item) => {
        const assignment = facultyAssignments.find((a) => toId(a._id) === toId(item.assignmentId));
        return {
          id: toId(item._id),
          name: item.name || "Unnamed Activity",
          deadline: item.scheduleDate,
          status: item.status || "Scheduled",
          subject: assignment?.subjectId?.name || "-",
          classLabel: assignment ? `${normalizeYear(assignment.year)}-${assignment.division}` : "-",
        };
      });

    const marksUpdatedCount = facultyActivities.filter((item) => item.status === "Marks_Updated").length;
    const totalActivities = facultyActivities.length;
    const completionPct = totalActivities ? roundPct((marksUpdatedCount / totalActivities) * 100) : 0;

    const attendanceProxy = totalActivities
      ? roundPct(((facultyActivities.filter((item) => item.status === "Conducted" || item.status === "Marks_Updated").length) / totalActivities) * 100)
      : 0;

    return {
      subjectCards,
      ongoing,
      upcoming,
      totalActivities,
      pendingCount: ongoing.length,
      completionPct,
      attendanceProxy,
    };
  }, [facultyAssignments, facultyActivities, facultyStudentCountByClassKey]);

  const coordinatorMetrics = useMemo(() => {
    const lifecycleMap = new Map((coordinatorData.lifecycle || []).map((item) => [String(item.stage || ""), Number(item.count || 0)]));
    const inProgress = (lifecycleMap.get("Scheduled") || 0) + (lifecycleMap.get("Conducted") || 0);
    const delayed = coordinatorActivities.filter((a) => {
      if (!a?.scheduleDate) return false;
      const ts = new Date(a.scheduleDate).getTime();
      return Number.isFinite(ts) && ts < Date.now() && a.status !== "Marks_Updated";
    }).length;

    const totalOngoing = coordinatorActivities.filter((a) => a.status !== "Marks_Updated").length;
    const venueByDivision = (coordinatorData.divisionActivity || []).map((item) => {
      const division = String(item.division || "-");
      const total = Number(item.count || 0);
      const share = totalOngoing > 0 ? roundPct((total / totalOngoing) * 100) : 0;
      return { division, total, share };
    });

    const subjectCards = coordinatorAssignments
      .slice(0, 4)
      .map((assignment) => {
        const key = `${normalizeYear(assignment.year)}-${assignment.division}`;
        return {
          id: String(assignment._id || ""),
          name: assignment?.subjectId?.name || "Unnamed Subject",
          code: assignment?.subjectId?.code || "-",
          classLabel: key,
          students: coordinatorStudentCountByDivision[key] || 0,
        };
      });

    const upcoming = coordinatorActivities
      .filter((item) => item?.scheduleDate && new Date(item.scheduleDate).getTime() >= Date.now())
      .sort((a, b) => new Date(a.scheduleDate) - new Date(b.scheduleDate))
      .slice(0, 5)
      .map((item) => {
        const assignment = coordinatorAssignments.find((a) => String(a._id) === String(item.assignmentId));
        return {
          id: String(item._id || ""),
          name: item.name || "Unnamed Activity",
          classLabel: assignment ? `${normalizeYear(assignment.year)}-${assignment.division}` : "-",
          date: item.scheduleDate,
        };
      });

    const nextDates = [...new Set(upcoming.map((item) => {
      const d = new Date(item.date);
      if (Number.isNaN(d.getTime())) return null;
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }).filter(Boolean))]
      .slice(0, 5)
      .map((isoDate) => {
        const d = new Date(`${isoDate}T00:00:00`);
        return {
          isoDate,
          dayName: d.toLocaleString("en-IN", { weekday: "short" }).toUpperCase(),
          dateNum: String(d.getDate()),
          load: upcoming.filter((u) => {
            const ud = new Date(u.date);
            if (Number.isNaN(ud.getTime())) return false;
            const k = `${ud.getFullYear()}-${String(ud.getMonth() + 1).padStart(2, "0")}-${String(ud.getDate()).padStart(2, "0")}`;
            return k === isoDate;
          }).length,
        };
      });

    return {
      isCoordinator: coordinatorData.isCoordinator,
      totalOngoing,
      inProgress,
      delayed,
      subjectCards,
      venueByDivision,
      upcoming,
      nextDates,
      totalSubjects: coordinatorData.coordinatorSubjects.length,
    };
  }, [coordinatorData, coordinatorAssignments, coordinatorActivities, coordinatorStudentCountByDivision]);

  const hodMetrics = useMemo(() => {
    const assignmentById = new Map((hodAssignments || []).map((a) => [String(a?._id || ""), a]));

    const enrichedActivities = (hodActivities || []).map((activity) => {
      const assignment = assignmentById.get(String(activity?.assignmentId || ""));
      return {
        id: String(activity?._id || ""),
        name: activity?.name || "Unnamed Activity",
        status: activity?.status || "Scheduled",
        scheduleDate: activity?.scheduleDate,
        facultyName: assignment?.facultyId?.name || "Unknown Faculty",
        subjectName: assignment?.subjectId?.name || "Unknown Subject",
        classLabel: assignment ? `${normalizeYear(assignment.year)}-${assignment.division}` : "-",
      };
    });

    const totalActivities = enrichedActivities.length;
    const completedCount = enrichedActivities.filter((a) => a.status === "Marks_Updated").length;
    const successRate = totalActivities > 0 ? roundPct((completedCount / totalActivities) * 100) : 0;

    const avgAttendance = (() => {
      const arr = Array.isArray(hodAnalytics?.facultyConsistency) ? hodAnalytics.facultyConsistency : [];
      if (!arr.length) return 0;
      const sum = arr.reduce((acc, cur) => acc + Number(cur?.attendanceScore || 0), 0);
      return Number((sum / arr.length).toFixed(1));
    })();

    const approvalRequests = enrichedActivities
      .filter((a) => a.status === "Scheduled")
      .sort((a, b) => new Date(a.scheduleDate || 0) - new Date(b.scheduleDate || 0));

    const facultyPerformanceTop = [...(hodAnalytics?.facultyStats || [])]
      .sort((a, b) => Number(b?.avgMarks || 0) - Number(a?.avgMarks || 0))
      .slice(0, 4);

    const subjectPerformanceTop = [...(hodAnalytics?.subjectPerformance || [])]
      .sort((a, b) => Number(b?.avgMarks || 0) - Number(a?.avgMarks || 0))
      .slice(0, 3);

    const recentLogs = [...enrichedActivities]
      .sort((a, b) => new Date(b.scheduleDate || 0) - new Date(a.scheduleDate || 0))
      .slice(0, 6);

    return {
      totalActivities,
      successRate,
      avgAttendance,
      approvalRequests,
      facultyPerformanceTop,
      subjectPerformanceTop,
      recentLogs,
      subjectCount: Array.isArray(hodAnalytics?.meta?.subjects) ? hodAnalytics.meta.subjects.length : 0,
      divisionName: "Computer Science Division",
    };
  }, [hodAnalytics, hodAssignments, hodActivities]);

  if (!user) return null;

  if (user.role === "admin") {
    return (
      <div className="home-shell">
        <section className="home-hero">
          <div>
            <p className="home-kicker">Admin Tools</p>
            <h1 className="home-title">Subject Allocations</h1>
            <p className="home-subtitle">
              Manage and monitor class-wise subject allocations using live system data from current academic records.
            </p>
          </div>

          <div className="home-hero-meta">
            <span className="home-year-chip">Academic Year: {activeYear}</span>
            <button className="home-refresh" onClick={loadAdminHomeData} type="button">
              Refresh Data
            </button>
          </div>
        </section>

        {loading ? <div className="home-loading">Loading admin overview...</div> : null}
        {error ? <div className="home-error">{error}</div> : null}

        {!loading && !error ? (
          <div className="home-grid">
            <div className="home-main">
              <div className="year-grid">
                {adminMetrics.yearCards.map((card) => (
                  <article key={card.year} className="home-card year-card">
                    <div className="year-icon">
                      <i className="fa fa-book" />
                    </div>
                    <p className="year-title">{card.shortLabel}</p>
                    <p className="year-name">{card.label}</p>
                    <p className="year-meta">
                      {card.sectionCount} section(s) | {card.subjectCount} subject(s)
                    </p>
                    <p className="year-meta">{card.assignedPairs} / {card.expectedPairs || 0} mapped</p>
                  </article>
                ))}
              </div>

              <section className="home-card alloc-card">
                <div className="section-head">
                  <h3 className="section-title">Live Allocation Status</h3>
                  <span className="section-badge">Overall {adminMetrics.overallAllocation}%</span>
                </div>

                {adminMetrics.yearCards.map((card) => (
                  <div key={`${card.year}-progress`} className="alloc-item">
                    <div className="alloc-meta">
                      <span>{card.label}</span>
                      <span>{card.allocationPct}% Allocated</span>
                    </div>
                    <div className="alloc-rail">
                      <div className="alloc-fill" style={{ width: `${card.allocationPct}%` }} />
                    </div>
                  </div>
                ))}
              </section>
            </div>

            <aside className="home-side">
              <section className="home-card capacity-card">
                <p className="capacity-kicker">Faculty Capacity</p>
                <p className="capacity-big">
                  {adminMetrics.totalAssignments} / {adminMetrics.totalExpected || 0}
                </p>
                <p className="capacity-sub">
                  Subject-division mappings completed out of total expected allocations from current classes and subjects.
                </p>
              </section>

              <section className="home-card quick-card">
                <h4 className="quick-title">Quick Analytics</h4>

                <div className="quick-row">
                  <p className="quick-label">Total Classes</p>
                  <p className="quick-value">{adminMetrics.totalClasses}</p>
                </div>

                <div className="quick-row">
                  <p className="quick-label">Active Faculties</p>
                  <p className="quick-value">{adminMetrics.totalFaculties}</p>
                </div>

                <div className="quick-row">
                  <p className="quick-label">Total Subjects</p>
                  <p className="quick-value">{adminMetrics.totalSubjects}</p>
                </div>

                <div className="quick-row">
                  <p className="quick-label">Unassigned Subject-Slots</p>
                  <p className="quick-value">{adminMetrics.unassignedPairs}</p>
                </div>
              </section>
            </aside>
          </div>
        ) : null}

        {!loading && !error && lastUpdated ? (
          <div className="home-empty" style={{ marginTop: "16px" }}>
            Last synced: {lastUpdated.toLocaleDateString()} {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        ) : null}
      </div>
    );
  }

  if (user.role === "HOD") {
    return (
      <div className="home-shell hod-home-shell">
        <section className="hod-hero">
          <div>
            <h1 className="hod-title">HOD Dashboard</h1>
            <p className="hod-subtitle">{hodMetrics.divisionName} • Academic Year {activeYear}</p>
          </div>
          <div className="hod-hero-actions">
            <span className="home-year-chip">Subjects: {hodMetrics.subjectCount}</span>
            <button className="home-refresh" onClick={loadHodHomeData} type="button">
              Refresh Data
            </button>
          </div>
        </section>

        {loading ? <div className="home-loading">Loading HOD overview...</div> : null}
        {error ? <div className="home-error">{error}</div> : null}

        {!loading && !error ? (
          <div className="hod-grid">
            <section className="hod-main">
              <div className="hod-kpi-row">
                <article className="home-card hod-kpi-card">
                  <p>Total Activities</p>
                  <h3>{hodMetrics.totalActivities}</h3>
                </article>
                <article className="home-card hod-kpi-card">
                  <p>Completion Success</p>
                  <h3>{hodMetrics.successRate}%</h3>
                </article>
                <article className="home-card hod-kpi-card">
                  <p>Avg Faculty Consistency</p>
                  <h3>{hodMetrics.avgAttendance}%</h3>
                </article>
              </div>

              <article className="home-card hod-approval-card">
                <div className="hod-section-head">
                  <h2>Pending Activity Watch</h2>
                  <span>{hodMetrics.approvalRequests.length} open</span>
                </div>
                <div className="hod-approval-list">
                  {hodMetrics.approvalRequests.length === 0 ? (
                    <p className="home-empty">No pending scheduled activities.</p>
                  ) : (
                    hodMetrics.approvalRequests.slice(0, 6).map((item) => (
                      <div key={item.id} className="hod-approval-item">
                        <div>
                          <p className="hod-approval-title">{item.name}</p>
                          <p className="hod-approval-meta">{item.subjectName} • {item.classLabel} • {item.facultyName}</p>
                        </div>
                        <span>{formatDateTime(item.scheduleDate)}</span>
                      </div>
                    ))
                  )}
                </div>
              </article>

              <article className="home-card hod-log-card">
                <div className="hod-section-head">
                  <h2>Recent Activity Logs</h2>
                  <span>Latest 6 records</span>
                </div>
                <table className="faculty-table hod-table">
                  <thead>
                    <tr>
                      <th>Activity</th>
                      <th>Faculty</th>
                      <th>Subject</th>
                      <th>Scheduled</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hodMetrics.recentLogs.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="faculty-empty-row">No activity logs found.</td>
                      </tr>
                    ) : (
                      hodMetrics.recentLogs.map((item) => (
                        <tr key={item.id}>
                          <td>{item.name}</td>
                          <td>{item.facultyName}</td>
                          <td>{item.subjectName}</td>
                          <td>{formatDateTime(item.scheduleDate)}</td>
                          <td>
                            <span className={`faculty-status ${String(item.status || "").toLowerCase()}`}>
                              {String(item.status || "-").replace("_", " ")}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </article>
            </section>

            <aside className="hod-side">
              <article className="home-card hod-side-card">
                <h3>Faculty Performance</h3>
                {hodMetrics.facultyPerformanceTop.length === 0 ? (
                  <p className="home-empty">No faculty performance records.</p>
                ) : (
                  <div className="hod-rank-list">
                    {hodMetrics.facultyPerformanceTop.map((item) => (
                      <div key={item.facultyId} className="hod-rank-item">
                        <div>
                          <p>{item.facultyName || "Faculty"}</p>
                          <span>{Number(item.totalActivities || 0)} activities</span>
                        </div>
                        <strong>{Number(item.avgMarks || 0).toFixed(1)}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </article>

              <article className="home-card hod-side-card">
                <h3>Subject Outcome Snapshot</h3>
                {hodMetrics.subjectPerformanceTop.length === 0 ? (
                  <p className="home-empty">No subject analytics available.</p>
                ) : (
                  <div className="hod-rank-list">
                    {hodMetrics.subjectPerformanceTop.map((item) => (
                      <div key={item.subjectName} className="hod-rank-item">
                        <div>
                          <p>{item.subjectName}</p>
                          <span>{Number(item.activities || 0)} activities</span>
                        </div>
                        <strong>{Number(item.avgMarks || 0).toFixed(1)}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </article>

            </aside>
          </div>
        ) : null}

        {!loading && !error && lastUpdated ? (
          <div className="home-empty" style={{ marginTop: "16px" }}>
            Last synced: {lastUpdated.toLocaleDateString()} {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        ) : null}
      </div>
    );
  }

  if (user.role === "Faculty") {
    if (coordinatorMetrics.isCoordinator) {
      return (
        <div className="home-shell coordinator-shell">
          <section className="coordinator-hero">
            <h1 className="coordinator-title">Coordinator Dashboard</h1>
            <p className="coordinator-subtitle">Academic Year {activeYear} • Subject Coordination Overview</p>
          </section>

          {loading ? <div className="home-loading">Loading coordinator overview...</div> : null}
          {error ? <div className="home-error">{error}</div> : null}

          {!loading && !error ? (
            <div className="coordinator-grid">
              <section className="coordinator-main">
                <article className="home-card coordinator-events-card">
                  <div className="coordinator-events-head">
                    <div>
                      <h2>Active Events & Activities</h2>
                      <p>Currently monitoring {coordinatorMetrics.totalOngoing} ongoing activity records</p>
                    </div>
                    <span className="coordinator-link">Live Data</span>
                  </div>

                  <div className="coordinator-events-grid">
                    <div className="coordinator-event-item in-progress">
                      <div className="coordinator-event-meta">
                        <span className="event-pill">In Progress</span>
                        <span>{coordinatorMetrics.inProgress} active</span>
                      </div>
                      <h3>Execution Monitoring</h3>
                      <p>Activities currently scheduled or conducted under coordinator subjects.</p>
                    </div>
                    <div className="coordinator-event-item delayed">
                      <div className="coordinator-event-meta">
                        <span className="event-pill delayed-pill">Delayed</span>
                        <span>{coordinatorMetrics.delayed} flagged</span>
                      </div>
                      <h3>Deadline Watch</h3>
                      <p>Activities with schedule date passed and marks not updated yet.</p>
                    </div>
                  </div>
                </article>

                <div className="coordinator-lower-grid">
                  <article className="home-card coordinator-resource-card">
                    <h3>Resource Inventory</h3>
                    {coordinatorMetrics.subjectCards.length === 0 ? (
                      <p className="coordinator-empty">No coordinator subject records found.</p>
                    ) : (
                      <div className="coordinator-resource-list">
                        {coordinatorMetrics.subjectCards.map((item) => (
                          <div key={item.id} className="coordinator-resource-row">
                            <div>
                              <p className="resource-name">{item.name}</p>
                              <p className="resource-sub">{item.classLabel} • {item.students} students</p>
                            </div>
                            <span className="resource-code">{item.code}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>

                  <article className="home-card coordinator-schedule-card">
                    <div className="coordinator-schedule-head">
                      <h3>Weekly Schedule Preview</h3>
                    </div>
                    {coordinatorMetrics.nextDates.length === 0 ? (
                      <p className="coordinator-empty">No upcoming scheduled slots.</p>
                    ) : (
                      <div className="coordinator-day-row">
                        {coordinatorMetrics.nextDates.map((day) => (
                          <div key={day.isoDate} className={`coordinator-day-card ${day.load > 0 ? "active" : ""}`}>
                            <p>{day.dayName}</p>
                            <strong>{day.dateNum}</strong>
                            <span>{day.load} item(s)</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                </div>
              </section>

              <aside className="coordinator-side">
                <article className="home-card coordinator-venue-card">
                  <h3>Venue Allocation Status</h3>
                  {(coordinatorMetrics.venueByDivision.length === 0 ? [{ division: "N/A", share: 0 }] : coordinatorMetrics.venueByDivision)
                    .slice(0, 3)
                    .map((item) => (
                      <div key={item.division} className="venue-row">
                        <div className="venue-meta">
                          <span>{item.division}</span>
                          <span>{item.share}%</span>
                        </div>
                        <div className="alloc-rail">
                          <div className="alloc-fill" style={{ width: `${item.share}%` }} />
                        </div>
                      </div>
                    ))}
                </article>
              </aside>
            </div>
          ) : null}

          {!loading && !error && lastUpdated ? (
            <div className="home-empty" style={{ marginTop: "16px" }}>
              Last synced: {lastUpdated.toLocaleDateString()} {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
          ) : null}
        </div>
      );
    }

    return (
      <div className="home-shell faculty-home-shell">
        <section className="faculty-hero">
          <div>
            <h1 className="faculty-title">Faculty Dashboard</h1>
            <p className="faculty-subtitle">
              Welcome back, {user?.name || "Faculty"}. You have {facultyMetrics.pendingCount} pending submissions and {facultyMetrics.subjectCards.length} assigned subjects in the current cycle.
            </p>
          </div>
          <div className="faculty-hero-actions">
            <span className="home-year-chip">Academic Year: {activeYear}</span>
            <button className="home-refresh" onClick={loadFacultyHomeData} type="button">
              Refresh Data
            </button>
          </div>
        </section>

        {loading ? <div className="home-loading">Loading faculty overview...</div> : null}
        {error ? <div className="home-error">{error}</div> : null}

        {!loading && !error ? (
          <div className="faculty-grid">
            <section className="faculty-main">
              <div className="faculty-section-head">
                <h2 className="faculty-section-title">My Assigned Subjects</h2>
                <span className="faculty-mini-link">Total {facultyMetrics.subjectCards.length}</span>
              </div>

              <div className="faculty-subject-grid">
                {facultyMetrics.subjectCards.length === 0 ? (
                  <div className="home-empty">No assigned subjects found.</div>
                ) : (
                  facultyMetrics.subjectCards.map((card) => (
                    <article key={card.id} className="home-card faculty-subject-card">
                      <div className="faculty-subject-top">
                        <div className="faculty-subject-icon">
                          <i className="fa fa-book" />
                        </div>
                        <span className="faculty-subject-code">{card.subjectCode}</span>
                      </div>
                      <h3 className="faculty-subject-title">{card.subjectName}</h3>
                      <p className="faculty-subject-meta">Class: {card.classLabel}</p>
                      <div className="faculty-subject-foot">
                        <span>{card.studentCount} students</span>
                        <span>{card.activityCount} activities</span>
                      </div>
                    </article>
                  ))
                )}
              </div>

              <div className="faculty-section-head" style={{ marginTop: "22px" }}>
                <h2 className="faculty-section-title">Ongoing Activity Submissions</h2>
              </div>

              <div className="home-card faculty-table-card">
                <table className="faculty-table">
                  <thead>
                    <tr>
                      <th>Activity Name</th>
                      <th>Subject</th>
                      <th>Class</th>
                      <th>Deadline</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facultyMetrics.ongoing.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="faculty-empty-row">No pending activity submissions.</td>
                      </tr>
                    ) : (
                      facultyMetrics.ongoing.map((item) => (
                        <tr key={item.id}>
                          <td>{item.name}</td>
                          <td>{item.subject}</td>
                          <td>{item.classLabel}</td>
                          <td>{formatDateTime(item.deadline)}</td>
                          <td>
                            <span className={`faculty-status ${String(item.status || "").toLowerCase()}`}>
                              {String(item.status || "-").replace("_", " ")}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <aside className="faculty-side">
              <section className="home-card faculty-metric-card">
                <h3 className="faculty-side-title">Teaching Metrics</h3>

                <div className="faculty-progress-row">
                  <div className="faculty-progress-meta">
                    <span>Submission Completion</span>
                    <strong>{facultyMetrics.completionPct}%</strong>
                  </div>
                  <div className="alloc-rail">
                    <div className="alloc-fill" style={{ width: `${facultyMetrics.completionPct}%` }} />
                  </div>
                </div>

                <div className="faculty-progress-row" style={{ marginTop: "14px" }}>
                  <div className="faculty-progress-meta">
                    <span>Conducted Activity Ratio</span>
                    <strong>{facultyMetrics.attendanceProxy}%</strong>
                  </div>
                  <div className="alloc-rail">
                    <div className="alloc-fill faculty-fill-alt" style={{ width: `${facultyMetrics.attendanceProxy}%` }} />
                  </div>
                </div>
              </section>

              <section className="home-card faculty-calendar-card">
                <h3 className="faculty-side-title">Academic Calendar</h3>
                {facultyMetrics.upcoming.length === 0 ? (
                  <p className="faculty-calendar-empty">No upcoming scheduled activities.</p>
                ) : (
                  <ul className="faculty-calendar-list">
                    {facultyMetrics.upcoming.map((item) => {
                      const dateObj = new Date(item.date);
                      const day = Number.isNaN(dateObj.getTime()) ? "--" : String(dateObj.getDate()).padStart(2, "0");
                      const mon = Number.isNaN(dateObj.getTime())
                        ? "---"
                        : dateObj.toLocaleString("en-IN", { month: "short" }).toUpperCase();

                      return (
                        <li key={item.id} className="faculty-calendar-item">
                          <div className="faculty-date-box">
                            <span>{mon}</span>
                            <strong>{day}</strong>
                          </div>
                          <div>
                            <p className="faculty-calendar-name">{item.name}</p>
                            <p className="faculty-calendar-meta">{item.classLabel} | {formatDateTime(item.date)}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </aside>
          </div>
        ) : null}

        {!loading && !error && lastUpdated ? (
          <div className="home-empty" style={{ marginTop: "16px" }}>
            Last synced: {lastUpdated.toLocaleDateString()} {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="home-shell">
      <div className="home-empty">Home overview is not configured for this role yet.</div>
    </div>
  );
}

export default HomePage;
