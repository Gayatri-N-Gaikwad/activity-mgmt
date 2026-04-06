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

  const addSubdivision = () => {
    setMarkSubdivisions((prev) => [...prev, { _id: `new-${Date.now()}`, title: "", marks: "" }]);
  };

  const removeSubdivision = (index) => {
    setMarkSubdivisions((prev) => prev.filter((_, i) => i !== index));
  };

  const updateSubdivision = (index, field, value) => {
    setMarkSubdivisions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

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

      // Fetch mark subdivisions
      const subsRes = await API.get(`/activities/${id}/mark-subdivisions`);
      const subs = Array.isArray(subsRes.data) ? subsRes.data : [];
      const normalizedSubs = subs.map((s) => ({
        _id: s._id,
        title: s.title || "",
        marks: Number(s.maxMarks ?? 0),
      }));
      setMarkSubdivisions(normalizedSubs);

      const totalMarks = normalizedSubs.reduce((sum, s) => sum + (Number(s.marks) || 0), 0);
      setActivity({
        ...act,
        marks: totalMarks > 0 ? String(totalMarks) : "",
      });
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
      description: activity.description,
    };

    // Include marks and editable breakdown only when status allows edits.
    if (marksEditable) {
      const finalMarks = Number(activity.marks);
      if (!Number.isFinite(finalMarks) || finalMarks <= 0) {
        showToast('error', 'Enter valid total marks');
        return;
      }

      toSend.marks = finalMarks;

      const hasAnySubdivisionValue = markSubdivisions.some((s) => (s.title || '').trim() || String(s.marks || '').trim());
      let subdivisionPayload = [];

      if (hasAnySubdivisionValue) {
        let sum = 0;
        for (const s of markSubdivisions) {
          const title = (s.title || '').trim();
          if (!title) {
            showToast('error', 'All subdivision names are required');
            return;
          }

          const marks = Number(s.marks);
          if (!Number.isFinite(marks) || marks <= 0) {
            showToast('error', 'Subdivision marks must be valid positive numbers');
            return;
          }

          sum += marks;
          subdivisionPayload.push({ title, marks });
        }

        if (sum !== finalMarks) {
          showToast('error', `Subdivision marks (${sum}) must equal total marks (${finalMarks})`);
          return;
        }
      }

      toSend.markSubdivisions = subdivisionPayload;
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

          {/* Editable Mark Subdivisions */}
          {marksEditable && (
            <div className="form-row">
              <label>Marks Breakdown</label>
              <div className="breakdown-list">
                {markSubdivisions.map((row, idx) => (
                  <div key={row._id || idx} className="breakdown-row">
                    <input
                      placeholder="Subtopic / Component"
                      value={row.title}
                      onChange={(e) => updateSubdivision(idx, 'title', e.target.value)}
                    />
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="Marks"
                      value={row.marks}
                      onChange={(e) => updateSubdivision(idx, 'marks', e.target.value)}
                      className="marks-input"
                    />
                    {markSubdivisions.length > 1 && (
                      <button type="button" className="btn-remove" onClick={() => removeSubdivision(idx)}>
                        x
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button type="button" className="btn btn-outline" onClick={addSubdivision}>
                + Add Subdivision
              </button>

              <small style={{ color: "#666", display: "inline-block", marginTop: "8px" }}>
                Keep subdivision total equal to total marks.
              </small>
            </div>
          )}

          {!marksEditable && markSubdivisions.length > 0 && (
            <div className="form-row">
              <label>Marks Breakdown</label>
              <div className="breakdown-list" style={{ marginTop: "10px", padding: "10px", background: "#f8fbff", border: "1px solid #dbe4f1", borderRadius: "8px" }}>
                <ul style={{ margin: 0, paddingLeft: "20px", color: "#1a3d63", fontWeight: "600" }}>
                  {markSubdivisions.map((s) => (
                    <li key={s._id} style={{ marginBottom: "6px" }}>
                      {s.title} - {s.marks} marks
                    </li>
                  ))}
                </ul>
              </div>
              <small style={{ color: "#666", display: "inline-block", marginTop: "8px" }}>
                Breakdown cannot be edited after activity is conducted or marks are updated.
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