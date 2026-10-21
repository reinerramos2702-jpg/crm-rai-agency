'use client';

import React from 'react';
import { DialogShell } from './DialogShell';

interface ConfirmDialogProps {
  title: string;
  text: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Confirmación de una acción destructiva. El foco inicial queda en «Cancelar» para evitar confirmar sin querer. */
export function ConfirmDialog({ title, text, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <DialogShell titleId="mm-confirm-title" onClose={onCancel} size="sm">
      <h2 id="mm-confirm-title" className="mm-confirm-title">{title}</h2>
      <p className="muted mm-confirm-text">{text}</p>
      <div className="mm-form-actions mm-confirm-actions">
        <button type="button" className="btn-ghost btn-sm" onClick={onCancel} data-autofocus>
          Cancelar
        </button>
        <button type="button" className="btn-danger btn-sm" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </DialogShell>
  );
}
