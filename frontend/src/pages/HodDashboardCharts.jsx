import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import showToast from "../utils/toast";
import ChartCard from "../components/charts/ChartCard";
import FilterBar from "../components/charts/FilterBar";
import { getHodDashboardAnalytics } from "../services/dashboardAnalyticsApi";

const PIE_COLORS = ["#4a8ff7", "#f2a65a", "#5dbb86", "#d36b6b"];

function normalizeHodPayload(raw = {}) {
  return {
    meta: raw.meta || { academicYears: [], divisions: [], subjects: [] },
    facultyStats: raw.facultyStats || [],
    subjectPerformance: raw.subjectPerformance || [],
    facultyStudentAnalysis: raw.facultyStudentAnalysis || [],
    studentPerformanceTrend: raw.studentPerformanceTrend || [],
    passFail: raw.passFail || [],
    facultyWorkload: raw.facultyWorkload || [],
    facultyConsistency: raw.facultyConsistency || [],
  };
}

function HodDashboardCharts() {
  const [filters, setFilters] = useState({
    academicYear: "all",
    division: "all",
    subject: "all",
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    meta: { academicYears: [], divisions: [], subjects: [] },
    facultyStats: [],
    subjectPerformance: [],
    facultyStudentAnalysis: [],
    studentPerformanceTrend: [],
    passFail: [],
    facultyWorkload: [],
    facultyConsistency: [],
  });

  const [selectedFaculty, setSelectedFaculty] = useState("all");
  const [selectedSubject, setSelectedSubject] = useState("all");

  const fetchHodStats = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getHodDashboardAnalytics({
        academicYear: filters.academicYear,
        division: filters.division,
        subject: filters.subject,
      });
      setStats(normalizeHodPayload(data));
    } catch (error) {
      setStats({
        meta: { academicYears: [], divisions: [], subjects: [] },
        facultyStats: [],
        subjectPerformance: [],
        facultyStudentAnalysis: [],
        studentPerformanceTrend: [],
        passFail: [],
        facultyWorkload: [],
        facultyConsistency: [],
      });
      showToast("warn", "HOD analytics data is unavailable currently.");
    } finally {
      setLoading(false);
    }
  }, [filters.academicYear, filters.division, filters.subject]);

  useEffect(() => {
    fetchHodStats();
  }, [fetchHodStats, refreshKey]);

  useEffect(() => {
    const timer = setInterval(() => setRefreshKey((k) => k + 1), 45000);
    return () => clearInterval(timer);
  }, []);

  const facultyOptions = useMemo(() => {
    return [
      { label: "All Faculty", value: "all" },
      ...stats.facultyStats.map((f) => ({
        label: f.facultyName,
        value: String(f.facultyId),
      })),
    ];
  }, [stats.facultyStats]);

  const subjectOptions = useMemo(() => {
    const scoped = stats.facultyStudentAnalysis.filter((row) => {
      if (selectedFaculty === "all") return true;
      return String(row.facultyId) === selectedFaculty;
    });

    const uniq = new Map();
    scoped.forEach((row) => {
      if (!uniq.has(String(row.subjectId))) {
        uniq.set(String(row.subjectId), row.subjectName);
      }
    });

    return [
      { label: "All Subjects", value: "all" },
      ...Array.from(uniq.entries()).map(([value, label]) => ({ value, label })),
    ];
  }, [selectedFaculty, stats.facultyStudentAnalysis]);

  const studentDrillData = useMemo(() => {
    return stats.facultyStudentAnalysis
      .filter((row) => {
        const facultyMatch = selectedFaculty === "all" || String(row.facultyId) === selectedFaculty;
        const subjectMatch = selectedSubject === "all" || String(row.subjectId) === selectedSubject;
        return facultyMatch && subjectMatch;
      })
      .map((row) => ({ studentName: row.studentName, marks: row.marks }));
  }, [selectedFaculty, selectedSubject, stats.facultyStudentAnalysis]);

  const trendData = useMemo(() => {
    const periods = new Map();
    stats.studentPerformanceTrend.forEach((row) => {
      if (!periods.has(row.period)) periods.set(row.period, { period: row.period });
      periods.get(row.period)[row.subjectName] = Number(row.avgMarks || 0);
    });
    return Array.from(periods.values()).sort((a, b) => a.period.localeCompare(b.period));
  }, [stats.studentPerformanceTrend]);

  const trendSubjects = useMemo(() => {
    return Array.from(new Set(stats.studentPerformanceTrend.map((row) => row.subjectName)));
  }, [stats.studentPerformanceTrend]);

  const selectedConsistency = useMemo(() => {
    const current =
      selectedFaculty === "all"
        ? stats.facultyConsistency[0]
        : stats.facultyConsistency.find((f) => String(f.facultyId) === selectedFaculty);

    if (!current) return [];

    return [
      { metric: "Timeliness", value: Number(current.onTimeScore || 0) },
      { metric: "Marks Completion", value: Number(current.marksCompletionScore || 0) },
      { metric: "Attendance", value: Number(current.attendanceScore || 0) },
    ];
  }, [selectedFaculty, stats.facultyConsistency]);

  const onFilterChange = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const onFacultyChange = (value) => {
    setSelectedFaculty(value);
    setSelectedSubject("all");
  };

  return (
    <div className="analytics-section" style={{ marginTop: 20 }}>
      <div className="card">
        <div className="activities-header">
          <div>
            <h2 style={{ marginTop: 0 }}>HOD Analytics</h2>
            <p className="muted">Advanced faculty, subject and student analytics based on live academic records.</p>
          </div>
        </div>

        <FilterBar
          filters={[
            {
              key: "academicYear",
              label: "Academic Year",
              options: [
                { label: "All Years", value: "all" },
                ...(stats.meta.academicYears || []).map((year) => ({ label: year, value: year })),
              ],
            },
            {
              key: "division",
              label: "Division",
              options: [
                { label: "All Divisions", value: "all" },
                ...(stats.meta.divisions || []).map((div) => ({ label: div, value: div })),
              ],
            },
            {
              key: "subject",
              label: "Subject",
              options: [
                { label: "All Subjects", value: "all" },
                ...(stats.meta.subjects || []).map((s) => ({ label: s, value: s })),
              ],
            },
          ]}
          values={filters}
          onChange={onFilterChange}
          onRefresh={() => setRefreshKey((k) => k + 1)}
        />
      </div>

      <div className="analytics-grid analytics-grid-three">
        <ChartCard
          title="Faculty Performance Comparison"
          subtitle="Activities conducted and average marks"
          loading={loading}
          hasData={stats.facultyStats.length > 0}
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.facultyStats}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="facultyName" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="activitiesConducted" fill="#4a8ff7" name="Activities" />
              <Bar dataKey="avgMarks" fill="#5dbb86" name="Avg Marks" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Subject-wise Performance"
          subtitle="Average marks per subject"
          loading={loading}
          hasData={stats.subjectPerformance.length > 0}
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.subjectPerformance}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="subjectName" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="avgMarks" fill="#3b97a8" name="Avg Marks" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Student Performance Trend"
          subtitle="Subject-wise trend over time"
          loading={loading}
          hasData={trendData.length > 0}
        >
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip />
              <Legend />
              {trendSubjects.map((subjectName, index) => (
                <Line
                  key={subjectName}
                  type="monotone"
                  dataKey={subjectName}
                  stroke={PIE_COLORS[index % PIE_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Pass vs Fail Ratio"
          subtitle="Based on threshold marks"
          loading={loading}
          hasData={stats.passFail.some((d) => Number(d.value || 0) > 0)}
        >
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={stats.passFail} dataKey="value" nameKey="name" outerRadius={90} label>
                {stats.passFail.map((entry, index) => (
                  <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Faculty Workload Distribution"
          subtitle="Subjects and activities per faculty"
          loading={loading}
          hasData={stats.facultyWorkload.length > 0}
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.facultyWorkload}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="facultyName" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="subjectsCount" fill="#f2a65a" name="Subjects" />
              <Bar dataKey="activitiesCount" fill="#4a8ff7" name="Activities" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Faculty Consistency Score"
          subtitle="Timeliness, marks completion and attendance"
          loading={loading}
          hasData={selectedConsistency.length > 0}
          actions={
            <div className="analytics-inline-filters">
              <select value={selectedFaculty} onChange={(e) => onFacultyChange(e.target.value)}>
                {facultyOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          }
        >
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={selectedConsistency} outerRadius={90}>
              <PolarGrid />
              <PolarAngleAxis dataKey="metric" />
              <PolarRadiusAxis angle={30} domain={[0, 100]} />
              <Radar name="Score" dataKey="value" stroke="#4a8ff7" fill="#4a8ff7" fillOpacity={0.45} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Faculty-wise Student Analysis"
          subtitle="Drill down by faculty and subject"
          loading={loading}
          hasData={studentDrillData.length > 0}
          actions={
            <div className="analytics-inline-filters">
              <select value={selectedFaculty} onChange={(e) => onFacultyChange(e.target.value)}>
                {facultyOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
                {subjectOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          }
        >
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={studentDrillData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="studentName" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="marks" fill="#7ea6f8" name="Marks" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

export default HodDashboardCharts;
