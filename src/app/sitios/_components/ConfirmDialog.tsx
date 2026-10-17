'use client';

import React, { useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Dialog } from './Dialog';

interface Props {
  title: string;
  description: string;
  confirmLabel: string;
  busyLabel: string;
  /** Contenido adicional (avisos) entre la descripción y los botones. */
  children?: React.ReactNode;
  tone?: 'danger' | 'primary';
  onClose: () => void;
  /** Devuelve null si todo salió bien (el padre cierra) o el mensaje de error a mostrar. */
  onConfirm: () => Promise<string | null>;
}

export function ConfirmDialog({
  title, description, confirmLabel, busyLabel, children, tone = 'danger', onClose, onConfirm,
}: Props) {
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
      <div className="st-dialog-form">
        {children}
        {error && (
          <p className="st-banner st-banner--err" role="alert">
            <TriangleAlert size={14} aria-hidden="true" /> {error}
          </p>
        )}
        <div className="st-actions">
          <button type="button" className="ghost" data-autofocus onClick={onClose} disabled={busy}>Cancelar</button>
          <button
            type="button" className={tone === 'danger' ? 'danger' : 'primary'} onClick={() => void run()}
            disabled={busy} aria-busy={busy}
          >
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
