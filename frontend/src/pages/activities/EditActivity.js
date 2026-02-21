import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../../services/api";
import showToast from '../../utils/toast';
import { formatToKolkataInput, parseKolkataInputToISOString } from '../../utils/kolkataTime';

function EditActivity() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Activity state
  const [activity, setActivity] = useState({
    name: "",
    description: "",
    status: "Scheduled",
    scheduleDate: "",
    marks: ""
  });

  // Mark subdivisions state
  const [markSubdivisions, setMarkSubdivisions] = useState([]);

  // Lock if activity is conducted
  const ownLocked = activity.status === "Conducted";

  // Marks can be edited only if status is Scheduled
  const marksEditable = activity.status !== "Conducted" && activity.status !== "Marks_Updated";

  // Fetch activity and subdivisions
  const fetchActivity = useCallback(async () => {
    try {
      // Fetch main activity
      const res = await API.get(`/activities/${id}`);
      const act = res.data.activity;
      setActivity(act);

      // Fetch mark subdivisions
      const subsRes = await API.get(`/activities/${id}/mark-subdivisions`);
      setMarkSubdivisions(subsRes.data || []);
    } catch (err) {
      console.error('Error fetching activity or subdivisions', err);
      showToast('error', 'Failed to load activity');
    }
  }, [id]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  // Update activity
  const update = async (e) => {
    e.preventDefault();

    const toSend = {
      name: activity.name,
      description: activity.description
    };

    // Include marks if it's provided and activity not conducted
    if (activity.marks && marksEditable) {
      toSend.marks = activity.marks;
    }

    // Only update scheduleDate if activity not locked
    if (!ownLocked) {
      if (activity.scheduleDate) {
        const iso = parseKolkataInputToISOString(activity.scheduleDate);
        toSend.scheduleDate = iso || activity.scheduleDate;
      } else {
        toSend.scheduleDate = null;
      }
    }

    try {
      await API.put(`/activities/update/${id}`, toSend);
      showToast('success', 'Activity updated');
      navigate("/activities");
    } catch (err) {
      console.error('Update activity error', err);
      showToast('error', err.response?.data?.error || 'Error updating activity');
    }
  };

  return (
    <div className="create-activity-page">
      <div className="create-activity-card">
        <div className="form-brand">Edit Activity</div>
        <h2 className="form-title">Update Details</h2>
        <p className="form-subtitle">Modify activity details, schedule, and marks below.</p>

        <form onSubmit={update} className="create-form">
          {/* Activity Name */}
          <div className="form-row">
            <label>Activity Name</label>
            <input
              value={activity.name}
              onChange={(e) => setActivity({ ...activity, name: e.target.value })}
              required
            />
          </div>

          {/* Description */}
          <div className="form-row">
            <label>Description</label>
            <textarea
              value={activity.description}
              onChange={(e) => setActivity({ ...activity, description: e.target.value })}
              required
            />
          </div>

          {/* Schedule Date */}
          <div className="form-row">
            <label>Schedule Date & Time</label>
            <input
              type="datetime-local"
              value={activity.scheduleDate ? formatToKolkataInput(activity.scheduleDate) : ''}
              onChange={(e) => setActivity({ ...activity, scheduleDate: e.target.value })}
              required
              disabled={ownLocked}
            />
            {ownLocked && (
              <small style={{ color: '#666' }}>
                Cannot change schedule after this activity is Conducted.
              </small>
            )}
          </div>

          {/* Marks */}
          {marksEditable && (
            <div className="form-row">
              <label>Marks</label>
              <input
                type="number"
                value={activity.marks}
                onChange={(e) => setActivity({ ...activity, marks: e.target.value })}
                placeholder="Enter total marks"
                step="0.01"
                min="0"
              />
              <small style={{ color: "#666" }}>
                You can edit marks only when status is Scheduled.
              </small>
            </div>
          )}
          {!marksEditable && (
            <div className="form-row">
              <label>Marks</label>
              <input
                type="number"
                value={activity.marks || ""}
                disabled
                placeholder="Cannot edit marks after activity is conducted or marked as updated"
              />
            </div>
          )}

          {/* Mark Subdivisions Display */}
          {markSubdivisions.length > 0 && (
            <div className="form-row">
              <label>Marks Breakdown</label>
              <div className="breakdown-list" style={{ marginTop: "10px", padding: "10px", background: "#f8fbff", border: "1px solid #dbe4f1", borderRadius: "8px" }}>
                <ul style={{ margin: 0, paddingLeft: "20px", color: "#1a3d63", fontWeight: "600" }}>
                  {markSubdivisions.map((s) => (
                    <li key={s._id} style={{ marginBottom: "6px" }}>
                      {s.title} – {s.maxMarks} marks
                    </li>
                  ))}
                </ul>
              </div>
              <small style={{ color: "#666", display: "inline-block", marginTop: "8px" }}>
                Marks breakdown is for information only and cannot be edited.
              </small>
            </div>
          )}

          {/* Buttons */}
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">Update Activity</button>
            <button type="button" className="btn btn-outline" onClick={() => navigate('/activities')}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditActivity;