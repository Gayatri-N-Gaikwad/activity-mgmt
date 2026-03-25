import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";

import ChartCard from "../components/charts/ChartCard";

const COLORS = ["#4a8ff7", "#5dbb86", "#f2a65a"];

function CoordinatorDashboardCharts() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");

    fetch("http://localhost:5000/api/dashboard/coordinator-dashboard", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <h2>Loading analytics...</h2>;

  if (!stats || !stats.meta || !stats.meta.divisions?.length)
    return <h2>You are not a subject coordinator</h2>;

  return (
    <div className="analytics-grid analytics-grid-three">
      {/* Activity Lifecycle */}
      <ChartCard
        title="Activity Lifecycle"
        subtitle="Scheduled → Conducted → Marks Updated"
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
            <Bar dataKey="count" fill="#4a8ff7" name="Activities" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Activities per Division */}
      <ChartCard
        title="Activities per Division"
        subtitle="Distribution across divisions"
        loading={loading}
        hasData={stats.divisionActivity.length > 0}
      >
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={stats.divisionActivity}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="division" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#5dbb86" name="Activities" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Activity Trend */}
      <ChartCard
        title="Activity Trend"
        subtitle="Activities conducted over time"
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
            <Line
              type="monotone"
              dataKey="count"
              stroke="#f2a65a"
              strokeWidth={3}
              name="Activities"
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Division Distribution Pie */}
      <ChartCard
        title="Division Distribution"
        subtitle="Relative activity share"
        loading={loading}
        hasData={stats.divisionActivity.length > 0}
      >
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={stats.divisionActivity}
              dataKey="count"
              nameKey="division"
              outerRadius={90}
              label
            >
              {stats.divisionActivity.map((entry, index) => (
                <Cell
                  key={entry.division}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Faculty Contribution"
        subtitle="Activities conducted by each faculty"
        loading={loading}
        hasData={stats.facultyContribution?.length > 0}
      >
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={stats.facultyContribution}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="faculty" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#d36b6b" name="Activities" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

export default CoordinatorDashboardCharts;
