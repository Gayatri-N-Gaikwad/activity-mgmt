import React from "react";
import { useState } from "react";
import API from "../services/api";
import showToast from '../utils/toast';

function UpdateMarks() {
  const [activityId, setActivityId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [marks, setMarks] = useState("");

  const submitMarks = async (e) => {
    e.preventDefault();
    try {
      await API.post("/marks/update", { activityId, studentId, marks });
      showToast('success', 'Marks updated');
    } catch (err) {
      console.error('Marks update error', err);
      showToast('error', 'Error updating marks');
    }
  };

  return (
    <div>
      <h2>Update Marks</h2>

      <form onSubmit={submitMarks}>
        <input
          placeholder="Activity ID"
          onChange={(e) => setActivityId(e.target.value)}
        />

        <input
          placeholder="Student ID"
          onChange={(e) => setStudentId(e.target.value)}
        />

        <input
          placeholder="Marks (0–20)"
          onChange={(e) => setMarks(e.target.value)}
        />

        <button type="submit">Submit</button>
      </form>
    </div>
  );
}

export default UpdateMarks;
