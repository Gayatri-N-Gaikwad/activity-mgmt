import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../../services/api";
import showToast from '../../utils/toast';
import { parseKolkataInputToISOString } from '../../utils/kolkataTime';

function ScheduleActivity() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [date, setDate] = useState("");

  const schedule = async (e) => {
    e.preventDefault();

    try {
      const payloadDate = date ? parseKolkataInputToISOString(date) : null;
      await API.post(`/activities/schedule/${id}`, {
        scheduledDate: payloadDate
      });
      showToast('success', 'Activity scheduled');
      navigate("/activities");
    } catch (err) {
      console.error('Schedule error', err);
      showToast('error', err.response?.data?.error || 'Error scheduling activity');
    }
  };

  return (
    <div>
      <h2>Schedule Activity</h2>

      <form onSubmit={schedule}>
        <input
          type="datetime-local"
          onChange={(e) => setDate(e.target.value)}
          required
        />
        <button type="submit">Schedule</button>
      </form>
    </div>
  );
}

export default ScheduleActivity;
