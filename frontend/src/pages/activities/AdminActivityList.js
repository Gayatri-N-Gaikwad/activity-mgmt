import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import API from "../../services/api";
import showToast from "../../utils/toast";

function AdminActivityList() {
  const [searchParams] = useSearchParams();
  const facultyId = searchParams.get("facultyId");
  const subjectId = searchParams.get("subjectId");
  const classId = searchParams.get("classId");

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadActivities = async () => {
      if (!facultyId || !subjectId || !classId) return;

      try {
        const res = await API.get("/admin/activities", {
          params: { facultyId, subjectId, classId },
        });
        console.log("Activities loaded:", res.data.activities);
        setActivities(res.data.activities || []);
      } catch (err) {
        console.error(err);
        showToast("error", "Failed to load activities");
      } finally {
        setLoading(false);
      }
    };

    loadActivities();
  }, [facultyId, subjectId, classId]);

  if (loading) return <div className="card">Loading activities...</div>;

  return (
    <div className="card">
      <h2>Activities ({activities.length})</h2>

      {activities.length === 0 ? (
        <p>No activities found.</p>
      ) : (
        <table width="100%" cellPadding="8">
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Scheduled Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {activities.map((a) => (
              <tr key={a._id}>
                <td>{a.name || "N/A"}</td>
                <td>{a.status || "N/A"}</td>
                <td>
                  {a.scheduleDate
                    ? new Date(a.scheduleDate).toLocaleString("en-GB")
                    : "Not Scheduled"}
                </td>
                <td>
                  <Link to={`/activity/details/${a._id}`} className="btn btn-info">
                    View Details
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <br />
      <Link to="/admin" className="btn btn-secondary">
        ← Back to Admin Dashboard
      </Link>
    </div>
  );
}

export default AdminActivityList;
