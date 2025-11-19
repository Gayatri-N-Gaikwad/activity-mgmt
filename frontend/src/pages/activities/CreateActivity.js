import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../services/api";
import showToast from '../../utils/toast';
import { parseKolkataInputToISOString } from '../../utils/kolkataTime';

function CreateActivity() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const token = localStorage.getItem("token"); // ✅ get JWT token

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [marks, setMarks] = useState(15);
  const [assignmentId, setAssignmentId] = useState("");
  const [existingCount, setExistingCount] = useState(0);
  const [autoMarks, setAutoMarks] = useState(null);

  // Coordinator = logged-in user
  const coordinatorId = user?.id;

  // Fetch existing activities for assignmentId
  useEffect(() => {
    if (!assignmentId) return;
    (async () => {
      try {
        const res = await API.get(`/activities?assignmentId=${assignmentId}`);
        const acts = res.data.activities || [];
        setExistingCount(acts.length);
        if (acts.length === 1) {
          // Get previous marks
          const prev = acts[0].rubric && acts[0].rubric[0] ? acts[0].rubric[0].maxMarks : 0;
          setAutoMarks(15 - prev);
        } else {
          setAutoMarks(null);
        }
      } catch {
        setExistingCount(0);
        setAutoMarks(null);
      }
    })();
  }, [assignmentId]);

  const submitActivity = async (e) => {
    e.preventDefault();
    if (!assignmentId) {
      showToast('error', 'Please select class and subject');
      return;
    }
    let m = autoMarks !== null ? autoMarks : Number(marks);
    if (isNaN(m) || m <= 0 || m > 15) {
      showToast('error', 'Marks must be between 1 and 15');
      return;
    }
    if (existingCount >= 2) {
      showToast('error', 'Only two activities allowed per class/subject');
      return;
    }
    try {
      const formattedDate = parseKolkataInputToISOString(scheduleDate);
      const payload = { name, description, scheduleDate: formattedDate, coordinatorId, assignmentId, marks: m };
      const response = await API.post(`/activities/create`, payload);
      showToast('success', 'Activity created successfully');
      navigate("/activities");
    } catch (err) {
      showToast('error', err.response?.data?.error || 'Error creating activity');
    }
  };

  return (
    <div className="card">
      <h2>Create Activity</h2>

      <form onSubmit={submitActivity} className="create-form">
        <div className="form-row">
          <label>Activity Name</label>
          <input required placeholder="Activity Name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="form-row">
          <label>Description</label>
          <textarea required placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="form-row">
          <label>Schedule Date & Time</label>
          <input type="datetime-local" required value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} />
        </div>
        <div className="form-row">
          <label>Class & Subject</label>
          <input required value={assignmentId} onChange={e => setAssignmentId(e.target.value)} />
        </div>
        <div className="form-row">
          <label>Activity Marks (out of 15)</label>
          {existingCount === 1 ? (
            <input type="number" value={autoMarks || 0} readOnly style={{ width: 120, background: '#eee' }} />
          ) : (
            <input type="number" min="1" max="15" value={marks} onChange={e => setMarks(e.target.value)} style={{ width: 120 }} />
          )}
          {existingCount >= 2 && (
            <div style={{ color: 'red', marginTop: 6 }}>Only two activities allowed per class/subject</div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button type="submit" className="btn btn-primary" disabled={existingCount >= 2}>Create</button>
          <button type="button" className="btn btn-outline" onClick={() => navigate('/activities')}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

export default CreateActivity;
