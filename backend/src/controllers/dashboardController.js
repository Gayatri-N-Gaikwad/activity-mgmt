import Activity from "../models/Activity.js";
import StudentSubjectMarks from "../models/StudentSubjectMarks.js";
import TeachingAssignment from "../models/TeachingAssignment.js";
import Subject from "../models/Subject.js";
import Student from "../models/Student.js";

const toId = (value) => String(value || "");
const toMonthKey = (dateValue) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}`;
};

const toDayKey = (dateValue) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

const buildActivityFilterContext = async ({ academicYear, subject, division }) => {
  const assignmentFilter = {};

  if (academicYear && academicYear !== "all") {
    assignmentFilter.year = academicYear;
  }

  if (division && division !== "all") {
    assignmentFilter.division = division;
  }

  if (subject && subject !== "all") {
    const subjectDoc = await Subject.findOne({ name: subject }).select("_id").lean();
    assignmentFilter.subjectId = subjectDoc?._id || null;
  }

  const assignments = await TeachingAssignment.find(assignmentFilter)
    .populate("subjectId", "name")
    .populate("facultyId", "name")
    .lean();

  const assignmentIds = new Set(assignments.map((a) => toId(a._id)));
  const subjectNameMap = new Map();
  const facultyNameMap = new Map();

  assignments.forEach((a) => {
    subjectNameMap.set(toId(a.subjectId?._id || a.subjectId), a.subjectId?.name || "Unknown Subject");
    facultyNameMap.set(toId(a.facultyId?._id || a.facultyId), a.facultyId?.name || "Unknown Faculty");
  });

  return {
    assignments,
    assignmentIds,
    subjectNameMap,
    facultyNameMap,
  };
};

export const getAdminDashboardStats = async (req, res) => {
  try {
    const { academicYear = "all", subject = "all", division = "all" } = req.query;

    const ctx = await buildActivityFilterContext({ academicYear, subject, division });
    const activities = await Activity.find().lean();

    const filteredActivities = activities.filter((a) => {
      if (!a.assignmentId) return false;
      return ctx.assignmentIds.has(toId(a.assignmentId));
    });

    const assignmentById = new Map(ctx.assignments.map((a) => [toId(a._id), a]));

    const divisionMap = new Map();
    const divisionCompletionMap = new Map();
    const activityTrendMap = new Map();
    const activityLoadByDateMap = new Map();
    const lifecycle = { scheduled: 0, conducted: 0, marksUpdated: 0 };

    filteredActivities.forEach((a) => {
      const assignment = assignmentById.get(toId(a.assignmentId));
      if (!assignment) return;

      const divisionKey = String(assignment.year || "Unknown");
      if (!divisionMap.has(divisionKey)) {
        divisionMap.set(divisionKey, {
          division: divisionKey,
          scheduled: 0,
          conducted: 0,
          marksUpdated: 0,
        });
      }

      const row = divisionMap.get(divisionKey);
      if (a.status === "Scheduled") row.scheduled += 1;
      if (a.status === "Conducted") row.conducted += 1;
      if (a.status === "Marks_Updated") row.marksUpdated += 1;

      if (!divisionCompletionMap.has(divisionKey)) {
        divisionCompletionMap.set(divisionKey, { division: divisionKey, total: 0, completed: 0 });
      }

      const completionRow = divisionCompletionMap.get(divisionKey);
      completionRow.total += 1;
      if (a.status === "Marks_Updated") completionRow.completed += 1;

      if (a.status === "Scheduled") lifecycle.scheduled += 1;
      if (a.status === "Conducted") lifecycle.conducted += 1;
      if (a.status === "Marks_Updated") lifecycle.marksUpdated += 1;

      const trendKey = toMonthKey(
        a.conductedConfirmation?.confirmedAt || a.updatedAt || a.scheduleDate || a.createdAt
      );
      if (trendKey) {
        activityTrendMap.set(trendKey, (activityTrendMap.get(trendKey) || 0) + 1);
      }

      const dayKey = toDayKey(a.scheduleDate || a.createdAt);
      if (dayKey) {
        activityLoadByDateMap.set(dayKey, (activityLoadByDateMap.get(dayKey) || 0) + 1);
      }
    });

    const activityIdSet = new Set(filteredActivities.map((a) => toId(a._id)));

    const subjectMarksDocs = await StudentSubjectMarks.find().lean();
    const performanceAccumulator = new Map();
    let presentCount = 0;
    let absentCount = 0;
    const marksDistribution = { "0-5": 0, "5-10": 0, "10-15": 0 };

    subjectMarksDocs.forEach((doc) => {
      const assignment = ctx.assignments.find(
        (a) => toId(a.subjectId?._id || a.subjectId) === toId(doc.subjectId) && a.year === doc.year && a.division === doc.division
      );

      if (!assignment) return;

      const subjectName = ctx.subjectNameMap.get(toId(doc.subjectId)) || "Unknown Subject";
      const key = `${doc.year}__${subjectName}`;
      const prev = performanceAccumulator.get(key) || {
        division: doc.year,
        subject: subjectName,
        total: 0,
        count: 0,
      };

      prev.total += Number(doc.totalMarks || 0);
      prev.count += 1;
      performanceAccumulator.set(key, prev);

      const score = Number(doc.totalMarks || 0);
      if (score < 5) marksDistribution["0-5"] += 1;
      else if (score < 10) marksDistribution["5-10"] += 1;
      else marksDistribution["10-15"] += 1;

      (doc.activities || []).forEach((act) => {
        if (!activityIdSet.has(toId(act.activityId))) return;
        if (act.attendance === "Absent") absentCount += 1;
        else presentCount += 1;
      });
    });

    const timeliness = { onTime: 0, delayed: 0 };
    filteredActivities.forEach((a) => {
      const confirmedAt = a.conductedConfirmation?.confirmedAt;
      if (!a.scheduleDate || !confirmedAt) return;
      const scheduledTs = new Date(a.scheduleDate).getTime();
      const actualTs = new Date(confirmedAt).getTime();
      if (Number.isNaN(scheduledTs) || Number.isNaN(actualTs)) return;
      if (actualTs <= scheduledTs + 24 * 60 * 60 * 1000) timeliness.onTime += 1;
      else timeliness.delayed += 1;
    });

    const performance = Array.from(performanceAccumulator.values()).map((p) => ({
      division: p.division,
      subject: p.subject,
      avgMarks: p.count ? Number((p.total / p.count).toFixed(2)) : 0,
    }));

    const divisionCompletionRate = Array.from(divisionCompletionMap.values()).map((row) => ({
      division: row.division,
      completionRate: row.total ? Number(((row.completed / row.total) * 100).toFixed(2)) : 0,
      completed: row.completed,
      total: row.total,
    }));

    const activityTrend = Array.from(activityTrendMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([period, count]) => ({ period, count }));

    const activityLoadByDate = Array.from(activityLoadByDateMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, count }));

    return res.json({
      meta: {
        academicYears: ["SY", "TE", "BE"],
        subjects: Array.from(new Set(ctx.assignments.map((a) => a.subjectId?.name).filter(Boolean))),
        divisions: Array.from(new Set(ctx.assignments.map((a) => a.division).filter(Boolean))),
      },
      divisionProgress: Array.from(divisionMap.values()),
      performance,
      attendance: [{ name: "All", present: presentCount, absent: absentCount }],
      activityTrend,
      divisionCompletionRate,
      marksDistribution: Object.entries(marksDistribution).map(([range, count]) => ({ range, count })),
      lifecycle: [
        { stage: "Scheduled", count: lifecycle.scheduled },
        { stage: "Conducted", count: lifecycle.conducted },
        { stage: "Marks Updated", count: lifecycle.marksUpdated },
      ],
      timeliness: [
        { name: "On Time", value: timeliness.onTime },
        { name: "Delayed", value: timeliness.delayed },
      ],
      activityLoadByDate,
    });
  } catch (error) {
    console.error("getAdminDashboardStats error:", error);
    return res.status(500).json({ error: "Unable to load admin dashboard stats" });
  }
};

export const getHodDashboardStats = async (req, res) => {
  try {
    const { academicYear = "all", division = "all", subject = "all" } = req.query;
    const assignmentFilter = {};
    if (academicYear && academicYear !== "all") assignmentFilter.year = academicYear;
    if (division && division !== "all") assignmentFilter.division = division;
    if (subject && subject !== "all") {
      const subjectDoc = await Subject.findOne({ name: subject }).select("_id").lean();
      assignmentFilter.subjectId = subjectDoc?._id || null;
    }

    const assignments = await TeachingAssignment.find(assignmentFilter)
      .populate("facultyId", "name")
      .populate("subjectId", "name")
      .lean();

    const studentMarksDocs = await StudentSubjectMarks.find().lean();
    const students = await Student.find().select("_id name").lean();
    const studentNameById = new Map(students.map((s) => [toId(s._id), s.name]));

    const facultyAgg = new Map();
    const subjectAgg = new Map();
    const analysisRows = [];
    const facultyWorkloadMap = new Map();
    const facultyAttendanceMap = new Map();
    const passFail = { pass: 0, fail: 0 };
    const subjectTrendMap = new Map();

    const assignmentLookup = new Map();
    assignments.forEach((a) => {
      const key = `${toId(a.subjectId?._id || a.subjectId)}__${a.year}__${a.division}`;
      assignmentLookup.set(key, a);

      const facultyId = toId(a.facultyId?._id || a.facultyId);
      const current = facultyWorkloadMap.get(facultyId) || {
        facultyId,
        facultyName: a.facultyId?.name || "Unknown Faculty",
        assignmentCount: 0,
        subjects: new Set(),
        activitiesCount: 0,
      };
      current.assignmentCount += 1;
      current.subjects.add(toId(a.subjectId?._id || a.subjectId));
      facultyWorkloadMap.set(facultyId, current);
    });

    const activities = await Activity.find().lean();
    const conductedByFaculty = new Map();
    const marksUpdatedByFaculty = new Map();
    const timelinessByFaculty = new Map();

    activities.forEach((a) => {
      if (!a.assignmentId) return;
      const assignment = assignments.find((as) => toId(as._id) === toId(a.assignmentId));
      if (!assignment) return;

      const facultyId = toId(assignment.facultyId?._id || assignment.facultyId);
      const workload = facultyWorkloadMap.get(facultyId);
      if (workload) workload.activitiesCount += 1;

      if (a.status === "Conducted" || a.status === "Marks_Updated") {
        const count = conductedByFaculty.get(facultyId) || 0;
        conductedByFaculty.set(facultyId, count + 1);
      }

      if (a.status === "Marks_Updated") {
        marksUpdatedByFaculty.set(facultyId, (marksUpdatedByFaculty.get(facultyId) || 0) + 1);
      }

      const confirmedAt = a.conductedConfirmation?.confirmedAt;
      if (a.scheduleDate && confirmedAt) {
        const scheduledTs = new Date(a.scheduleDate).getTime();
        const actualTs = new Date(confirmedAt).getTime();
        if (!Number.isNaN(scheduledTs) && !Number.isNaN(actualTs)) {
          const current = timelinessByFaculty.get(facultyId) || { onTime: 0, delayed: 0 };
          if (actualTs <= scheduledTs + 24 * 60 * 60 * 1000) current.onTime += 1;
          else current.delayed += 1;
          timelinessByFaculty.set(facultyId, current);
        }
      }
    });

    studentMarksDocs.forEach((doc) => {
      const key = `${toId(doc.subjectId)}__${doc.year}__${doc.division}`;
      const assignment = assignmentLookup.get(key);
      if (!assignment) return;

      const facultyId = toId(assignment.facultyId?._id || assignment.facultyId);
      const facultyName = assignment.facultyId?.name || "Unknown Faculty";
      const subjectId = toId(assignment.subjectId?._id || assignment.subjectId);
      const subjectName = assignment.subjectId?.name || "Unknown Subject";
      const totalMarks = Number(doc.totalMarks || 0);
      if (totalMarks >= 6) passFail.pass += 1;
      else passFail.fail += 1;

      const facultyPrev = facultyAgg.get(facultyId) || {
        facultyId,
        facultyName,
        total: 0,
        count: 0,
      };
      facultyPrev.total += totalMarks;
      facultyPrev.count += 1;
      facultyAgg.set(facultyId, facultyPrev);

      const subjectPrev = subjectAgg.get(subjectId) || {
        subjectId,
        subjectName,
        total: 0,
        count: 0,
      };
      subjectPrev.total += totalMarks;
      subjectPrev.count += 1;
      subjectAgg.set(subjectId, subjectPrev);

      const trendKey = toMonthKey(doc.updatedAt || doc.createdAt);
      if (trendKey) {
        const keyBySubject = `${trendKey}__${subjectName}`;
        const prevTrend = subjectTrendMap.get(keyBySubject) || {
          period: trendKey,
          subjectName,
          total: 0,
          count: 0,
        };
        prevTrend.total += totalMarks;
        prevTrend.count += 1;
        subjectTrendMap.set(keyBySubject, prevTrend);
      }

      const attendanceCurrent = facultyAttendanceMap.get(facultyId) || { present: 0, absent: 0 };
      (doc.activities || []).forEach((act) => {
        if (act.attendance === "Absent") attendanceCurrent.absent += 1;
        else attendanceCurrent.present += 1;
      });
      facultyAttendanceMap.set(facultyId, attendanceCurrent);

      analysisRows.push({
        facultyId,
        facultyName,
        subjectId,
        subjectName,
        studentName: studentNameById.get(toId(doc.studentId)) || "Unknown Student",
        marks: totalMarks,
      });
    });

    const facultyStats = Array.from(facultyAgg.values()).map((f) => ({
      facultyId: f.facultyId,
      facultyName: f.facultyName,
      activitiesConducted: conductedByFaculty.get(f.facultyId) || 0,
      avgMarks: f.count ? Number((f.total / f.count).toFixed(2)) : 0,
    }));

    const subjectPerformance = Array.from(subjectAgg.values()).map((s) => ({
      subjectId: s.subjectId,
      subjectName: s.subjectName,
      avgMarks: s.count ? Number((s.total / s.count).toFixed(2)) : 0,
    }));

    const studentPerformanceTrend = Array.from(subjectTrendMap.values()).map((row) => ({
      period: row.period,
      subjectName: row.subjectName,
      avgMarks: row.count ? Number((row.total / row.count).toFixed(2)) : 0,
    }));

    const facultyWorkload = Array.from(facultyWorkloadMap.values()).map((row) => ({
      facultyId: row.facultyId,
      facultyName: row.facultyName,
      subjectsCount: row.subjects.size,
      activitiesCount: row.activitiesCount,
      assignmentsCount: row.assignmentCount,
    }));

    const facultyConsistency = facultyWorkload.map((row) => {
      const time = timelinessByFaculty.get(row.facultyId) || { onTime: 0, delayed: 0 };
      const attendance = facultyAttendanceMap.get(row.facultyId) || { present: 0, absent: 0 };
      const totalTime = time.onTime + time.delayed;
      const totalAttendance = attendance.present + attendance.absent;
      const onTimeScore = totalTime ? Number(((time.onTime / totalTime) * 100).toFixed(2)) : 0;
      const marksCompletionScore = row.activitiesCount
        ? Number((((marksUpdatedByFaculty.get(row.facultyId) || 0) / row.activitiesCount) * 100).toFixed(2))
        : 0;
      const attendanceScore = totalAttendance
        ? Number(((attendance.present / totalAttendance) * 100).toFixed(2))
        : 0;

      return {
        facultyId: row.facultyId,
        facultyName: row.facultyName,
        onTimeScore,
        marksCompletionScore,
        attendanceScore,
      };
    });

    return res.json({
      meta: {
        academicYears: ["SY", "TE", "BE"],
        divisions: Array.from(new Set(assignments.map((a) => a.division).filter(Boolean))),
        subjects: Array.from(new Set(assignments.map((a) => a.subjectId?.name).filter(Boolean))),
      },
      facultyStats,
      subjectPerformance,
      facultyStudentAnalysis: analysisRows,
      studentPerformanceTrend,
      passFail: [
        { name: "Pass", value: passFail.pass },
        { name: "Fail", value: passFail.fail },
      ],
      facultyWorkload,
      facultyConsistency,
    });
  } catch (error) {
    console.error("getHodDashboardStats error:", error);
    return res.status(500).json({ error: "Unable to load HOD dashboard stats" });
  }
};


// ************************ Coordinator *********************************
export const getCoordinatorDashboardStats = async (req, res) => {

  try {

    const userId = req.user.id;
    const role = req.user.role;

    // ADMIN → all activities
    if (role === "admin") {

      const activities = await Activity.find()
        .populate("coordinatorId", "name email")
        .populate({
          path: "assignmentId",
          populate: { path: "subjectId", select: "name" }
        });

      return res.json(activities);

    }

    // Step 1: subjects coordinated by this user
    const coordinatorSubjects = await Subject.find({
      coordinator: userId
    }).select("_id");

    if (coordinatorSubjects.length > 0) {

      // Step 2: assignments for those subjects
      const assignments = await TeachingAssignment.find({
        subjectId: { $in: coordinatorSubjects.map(s => s._id) }
      }).select("_id");

      // Step 3: activities for those assignments
      const activities = await Activity.find({
        assignmentId: { $in: assignments.map(a => a._id) }
      })
      .populate("coordinatorId", "name email")
      .populate({
        path: "assignmentId",
        populate: { path: "subjectId", select: "name" }
      });

      return res.json(activities);
    }

    // Normal faculty → activities conducted by them
    const activities = await Activity.find({
      coordinatorId: userId
    }).populate({
      path: "assignmentId",
      populate: { path: "subjectId", select: "name" }
    });

    res.json(activities);

  } catch (error) {

    console.error("Coordinator analytics error:", error);

    res.status(500).json({
      message: "Error fetching analytics",
      error: error.message
    });

  }

};