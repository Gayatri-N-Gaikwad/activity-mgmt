import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../../services/api";
import StatusConfirmModal from "../../components/StatusConfirmModal";
import showToast from "../../utils/toast";

const STATUS_OPTIONS = [
  { value: "Scheduled", label: "Scheduled" },
  { value: "Conducted", label: "Conducted" },
  { value: "Marks_Updated", label: "Marks Updated" },
];

const STATUS_TRANSITIONS = {
  Scheduled: ["Conducted"],
  Conducted: ["Marks_Updated"],
  Marks_Updated: [],
};

function ActivityList() {
  const [activities, setActivities] = useState([]);
  const [role, setRole] = useState("");
  const [userId, setUserId] = useState("");
  const [expanded, setExpanded] = useState(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPayload, setModalPayload] = useState(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    console.log("User object:", user);

    setRole(user?.role?.toLowerCase() || "");
    setUserId(user?.id || "");
    loadActivities(user?.id);
  }, []);

  const loadActivities = async (uid) => {
    try {
      const res = await API.get("/activities/all");

      let all = res.data.activities || [];

      console.log("Logged in userId:", uid);
      console.log("Activities received:", all);

      const filtered = all.filter((a) => {
        console.log("Comparing:", String(a.coordinatorId), "with", String(uid));
        return String(a.coordinatorId) === String(uid);
      });

      console.log("Filtered result:", filtered);

      setActivities(filtered);
    } catch (err) {
      console.error("Error loading activities:", err);
      showToast("error", "Failed to load activities");
    }
  };

  const deleteActivity = async (id) => {
    if (!window.confirm("Are you sure you want to delete this activity?")) return;

    try {
      await API.delete(`/activities/delete/${id}`);
      showToast("success", "Activity deleted");

      loadActivities(userId);
    } catch (err) {
      console.error("Delete error:", err);

      const message =
        err?.response?.data?.error ||
        "Unable to delete activity. Please try again.";

      showToast("error", message);
    }

  };

  const downloadActivityMarks = async (activityId, activityName) => {
    try {
      const response = await API.get(`/marks/download/${activityId}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${activityName}_Marks.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      showToast('success', 'Marks downloaded successfully');
    } catch (err) {
      console.error('Download error:', err);
      showToast('error', 'Error downloading marks');
    }
  };

  async function handleStatusChangeRequest(act, newStatus) {
    if (!act || newStatus === act.status) return;
    const allowed = STATUS_TRANSITIONS[act.status] || [];
    if (!allowed.includes(newStatus)) {
      showToast("error", `Cannot change status from ${act.status} to ${newStatus}`);
      return;
    }

    const now = Date.now();

    if (newStatus === "Conducted") {
      if (act.status === "Marks_Updated") {
        showToast("error", "Cannot mark as Conducted: marks already updated");
        return;
      }
      if (!act.scheduleDate) {
        showToast("error", "Cannot mark as Conducted: activity has no scheduled date");
        return;
      }
      const sched = new Date(act.scheduleDate).getTime();
      if (isNaN(sched) || sched > now) {
        showToast("error", "Cannot mark as Conducted before scheduled date/time");
        return;
      }
    }

    // Direct API call for Marks_Updated instead of opening modal
    if (newStatus === "Marks_Updated") {
      if (act.status !== "Conducted") {
        showToast("error", "Can update marks only after the activity has been Conducted");
        return;
      }

      try {
        await API.put(`/activities/update/${act._id}`, { status: newStatus });
        showToast("success", "Status updated to Marks Updated");
        loadActivities(userId);
      } catch (err) {
        console.error("Status update error", err);
        showToast("error", err.response?.data?.error || "Error updating status. Ensure marks are added.");
      }
      return;
    }

    setModalPayload({ act, newStatus });
    setModalOpen(true);
  }

  return (
    <div className="card activities-card">
      <div className="activities-header">
        <div>
          <h2>Activities</h2>
          <p className="muted">Track, manage and update all faculty activities in one table.</p>
        </div>

        {["faculty", "coordinator", "hod"].includes(role) && (
          <Link to="/activity/create" className="btn btn-primary" style={{ textDecoration: "none" }}>
            <i className="fa fa-plus" style={{ marginRight: 8 }}></i> Create Activity
          </Link>
        )}
      </div>

      <div className="activities-table-wrap" style={{ marginTop: 16 }}>
        <table className="activities-table">
          <thead>
            <tr>
              <th className="col-name">Name</th>
              <th className="col-desc">Description</th>
              <th className="col-rubric">Rubric Criteria</th>
              <th className="col-schedule">Schedule Date</th>
              <th className="col-status">Status</th>
              <th className="col-action-edit">Edit</th>
              <th className="col-action-marks">Marks</th>
              <th className="col-action-download">Download</th>
              <th className="col-action-delete">Delete</th>
            </tr>
          </thead>

          <tbody>
            {activities.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: "center" }}>
                  No Activities Found
                </td>
              </tr>
            ) : (
              activities.map((act) => (
                <tr key={act._id}>
                  <td className="col-name">
                    <Link
                      to={`/activity/details/${act._id}`}
                      className="activity-name-link"
                    >
                      {act.name}
                    </Link>
                  </td>

                  <td className="col-desc">
                    {expanded.has(act._id) ? (
                      <>
                        <span>{act.description}</span>
                        {act.description && act.description.length > 120 && (
                          <button
                            type="button"
                            onClick={() => {
                              const s = new Set(expanded);
                              s.delete(act._id);
                              setExpanded(s);
                            }}
                            className="desc-toggle"
                          >
                            show less
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="truncate">{act.description}</span>
                        {act.description && act.description.length > 120 && (
                          <button
                            type="button"
                            onClick={() => {
                              const s = new Set(expanded);
                              s.add(act._id);
                              setExpanded(s);
                            }}
                            className="desc-toggle"
                          >
                            view more
                          </button>
                        )}
                      </>
                    )}

                  </td>

                  <td className="col-rubric">
                    <span className="rubric-count">{act.rubric?.length || 0} criteria</span>
                    <div className="max-marks-display">
                      {(act.rubric || []).reduce((sum, r) => sum + Number(r.maxMarks || 0), 0)} marks
                    </div>
                  </td>

                  <td className="col-schedule">
                    {act.scheduleDate
                      ? new Date(act.scheduleDate).toLocaleString("en-GB", {
                        timeZone: "Asia/Kolkata",
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                      : <span className="not-scheduled">Not Scheduled</span>}
                  </td>

                  <td className="col-status">
                    <span className={`status-pill ${String(act.status || "").toLowerCase()}`}>
                      {String(act.status || "").replace("_", " ")}
                    </span>
                    <select
                      className="status-select"
                      value={act.status}
                      onChange={(e) => handleStatusChangeRequest(act, e.target.value)}
                    >
                      {STATUS_OPTIONS.map((opt) => {
                        const allowedTargets = STATUS_TRANSITIONS[act.status] || [];
                        const disabled = opt.value !== act.status && !allowedTargets.includes(opt.value);
                        return (
                          <option key={opt.value} value={opt.value} disabled={disabled}>
                            {opt.label}
                          </option>
                        );
                      })}
                    </select>
                  </td>

                  <td className="col-action-edit">
                    <Link to={`/activity/edit/${act._id}`} className="action-link-edit">
                      <i className="fa fa-pen-to-square"></i>
                    </Link>
                  </td>

                  <td className="col-action-marks">
                    {(act.status === "Conducted" || act.status === "Marks_Updated") ? (
                      <Link to={`/marks/activity/${act._id}`} className="btn btn-success btn-icon">
                        <i className="fa fa-list-check"></i>
                      </Link>
                    ) : (
                      <span className="action-placeholder">−</span>
                    )}
                  </td>

                  <td className="col-action-download">
                    {act.status === "Marks_Updated" ? (
                      <button
                        onClick={() => downloadActivityMarks(act._id, act.name)}
                        className="btn btn-download btn-compact"
                      >
                        <i className="fa fa-download"></i>
                      </button>
                    ) : (
                      <span className="action-placeholder">−</span>
                    )}
                  </td>

                  <td className="col-action-delete">
                    <button onClick={() => deleteActivity(act._id)} className="btn btn-delete btn-compact">
                      <i className="fa fa-trash"></i>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalPayload && (
        <StatusConfirmModal
          open={modalOpen}
          activityName={modalPayload.act.name}
          currentStatus={modalPayload.act.status}
          newStatus={modalPayload.newStatus}
          onClose={() => {
            setModalOpen(false);
            setModalPayload(null);
          }}
          onConfirm={async (reason, files) => {
            if (
              modalPayload.newStatus === "Conducted" &&
              (!files || files.length === 0)
            ) {
              showToast("error", "Please upload at least one model answer file");
              return;
            }
            if (files && files.length > 0) {
              const invalid = files.some(
                (f) =>
                  !(f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"))
              );
              if (invalid) {
                showToast("error", "Only PDF files are allowed for model answers");
                return;
              }
            }

            try {
              const formData = new FormData();
              formData.append("status", modalPayload.newStatus);
              if (reason) {
                formData.append("statusChangeReason", reason);
              }

              if (files && files.length > 0) {
                files.forEach((file) => {
                  formData.append("modelAnswerFiles", file);
                });
              }

              await API.put(`/activities/update/${modalPayload.act._id}`, formData, {
                headers: {
                  "Content-Type": "multipart/form-data",
                },
              });

              setModalOpen(false);
              setModalPayload(null);
              await loadActivities(userId);
              showToast("success", "Status updated");
            } catch (err) {
              console.error("Status update error", err);
              showToast("error", err.response?.data?.error || "Error updating status");
            }
          }}

        />
      )}
    </div>
  );
}

export default ActivityList;
