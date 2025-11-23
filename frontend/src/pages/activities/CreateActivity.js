import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../services/api";
import showToast from "../../utils/toast";
import { parseKolkataInputToISOString } from "../../utils/kolkataTime";

function CreateActivity() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [activityMarks, setActivityMarks] = useState("");

  const [assignments, setAssignments] = useState([]);
  const [assignmentId, setAssignmentId] = useState("");

  const [activityCount, setActivityCount] = useState(0);
  const [usedMarks, setUsedMarks] = useState(0);

  const facultyId = user?.id;

  /* ============================================
      FETCH SUBJECTS TAUGHT BY FACULTY
  ============================================ */
  useEffect(() => {
    if (!facultyId) return;
    (async () => {
      try {
        const res = await API.get(`/teaching-assignment/byfaculty/${facultyId}`);
        setAssignments(res.data);
      } catch (err) {
        showToast("error", "Error fetching teaching assignments");
      }
    })();
  }, [facultyId]);

  /* ============================================
      FETCH EXISTING ACTIVITY + USED MARKS
  ============================================ */
  useEffect(() => {
    if (!assignmentId) return;

    (async () => {
      try {
        const res = await API.get(`/rubric/used-marks?assignmentId=${assignmentId}`);
        setActivityCount(res.data.activityCount || 0);
        setUsedMarks(res.data.usedMarks || 0);
      } catch (err) {
        console.error("Error fetching used marks:", err);
        setActivityCount(0);
        setUsedMarks(0);
      }
    })();
  }, [assignmentId]);

  /* ============================================
      SUBMIT HANDLER
  ============================================ */
  const create = async (e) => {
    e.preventDefault();

    if (!assignmentId) {
      showToast("error", "Select subject & class");
      return;
    }

    if (activityCount >= 2) {
      showToast("error", "Only 2 activities allowed!");
      return;
    }

    const remainingMarks = 15 - usedMarks;
    let finalMarks = remainingMarks;

    if (activityCount === 0) {
      // Activity 1 — get marks from frontend input
      finalMarks = Number(activityMarks);
      if (!finalMarks || finalMarks <= 0 || finalMarks >= 15) {
        showToast("error", "Enter valid marks ");
        return;
      }
    }

    if (activityCount === 1 && remainingMarks <= 0) {
      showToast("error", "Remaining marks exhausted");
      return;
    }

    try {
      const formattedDate = parseKolkataInputToISOString(scheduleDate);

      //  Create activity
      const payload = {
        name,
        description,
        scheduleDate: formattedDate,
        assignmentId,
        marks: finalMarks // ✅ send marks for first activity
      };

      const actRes = await API.post("/activities/create", payload);

      const activityId = actRes.data.activity?._id;
      if (!activityId) {
        console.error("Activity creation response:", actRes.data);
        throw new Error("Activity creation failed: No _id returned");
      }

      showToast("success", `Activity "${name}" created with ${finalMarks} marks`);
      navigate("/activities");

    } catch (err) {
      console.error("Create activity error:", err);
      showToast(
        "error",
        err.response?.data?.error || err.message || "Failed to create activity"
      );
    }
  };

  /* ============================================
      UI
  ============================================ */
  const remaining = 15 - usedMarks;

  return (
    <div className="card">
      <h2>Create Activity</h2>

      <form onSubmit={create} className="create-form">

        <div className="form-row">
          <label>Activity Name</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="form-row">
          <label>Description</label>
          <textarea required value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className="form-row">
          <label>Schedule Date & Time</label>
          <input
            type="datetime-local"
            required
            value={scheduleDate}
            onChange={(e) => setScheduleDate(e.target.value)}
          />
        </div>

        <div className="form-row">
          <label>Select Subject & Class</label>
          <select
            required
            value={assignmentId}
            onChange={(e) => setAssignmentId(e.target.value)}
          >
            <option value="">-- Select --</option>
            {assignments.map(a => (
              <option key={a._id} value={a._id}>
                {a.subjectId?.name} — {a.classId?.name}
              </option>
            ))}
          </select>
        </div>

        {/* Activity 1 marks input */}
        {assignmentId && activityCount === 0 && (
          <div className="form-row">
            <label>Enter Marks for Activity 1 </label>
            <input
              type="number"
              value={activityMarks}
              onChange={(e) => setActivityMarks(e.target.value)}
              min={1}
              max={14}
              required
            />
          </div>
        )}

        {assignmentId && (
          <div style={{ marginTop: 10 }}>
            <b>Activities created:</b> {activityCount}/2 <br />
            <b>Used Marks:</b> {usedMarks}/15 <br />
            <b>Remaining:</b> {remaining}/15
          </div>
        )}

        <div style={{ marginTop: 15, display: "flex", gap: 12 }}>
          <button type="submit" disabled={activityCount >= 2}>
            Create Activity
          </button>
          <button type="button" onClick={() => navigate("/activities")}>
            Cancel
          </button>
        </div>

      </form>
    </div>
  );
}

export default CreateActivity;
