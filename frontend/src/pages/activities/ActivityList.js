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
      console.error(err);
      showToast("error", "Error deleting activity");
    }
  };

  function handleStatusChangeRequest(act, newStatus) {
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

    if (newStatus === "Marks_Updated" && act.status !== "Conducted") {
      showToast("error", "Can update marks only after the activity has been Conducted");
      return;
    }

    setModalPayload({ act, newStatus });
    setModalOpen(true);
  }

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Activities</h2>

        {["faculty", "coordinator", "hod"].includes(role) && (
          <Link to="/activity/create" className="btn btn-primary" style={{ textDecoration: "none" }}>
            <i className="fa fa-plus" style={{ marginRight: 8 }}></i> Create Activity
          </Link>
        )}
      </div>

      <div style={{ marginTop: 16 }}>
        <table>
          <thead>
            <tr>
              <th className="col-name">Name</th>
              <th className="col-desc">Description</th>
              <th className="col-schedule">Schedule Date</th>
              <th className="col-status">Status</th>
              <th className="col-actions">Actions</th>
            </tr>
          </thead>

          <tbody>
            {activities.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: "center" }}>
                  No Activities Found
                </td>
              </tr>
            ) : (
              activities.map((act) => (
                <tr key={act._id}>
                  <td className="col-name">{act.name}</td>

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

                    {act.rubric && act.rubric.length > 0 && (
                      <div style={{ marginTop: 6, color: "#444", fontSize: 13 }}>
                        <strong>Rubric:</strong>{" "}
                        {act.rubric.map((r) => `${r.name} ${r.maxMarks}`).join(" + ")}
                      </div>
                    )}
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
                      : "Not Scheduled"}
                  </td>

                  <td className="col-status">
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

                  <td className="actions-cell">
                    <Link to={`/activity/edit/${act._id}`} className="muted" style={{ marginRight: 12 }}>
                      <i className="fa fa-pen-to-square" style={{ marginRight: 6 }}></i>
                      Edit
                    </Link>

                    {act.status === "Conducted" && (
                      <Link to={`/marks/activity/${act._id}`} className="btn btn-success" style={{ marginRight: 12 }}>
                        <i className="fa fa-plus" style={{ marginRight: 6 }}></i>
                        Add Marks
                      </Link>
                    )}

                    <button onClick={() => deleteActivity(act._id)} className="btn btn-danger">
                      <i className="fa fa-trash" style={{ marginRight: 6 }}></i>
                      Delete
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
          onConfirm={async (reason) => {
            try {
              await API.put(`/activities/update/${modalPayload.act._id}`, {
                status: modalPayload.newStatus,
                statusChangeReason: reason,
              });

              setActivities((prev) =>
                prev.map((a) =>
                  a._id === modalPayload.act._id ? { ...a, status: modalPayload.newStatus } : a
                )
              );

              showToast("success", "Status updated");
            } catch (err) {
              console.error("Status update error", err);
              showToast("error", err.response?.data?.error || "Error updating status");
            } finally {
              setModalOpen(false);
              setModalPayload(null);
            }
          }}
        />
      )}
    </div>
  );
}

export default ActivityList;
