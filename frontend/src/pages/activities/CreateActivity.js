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

  const [markSubdivisions, setMarkSubdivisions] = useState([]);

  const facultyId = user?.id;

  /* ============================================
      FETCH SUBJECTS TAUGHT BY FACULTY
  ============================================ */
  useEffect(() => {
    if (!facultyId) return;
    (async () => {
      try {
        const res = await API.get(
          `/teaching-assignment/byfaculty/${facultyId}`,
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

  const addSubdivision = () => {
    setMarkSubdivisions([...markSubdivisions, { title: "", marks: "" }]);
  };

  const removeSubdivision = (index) => {
    const next = [...markSubdivisions];
    next.splice(index, 1);
    setMarkSubdivisions(next);
  };

  const updateSubdivision = (index, field, value) => {
    const next = [...markSubdivisions];
    next[index][field] = value;
    setMarkSubdivisions(next);
  };

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

      let subdivisionPayload = [];

      if (markSubdivisions.some((s) => s.title || s.marks)) {
        let sum = 0;

        for (const s of markSubdivisions) {
          if (!s.title || !s.marks) {
            showToast("error", "All subdivision fields are required");
            return;
          }
          const m = Number(s.marks);
          if (!Number.isFinite(m) || m <= 0) {
            showToast("error", "Subdivision marks must be valid numbers");
            return;
          }
          sum += m;
        }

        if (sum !== finalMarks) {
          showToast(
            "error",
            `Subdivision marks (${sum}) must equal total marks (${finalMarks})`,
          );
          return;
        }

        subdivisionPayload = markSubdivisions.map((s) => ({
          title: s.title,
          marks: Number(s.marks),
        }));
      }

      //  Create activity
      const payload = {
        name,
        description,
        scheduleDate: formattedDate,
        assignmentId,
        marks: finalMarks,
        markSubdivisions: subdivisionPayload,
      };

      const actRes = await API.post("/activities/create", payload);

      const activityId = actRes.data.activityId;
      if (!activityId) {
        console.error("Activity creation response:", actRes.data);
        throw new Error("Activity creation failed: No _id returned");
      }

      showToast(
        "success",
        `Activity "${name}" created with ${finalMarks} marks`,
      );
      navigate("/activities");
    } catch (err) {
      console.error("Create activity error:", err);
      showToast(
        "error",
        err.response?.data?.error || err.message || "Failed to create activity",
      );
    }
  };

  /* ============================================
      UI
  ============================================ */
  return (
    <div className="create-activity-page">
      <div className="create-activity-card">
        <div className="form-brand">Create Activity</div>
        <h2 className="form-title">New Activity</h2>
        <p className="form-subtitle">Define activity details, schedule, and marks breakdown.</p>

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
              onChange={(e) => {
                setActivityMarks(e.target.value);
                setMarkSubdivisions([]); // 👈 reset breakdown when total marks change
              }}
              min={1}
              required
            />
          </div>
        )}

        {assignmentId && activityMarks && (
          <div className="form-row">
            <label>Marks Breakdown (optional)</label>

            <div className="breakdown-list">
              {markSubdivisions.map((row, idx) => (
                <div key={idx} className="breakdown-row">
                  <input
                    placeholder="Subtopic / Component"
                    value={row.title}
                    onChange={(e) =>
                      updateSubdivision(idx, "title", e.target.value)
                    }
                  />
                  <input
                    type="number"
                    min="1"
                    placeholder="Marks"
                    value={row.marks}
                    onChange={(e) =>
                      updateSubdivision(idx, "marks", e.target.value)
                    }
                    className="marks-input"
                  />
                  {markSubdivisions.length > 1 && (
                    <button type="button" className="btn-remove" onClick={() => removeSubdivision(idx)}>
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button type="button" className="btn btn-outline" onClick={addSubdivision}>
              + Add Subdivision
            </button>

            <small style={{ color: "#666" }}>
              Breakdown is for display only. Faculty will enter total marks
              later.
            </small>
          </div>
        )}

        <div className="form-actions">
          <button type="submit" className="btn btn-primary">Create Activity</button>
          <button type="button" className="btn btn-outline" onClick={() => navigate("/activities")}>
            Cancel
          </button>
        </div>
      </form>
      </div>
    </div>
  );
}

export default CreateActivity;
