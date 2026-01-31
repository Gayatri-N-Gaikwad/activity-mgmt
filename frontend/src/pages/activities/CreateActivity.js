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

  const facultyId = user?.id;

  /* ============================================
      FETCH SUBJECTS TAUGHT BY FACULTY
  ============================================ */
  useEffect(() => {
    if (!facultyId) return;
    (async () => {
      try {
        const res = await API.get(
          `/teaching-assignment/byfaculty/${facultyId}`
        );
        setAssignments(res.data);
      } catch (err) {
        showToast("error", "Error fetching teaching assignments");
      }
    })();
  }, [facultyId]);

  /* ============================================
      SUBMIT HANDLER
  ============================================ */
  const create = async (e) => {
    e.preventDefault();

    if (!assignmentId) {
      showToast("error", "Select subject & class");
      return;
    }

    const finalMarks = Number(activityMarks);
    if (!Number.isFinite(finalMarks) || finalMarks <= 0) {
      showToast("error", "Enter valid marks");
      return;
    }

    try {
      const formattedDate = parseKolkataInputToISOString(scheduleDate);

      const now = new Date();
      const scheduledTime = new Date(formattedDate);

      if (isNaN(scheduledTime.getTime())) {
        showToast("error", "Please select a valid schedule date");
        return;
      }

      if (scheduledTime <= now) {
        showToast("error", "Activity must be scheduled in the future");
        return;
      }

      //  Create activity
      const payload = {
        name,
        description,
        scheduleDate: formattedDate,
        assignmentId,
        marks: finalMarks,
      };

      const actRes = await API.post("/activities/create", payload);

      const activityId = actRes.data.activity?._id;
      if (!activityId) {
        console.error("Activity creation response:", actRes.data);
        throw new Error("Activity creation failed: No _id returned");
      }

      showToast(
        "success",
        `Activity "${name}" created with ${finalMarks} marks`
      );
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
  return (
    <div className="card">
      <h2>Create Activity</h2>

      <form onSubmit={create} className="create-form">
        <div className="form-row">
          <label>Activity Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="form-row">
          <label>Description</label>
          <textarea
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
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
            {assignments.map((a) => (
              <option key={a._id} value={a._id}>
                {a.subjectId?.name} — {a.year}-{a.division}
              </option>
            ))}
          </select>
        </div>

        {assignmentId && (
          <div className="form-row">
            <label>Enter Marks for Activity</label>
            <input
              type="number"
              value={activityMarks}
              onChange={(e) => setActivityMarks(e.target.value)}
              min={1}
              required
            />
          </div>
        )}

        <div style={{ marginTop: 15, display: "flex", gap: 12 }}>
          <button type="submit">Create Activity</button>
          <button type="button" onClick={() => navigate("/activities")}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateActivity;
