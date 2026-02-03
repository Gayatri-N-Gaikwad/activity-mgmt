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
    scheduleDate: ""
  });

  // Mark subdivisions state
  const [markSubdivisions, setMarkSubdivisions] = useState([]);

  // Lock if activity is conducted or marks updated
  const ownLocked = activity.status === "Conducted" || activity.status === "Marks_Updated";

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
    <div>
      <h2>Edit Activity</h2>

      <form onSubmit={update}>
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
              Cannot change schedule after this activity is Conducted or Marks Updated.
            </small>
          )}
        </div>

        {/* Mark Subdivisions Display */}
        {markSubdivisions.length > 0 && (
          <div className="form-row">
            <label>Marks Breakdown</label>
            <ul>
              {markSubdivisions.map((s) => (
                <li key={s._id}>
                  {s.title} – {s.maxMarks}
                </li>
              ))}
            </ul>
            <small style={{ color: "#666" }}>
              Marks breakdown is for information only and cannot be edited.
            </small>
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <button type="submit" className="btn btn-primary">Update</button>
          <button type="button" className="btn btn-outline" onClick={() => navigate('/activities')}>Back</button>
        </div>
      </form>
    </div>
  );
}

export default EditActivity;