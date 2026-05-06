import React, { useState } from 'react';

interface ConfirmDialogProps {
  message: string;
  extraSelect?: React.ReactNode; // optional select element for moving items
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ConfirmDialog({ message, extraSelect, onCancel, onConfirm }: ConfirmDialogProps) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h3>{message}</h3>
        {extraSelect && <div style={{ marginTop: '1rem' }}>{extraSelect}</div>}
        <div className="form-actions">
          <button className="btn-secondary" onClick={onCancel}>Cancelar</button>
          <button className="btn-danger" onClick={onConfirm}>Confirmar</button>
        </div>
      </div>
    </div>
  );
}
