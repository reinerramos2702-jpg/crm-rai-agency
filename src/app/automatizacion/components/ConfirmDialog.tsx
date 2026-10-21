'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog } from './Dialog';

interface ConfirmDialogProps {
  title: string;
  titleId: string;
  confirmLabel: string;
  /** Acción destructiva: el botón de confirmar va en rojo. */
  danger?: boolean;
  busy?: boolean;
  icon?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  children: React.ReactNode;
}

/** Confirmación accesible (sustituye a `window.confirm`): foco inicial en «Cancelar» para que Enter no destruya nada por error. */
export function ConfirmDialog({ title, titleId, confirmLabel, danger = false, busy = false, icon, onConfirm, onCancel, children }: ConfirmDialogProps) {
  return (
    <Dialog
      title={title}
      titleId={titleId}
      size="sm"
      icon={icon}
      onClose={onCancel}
      footer={(close) => (
        <>
          <button type="button" className="au-btn au-btn--ghost" data-autofocus onClick={close}>Cancelar</button>
          <button type="button" className={`au-btn ${danger ? 'au-btn--danger' : 'au-btn--primary'}`} onClick={onConfirm} disabled={busy}>
            {busy ? <Loader2 size={14} className="au-spin" aria-hidden="true" /> : null} {confirmLabel}
          </button>
        </>
      )}
    >
      {children}
    </Dialog>
  );
}
