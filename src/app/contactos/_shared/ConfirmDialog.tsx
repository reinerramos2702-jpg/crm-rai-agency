'use client';

import React from 'react';
import { TriangleAlert } from 'lucide-react';
import { CrmDialog } from './CrmDialog';

interface ConfirmDialogProps {
  title: string;
  text: string;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** Confirmación de acciones destructivas (`alertdialog`; el foco inicial cae en «Cancelar»). */
export function ConfirmDialog({ title, text, confirmLabel, busy = false, onConfirm, onClose }: ConfirmDialogProps) {
  return (
    <CrmDialog title={title} description={text} onClose={onClose} dismissible={!busy} role="alertdialog" size="sm" icon={<TriangleAlert size={18} />}>
      <div className="crm-form-actions">
        <button type="button" className="secondary" data-autofocus="" disabled={busy} onClick={onClose}>Cancelar</button>
        <button type="button" className="danger" disabled={busy} onClick={onConfirm}>
          {busy ? 'Eliminando…' : confirmLabel}
        </button>
      </div>
    </CrmDialog>
  );
}
