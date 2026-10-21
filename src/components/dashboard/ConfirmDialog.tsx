'use client';

import React, { useEffect, useRef } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';

interface Props {
  open: boolean;
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** Confirmación propia (reemplaza window.confirm): accesible, sin blur, Esc cierra, foco en "Cancelar". */
export function ConfirmDialog({ open, title, body, confirmLabel, busy, onConfirm, onClose }: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => cancelRef.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { window.clearTimeout(t); window.removeEventListener('keydown', onKey); };
  }, [open, busy, onClose]);

  if (!open) return null;
  return (
    <div className="rai-sheet-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="rai-sheet" role="alertdialog" aria-modal="true" aria-labelledby="dash-confirm-title" aria-describedby="dash-confirm-body" style={{ maxWidth: 420 }}>
        <div className="rai-sheet-head">
          <span className="rai-sheet-ico dash-ico-danger"><AlertTriangle size={18} /></span>
          <div><h3 id="dash-confirm-title">{title}</h3></div>
          <button type="button" className="rai-sheet-x" aria-label="Cerrar" onClick={onClose} disabled={busy}><X size={16} /></button>
        </div>
        <p id="dash-confirm-body" style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'var(--rai-muted)' }}>{body}</p>
        <div className="rai-sheet-actions">
          <button type="button" ref={cancelRef} className="ghost rai-sheet-btn" onClick={onClose} disabled={busy}>Cancelar</button>
          <button type="button" className="rai-sheet-btn dash-btn-danger" onClick={onConfirm} disabled={busy}>
            {busy ? <><Loader2 size={14} className="animate-spin" /> Eliminando…</> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
