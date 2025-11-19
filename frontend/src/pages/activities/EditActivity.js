import React, { useEffect, useState } from "react";
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
  const [crit1Name, setCrit1Name] = useState('');
  const [crit1Marks, setCrit1Marks] = useState(0);
  const [crit2Name, setCrit2Name] = useState('');
  const [crit2Marks, setCrit2Marks] = useState(0);

  

  const fetchActivity = async () => {
    const res = await API.get(`/activities/${id}`);
    const act = res.data.activity;
    const rubric = res.data.rubric || [];
    if (Array.isArray(rubric) && rubric.length > 0) {
      setCrit1Name(rubric[0].name || '');
      setCrit1Marks(rubric[0].maxMarks || 0);
      if (rubric[1]) {
        setCrit2Name(rubric[1].name || '');
        setCrit2Marks(rubric[1].maxMarks || 0);
      }
    }
    setActivity(act);
  };

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

    // include rubric when allowed (not locked by Marks_Updated)
    if (!(activity.status === 'Marks_Updated')) {
      const r1 = { name: crit1Name || 'Criteria 1', marks: Number(crit1Marks || 0) };
      const r2 = { name: crit2Name || 'Criteria 2', marks: Number(crit2Marks || 0) };
      // validate
      if (r1.marks + r2.marks !== 15) {
        showToast('error', 'Rubric marks must sum to 15');
        return;
      }
      toSend.rubric = [r1, r2];
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
  }, []);

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
          <input type="datetime-local" value={activity.scheduleDate ? formatToKolkataInput(activity.scheduleDate) : ''} onChange={(e) => setActivity({ ...activity, scheduleDate: e.target.value })} required disabled={activity.status === 'Conducted' || activity.status === 'Marks_Updated'} />
          {(activity.status === 'Conducted' || activity.status === 'Marks_Updated') && (
            <small style={{ color: '#666' }}>Cannot change schedule after activity is Conducted or Marks Updated.</small>
          )}
        </div>

        <div className="form-row">
          <label>Activity Marks (out of 15)</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input placeholder="Criteria 1 name" value={crit1Name} onChange={(e) => setCrit1Name(e.target.value)} disabled={activity.status === 'Marks_Updated'} />
            <input type="number" min="0" max="15" value={crit1Marks} onChange={(e) => setCrit1Marks(e.target.value)} style={{ width: 120 }} disabled={activity.status === 'Marks_Updated'} />
          </div>
          <div style={{ marginTop: 6 }}>
            <small>Total: {Number(crit1Marks || 0) + Number(crit2Marks || 0)} / 15</small>
            {activity.status === 'Marks_Updated' && (
              <div><small style={{ color:'#666' }}>Rubric locked after marks updated.</small></div>
            )}
          </div>
        </div>

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
