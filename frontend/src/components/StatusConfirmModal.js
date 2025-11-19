import React, { useState } from 'react';

export default function StatusConfirmModal({ open, onClose, onConfirm, activityName, currentStatus, newStatus }) {
  const [reason, setReason] = useState('');

  if (!open) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <h3>Confirm status change</h3>
        <p>
          Are you sure you want to change status for <strong>{activityName}</strong> from <em>{currentStatus}</em> to <em>{newStatus}</em>?
        </p>
        <label style={{display:'block', marginTop:8}}>Optional reason (for audit):</label>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} style={{width:'100%'}} />

        <div style={{display:'flex', justifyContent:'flex-end', gap:8, marginTop:12}}>
          <button className="btn" onClick={() => { setReason(''); onClose(); }}>Cancel</button>
          <button className="btn btn-primary" onClick={() => { onConfirm(reason); setReason(''); }}>Confirm</button>
        </div>
      </div>
    </div>
  );
}
