'use client';

import React, { useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Dialog } from './Dialog';

interface Props {
  title: string;
  description: string;
  confirmLabel: string;
  busyLabel: string;
  onClose: () => void;
  /** Devuelve null si todo salió bien (el padre cierra) o el mensaje de error a mostrar. */
  onConfirm: () => Promise<string | null>;
}

/** Confirmación destructiva accesible (sustituye al `confirm()` nativo). El foco inicial cae en «Cancelar». */
export function ConfirmDialog({ title, description, confirmLabel, busyLabel, onClose, onConfirm }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    const message = await onConfirm();
    setBusy(false);
    if (message) setError(message);
  }

  return (
    <Dialog
      title={title} description={description} role="alertdialog" size="sm" dismissible={!busy} onClose={onClose}
      icon={<TriangleAlert size={18} />}
    >
      <div className="cal-dialog-form">
        {error && (
          <p className="cal-banner cal-banner--err" role="alert">
            <TriangleAlert size={14} aria-hidden="true" /> <span>{error}</span>
          </p>
        )}
        <div className="cal-actions">
          <button type="button" className="ghost" data-autofocus onClick={onClose} disabled={busy}>Cancelar</button>
          <button type="button" className="danger" onClick={() => void run()} disabled={busy} aria-busy={busy}>
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
