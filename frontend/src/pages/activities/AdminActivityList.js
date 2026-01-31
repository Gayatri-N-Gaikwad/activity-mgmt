import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import API from "../../services/api";
import showToast from "../../utils/toast";

function AdminActivityList() {
  const [searchParams] = useSearchParams();
  const facultyId = searchParams.get("facultyId");
  const subjectId = searchParams.get("subjectId");
  const year = searchParams.get("year");
  const division = searchParams.get("division");
  const facultyName = searchParams.get("facultyName");
  const subjectName = searchParams.get("subjectName");

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadActivities = async () => {
      if (!facultyId || !subjectId) return;

      try {
        const res = await API.get("/admin/activities", {
          params: { facultyId, subjectId, year, division },
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
  }, [facultyId, subjectId, year, division]);

  if (loading) return <div className="card">Loading activities...</div>;

  return (
    <div className="card">
      <h2>Activities ({activities.length})</h2>
      
      {facultyName && (
        <div style={{ marginBottom: "20px" }}>
          <p><strong>Faculty:</strong> {decodeURIComponent(facultyName)}</p>
          <p><strong>Subject:</strong> {decodeURIComponent(subjectName || '')}</p>
          <p><strong>Class:</strong> {year}-{division}</p>
        </div>
      )}

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
                  <Link 
                    to={`/activity/details/${a._id}`} 
                    state={{ fromAdmin: true }}
                    className="btn btn-info"
                  >
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
