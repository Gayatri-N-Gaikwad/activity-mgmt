import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../../services/api";
import StatusConfirmModal from "../../components/StatusConfirmModal";
import showToast from '../../utils/toast';

function ActivityList() {
  const [activities, setActivities] = useState([]);
  const [role, setRole] = useState("");
  const [expanded, setExpanded] = useState(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPayload, setModalPayload] = useState(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    setRole(user?.role?.toLowerCase() || "");

    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      const res = await API.get("/activities/all");
      setActivities(res.data.activities || []);
    } catch (err) {
      console.error("Error loading activities:", err);
      showToast('error', 'Failed to load activities');
    }
  };

  const deleteActivity = async (id) => {
    if (!window.confirm("Are you sure you want to delete this activity?")) return;

    try {
      await API.delete(`/activities/delete/${id}`);
      showToast('success', 'Activity deleted');
      loadActivities();
    } catch (err) {
      console.error(err);
      showToast('error', 'Error deleting activity');
    }
  };

  function handleStatusChangeRequest(act, newStatus) {
    if (!act || newStatus === act.status) return;

    const now = Date.now();

    // Validation: Scheduled -> Conducted only if scheduleDate <= now
    if (newStatus === 'Conducted') {
      if (act.status === 'Marks_Updated') {
        showToast('error', 'Cannot mark as Conducted: marks already updated');
        return;
      }
      if (!act.scheduleDate) {
        showToast('error', 'Cannot mark as Conducted: activity has no scheduled date');
        return;
      }
      const sched = new Date(act.scheduleDate).getTime();
      if (isNaN(sched) || sched > now) {
        showToast('error', 'Cannot mark as Conducted before scheduled date/time');
        return;
      }
    }

    // Validation: Marks Updated only if current status is Conducted
    if (newStatus === 'Marks_Updated' && act.status !== 'Conducted') {
      showToast('error', 'Can update marks only after the activity has been Conducted');
      return;
    }

    // Passed validations -> show confirmation modal
    setModalPayload({ act, newStatus });
    setModalOpen(true);
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Activities</h2>
        {["faculty", "coordinator", "hod"].includes(role) && (
          <Link to="/activity/create" className="btn btn-primary" style={{textDecoration:'none'}}>
            <i className="fa fa-plus" style={{marginRight:8}}></i> Create Activity
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
                          <a href="#" onClick={(e) => { e.preventDefault(); const s = new Set(expanded); s.delete(act._id); setExpanded(s); }} className="desc-toggle"> show less</a>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="truncate">{act.description}</span>
                        {act.description && act.description.length > 120 && (
                          <a href="#" onClick={(e) => { e.preventDefault(); const s = new Set(expanded); s.add(act._id); setExpanded(s); }} className="desc-toggle"> view more</a>
                        )}
                      </>
                    )}

                    {act.rubric && act.rubric.length > 0 && (
                      <div style={{ marginTop: 6, color: '#444', fontSize: 13 }}>
                        <strong>Rubric:</strong> {act.rubric.map(r => `${r.name} ${r.maxMarks}`).join(' + ')}
                      </div>
                    )}
                  </td>
                  <td className="col-schedule">
                    {act.scheduleDate 
                      ? new Date(act.scheduleDate).toLocaleString('en-GB', { timeZone: 'Asia/Kolkata', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' })
                      : "Not Scheduled"}
                  </td>
                  <td className="col-status">
                    <select
                      className="status-select"
                      value={act.status}
                      onChange={(e) => handleStatusChangeRequest(act, e.target.value)}
                    >
                      <option value="Scheduled">Scheduled</option>
                      <option value="Conducted">Conducted</option>
                      <option value="Marks_Updated">Marks Updated</option>
                    </select>
                  </td>
                  <td className="actions-cell">
                    <Link to={`/activity/edit/${act._id}`} className="muted" style={{marginRight:12}}>
                      <i className="fa fa-pen-to-square" style={{marginRight:6}}></i>Edit
                    </Link>

                    {act.status === "Conducted" && (
                      <Link to={`/marks/activity/${act._id}`} className="btn btn-success" style={{marginRight:12}}>
                        <i className="fa fa-plus" style={{marginRight:6}}></i>Add Marks
                      </Link>
                    )}

                    <button onClick={() => deleteActivity(act._id)} className="btn btn-danger">
                      <i className="fa fa-trash" style={{marginRight:6}}></i>Delete
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
          onClose={() => { setModalOpen(false); setModalPayload(null); }}
          onConfirm={async (reason) => {
            try {
              await API.put(`/activities/update/${modalPayload.act._id}`, { status: modalPayload.newStatus, statusChangeReason: reason });
              // update local state
              setActivities((prev) => prev.map(a => a._id === modalPayload.act._id ? { ...a, status: modalPayload.newStatus } : a));
              showToast('success', 'Status updated');
            } catch (err) {
              console.error('Status update error', err);
              showToast('error', err.response?.data?.error || 'Error updating status');
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
