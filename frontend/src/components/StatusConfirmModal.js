import React, { useState } from 'react';

export default function StatusConfirmModal({ open, onClose, onConfirm, activityName, currentStatus, newStatus }) {
  const [reason, setReason] = useState('');
  const [files, setFiles] = useState([]);

  const isConductedChange = newStatus === 'Conducted';

  if (!open) return null;

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const handleConfirm = () => {
    if (isConductedChange && files.length === 0) {
      alert('Please upload at least one model answer file to confirm the activity was conducted.');
      return;
    }
    onConfirm(reason, files);
    setReason('');
    setFiles([]);
  };

  const handleClose = () => {
    setReason('');
    setFiles([]);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <h3>Confirm status change</h3>
        <p>
          Are you sure you want to change status for <strong>{activityName}</strong> from <em>{currentStatus}</em> to <em>{newStatus}</em>?
        </p>

        {isConductedChange && (
          <div style={{ marginTop: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
              Upload Model Answer Files (required)*:
            </label>
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              style={{ marginBottom: 8 }}
            />
            {files.length > 0 && (
              <div style={{ fontSize: 14, color: '#666' }}>
                Selected files: {files.map(f => f.name).join(', ')}
              </div>
            )}
          </div>
        )}

        <label style={{display:'block', marginTop:8}}>Optional reason/notes (for audit):</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          style={{width:'100%'}}
          placeholder={isConductedChange ? "Add notes about the conducted activity..." : ""}
        />

        <div style={{display:'flex', justifyContent:'flex-end', gap:8, marginTop:12}}>
          <button className="btn" onClick={handleClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
}
