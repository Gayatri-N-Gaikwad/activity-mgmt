import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../../services/api";
import showToast from '../../utils/toast';
import { formatToKolkataInput, parseKolkataInputToISOString } from '../../utils/kolkataTime';

function EditActivity() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [activity, setActivity] = useState({
    name: "",
    description: "",
    status: "Scheduled",
    
    scheduleDate: ""
  });
  const [rubricRows, setRubricRows] = useState([]);
  const [rubricDirty, setRubricDirty] = useState(false);
  const [marksValue, setMarksValue] = useState(0);
  const [marksDirty, setMarksDirty] = useState(false);

  const simpleRubric = useMemo(() => rubricRows.length <= 1, [rubricRows]);
  const marksLocked = useMemo(
    () => activity.status === 'Conducted' || activity.status === 'Marks_Updated',
    [activity.status]
  );

  const fetchActivity = useCallback(async () => {
    const res = await API.get(`/activities/${id}`);
    const act = res.data.activity;
    const rubric = Array.isArray(res.data.rubric) ? res.data.rubric : [];

    setActivity(act);
    setRubricRows(rubric);
    setRubricDirty(false);

    if (rubric.length > 0) {
      setMarksValue(Number(rubric[0].maxMarks || 0));
    } else {
      setMarksValue(0);
    }
    setMarksDirty(false);
  }, [id]);


  const update = async (e) => {
    e.preventDefault();

    // Do not send assignmentId or reminderOffsets from UI
    const toSend = {
      name: activity.name,
      description: activity.description,
    };

    // Only include scheduleDate when activity is not already Conducted/Marks_Updated
    if (!(activity.status === 'Conducted' || activity.status === 'Marks_Updated')) {
      // normalize to full ISO in UTC interpreting the input as Asia/Kolkata local time
      if (activity.scheduleDate) {
        const iso = parseKolkataInputToISOString(activity.scheduleDate);
        toSend.scheduleDate = iso || activity.scheduleDate;
      } else {
        toSend.scheduleDate = null;
      }
    }

    if (!marksLocked) {
      if (simpleRubric) {
        if (marksDirty) {
          const numericMarks = Number(marksValue);
          if (!Number.isFinite(numericMarks)) {
            showToast('error', 'Enter a valid numeric value for marks');
            return;
          }
          if (numericMarks <= 0 || numericMarks >= 15) {
            showToast('error', 'Marks must be between 1 and 14');
            return;
          }
          toSend.marks = numericMarks;
        }
      } else if (rubricDirty) {
        const prepared = rubricRows.map((row, idx) => ({
          name: row.name || `Criteria ${idx + 1}`,
          marks: Number(row.maxMarks || 0),
        }));

        const total = prepared.reduce((sum, row) => sum + row.marks, 0);
        if (total !== 15) {
          showToast('error', 'Rubric marks must sum to 15');
          return;
        }

        toSend.rubric = prepared;
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

useEffect(() => {
  fetchActivity();
}, [fetchActivity]);


  return (
    <div>
      <h2>Edit Activity</h2>

      <form onSubmit={update}>
        <div className="form-row">
          <label>Activity Name</label>
          <input value={activity.name} onChange={(e) => setActivity({ ...activity, name: e.target.value })} required />
        </div>

        <div className="form-row">
          <label>Description</label>
          <textarea value={activity.description} onChange={(e) => setActivity({ ...activity, description: e.target.value })} required />
        </div>

        <div className="form-row">
          <label>Schedule Date & Time</label>
          <input type="datetime-local" value={activity.scheduleDate ? formatToKolkataInput(activity.scheduleDate) : ''} onChange={(e) => setActivity({ ...activity, scheduleDate: e.target.value })} required disabled={marksLocked} />
          {marksLocked && (
            <small style={{ color: '#666' }}>Cannot change schedule after activity is Conducted or Marks Updated.</small>
          )}
        </div>

        {simpleRubric ? (
          <div className="form-row">
            <label>Activity Marks (out of 15)</label>
            <input
              type="number"
              min="1"
              max="14"
              value={marksValue}
              onChange={(e) => {
                setMarksValue(e.target.value);
                setMarksDirty(true);
              }}
              disabled={marksLocked}
            />
            {marksLocked && (
              <small style={{ color: '#666' }}>Marks locked once the activity is Conducted or graded.</small>
            )}
          </div>
        ) : (
          <div className="form-row">
            <label>Rubric Criteria (must total 15)</label>
            {rubricRows.map((row, idx) => (
              <div key={row._id || idx} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  placeholder={`Criteria ${idx + 1} name`}
                  value={row.name || ''}
                  onChange={(e) => {
                    const next = [...rubricRows];
                    next[idx] = { ...next[idx], name: e.target.value };
                    setRubricRows(next);
                    setRubricDirty(true);
                  }}
                  disabled={marksLocked}
                />
                <input
                  type="number"
                  min="0"
                  max="15"
                  value={row.maxMarks || 0}
                  onChange={(e) => {
                    const next = [...rubricRows];
                    next[idx] = { ...next[idx], maxMarks: e.target.value };
                    setRubricRows(next);
                    setRubricDirty(true);
                  }}
                  style={{ width: 120 }}
                  disabled={marksLocked}
                />
              </div>
            ))}
            {marksLocked && (
              <small style={{ color: '#666' }}>Rubric locked once the activity is Conducted or graded.</small>
            )}
          </div>
        )}

        {/* Status is edited inline on the Activities table; keep form focused on content and schedule */}

        <div style={{ display: 'flex', gap: 12 }}>
          <button type="submit" className="btn btn-primary">Update</button>
          <button type="button" className="btn btn-outline" onClick={() => navigate('/activities')}>Back</button>
        </div>
      </form>
    </div>
  );
}

export default EditActivity;
