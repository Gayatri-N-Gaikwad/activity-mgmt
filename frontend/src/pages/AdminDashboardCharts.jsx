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
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import showToast from "../utils/toast";
import ChartCard from "../components/charts/ChartCard";
import FilterBar from "../components/charts/FilterBar";
import { getAdminDashboardAnalytics } from "../services/dashboardAnalyticsApi";

const PIE_COLORS = ["#4a8ff7", "#f2a65a", "#5dbb86", "#d36b6b"];

function normalizeAdminPayload(raw = {}) {
  return {
    meta: raw.meta || { academicYears: [], subjects: [], divisions: [] },
    divisionProgress: raw.divisionProgress || [],
    performance: raw.performance || [],
    attendance: raw.attendance || [],
    timeliness: raw.timeliness || [],
    activityTrend: raw.activityTrend || [],
    divisionCompletionRate: raw.divisionCompletionRate || [],
    marksDistribution: raw.marksDistribution || [],
    lifecycle: raw.lifecycle || [],
    activityLoadByDate: raw.activityLoadByDate || [],
  };
}

function AdminDashboardCharts() {
  const [filters, setFilters] = useState({
    academicYear: "all",
    subject: "all",
    division: "all",
  });
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [performanceChartType, setPerformanceChartType] = useState("bar");
  const [stats, setStats] = useState({
    meta: { academicYears: [], subjects: [], divisions: [] },
    divisionProgress: [],
    performance: [],
    attendance: [],
    timeliness: [],
    activityTrend: [],
    divisionCompletionRate: [],
    marksDistribution: [],
    lifecycle: [],
    activityLoadByDate: [],
  });

  const fetchAdminStats = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAdminDashboardAnalytics({
        academicYear: filters.academicYear,
        subject: filters.subject,
        division: filters.division,
      });
      setStats(normalizeAdminPayload(data));
    } catch (error) {
      setStats({
        meta: { academicYears: [], subjects: [], divisions: [] },
        divisionProgress: [],
        performance: [],
        attendance: [],
        timeliness: [],
        activityTrend: [],
        divisionCompletionRate: [],
        marksDistribution: [],
        lifecycle: [],
        activityLoadByDate: [],
      });
      showToast("warn", "Admin analytics data is unavailable currently.");
    } finally {
      setLoading(false);
    }
  }, [filters.academicYear, filters.division, filters.subject]);

  useEffect(() => {
    fetchAdminStats();
  }, [fetchAdminStats, refreshKey]);

  useEffect(() => {
    const timer = setInterval(() => setRefreshKey((k) => k + 1), 45000);
    return () => clearInterval(timer);
  }, []);

  const performanceData = useMemo(() => {
    if (filters.subject === "all") {
      const grouped = new Map();
      stats.performance.forEach((row) => {
        const prev = grouped.get(row.division) || { total: 0, count: 0 };
        grouped.set(row.division, {
          total: prev.total + Number(row.avgMarks || 0),
          count: prev.count + 1,
        });
      });
      return Array.from(grouped.entries()).map(([division, value]) => ({
        division,
        avgMarks: value.count ? Number((value.total / value.count).toFixed(2)) : 0,
      }));
    }

    return stats.performance
      .filter((row) => row.subject === filters.subject)
      .map((row) => ({ division: row.division, avgMarks: Number(row.avgMarks || 0) }));
  }, [filters.subject, stats.performance]);

  const attendancePieData = useMemo(() => {
    const aggregate = { present: 0, absent: 0 };
    stats.attendance.forEach((row) => {
      aggregate.present += Number(row.present || 0);
      aggregate.absent += Number(row.absent || 0);
    });

    return [
      { name: "Present", value: aggregate.present },
      { name: "Absent", value: aggregate.absent },
    ];
  }, [stats.attendance]);

  const filterConfig = useMemo(
    () => [
      {
        key: "academicYear",
        label: "Academic Year",
        options: [
          { label: "All Years", value: "all" },
          ...(stats.meta.academicYears || []).map((year) => ({ label: year, value: year })),
        ],
      },
      {
        key: "subject",
        label: "Subject",
        options: [
          { label: "Overall", value: "all" },
          ...(stats.meta.subjects || []).map((subject) => ({ label: subject, value: subject })),
        ],
      },
      {
        key: "division",
        label: "Division",
        options: [
          { label: "All Divisions", value: "all" },
          ...(stats.meta.divisions || []).map((division) => ({ label: division, value: division })),
        ],
      },
    ],
    [stats.meta.academicYears, stats.meta.divisions, stats.meta.subjects]
  );

  const onFilterChange = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  return (
    <div className="analytics-section">
      <div className="card">
        <div className="activities-header">
          <div>
            <h2 style={{ marginTop: 0 }}>Admin Analytics</h2>
            <p className="muted">Live overview of trends, completion, marks distribution, attendance and lifecycle health.</p>
          </div>
        </div>

        <FilterBar
          filters={filterConfig}
          values={filters}
          onChange={onFilterChange}
          onRefresh={() => setRefreshKey((k) => k + 1)}
        />
      </div>

      <div className="analytics-grid analytics-grid-three">
        <ChartCard
          title="Activity Trend Over Time"
          subtitle="Conducted/updated activities by month"
          loading={loading}
          hasData={stats.activityTrend.length > 0}
        >
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={stats.activityTrend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="period" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="#4a8ff7" strokeWidth={3} name="Activities" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Division Completion Rate"
          subtitle="% marks-updated activities by year"
          loading={loading}
          hasData={stats.divisionCompletionRate.length > 0}
        >
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={stats.divisionCompletionRate} dataKey="completionRate" nameKey="division" outerRadius={90} label>
                {stats.divisionCompletionRate.map((entry, index) => (
                  <Cell key={entry.division} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value}%`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Marks Distribution"
          subtitle="Student score buckets"
          loading={loading}
          hasData={stats.marksDistribution.length > 0}
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.marksDistribution}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="range" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#5dbb86" name="Students" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Attendance Analytics"
          subtitle="Present vs Absent"
          loading={loading}
          hasData={attendancePieData.some((d) => d.value > 0)}
        >
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={attendancePieData} dataKey="value" nameKey="name" outerRadius={90} label>
                {attendancePieData.map((entry, index) => (
                  <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Activity Lifecycle"
          subtitle="Scheduled to marks updated funnel alternative"
          loading={loading}
          hasData={stats.lifecycle.length > 0}
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.lifecycle}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="stage" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#3b97a8" name="Activities" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Faculty Punctuality"
          subtitle="On-time vs delayed conduct"
          loading={loading}
          hasData={stats.timeliness.some((d) => Number(d.value || 0) > 0)}
        >
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={stats.timeliness} dataKey="value" nameKey="name" outerRadius={90} label>
                {stats.timeliness.map((entry, index) => (
                  <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Student Performance"
          subtitle="Average marks per division"
          loading={loading}
          hasData={performanceData.length > 0}
          actions={
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setPerformanceChartType((t) => (t === "bar" ? "line" : "bar"))}
            >
              Toggle {performanceChartType === "bar" ? "Line" : "Bar"}
            </button>
          }
        >
          <ResponsiveContainer width="100%" height={280}>
            {performanceChartType === "bar" ? (
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="division" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="avgMarks" fill="#4a8ff7" name="Average Marks" />
              </BarChart>
            ) : (
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="division" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="avgMarks" stroke="#4a8ff7" strokeWidth={3} name="Average Marks" />
              </LineChart>
            )}
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Activity Load by Date"
          subtitle="Date-wise activity density"
          loading={loading}
          hasData={stats.activityLoadByDate.length > 0}
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.activityLoadByDate}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" hide={stats.activityLoadByDate.length > 10} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#7ea6f8" name="Activities" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

export default AdminDashboardCharts;
