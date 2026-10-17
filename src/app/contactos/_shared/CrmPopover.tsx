'use client';

import React, { useEffect, useId, useRef, useState } from 'react';

interface CrmPopoverProps {
  label: string;
  icon?: React.ReactNode;
  /** Contador de ajustes activos junto a la etiqueta. */
  badge?: number;
  /** El panel recibe `close` para cerrarse tras elegir. */
  children: (close: () => void) => React.ReactNode;
}

/** Botón con panel flotante: cierra con Escape, clic fuera o al perder el foco; sin desenfoque. */
export function CrmPopover({ label, icon, badge, children }: CrmPopoverProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return undefined;
    function onPointer(e: PointerEvent) {
      if (wrapRef.current && e.target instanceof Node && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { setOpen(false); triggerRef.current?.focus(); }
    }
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="crm-pop" ref={wrapRef}>
      <button
        ref={triggerRef}
        type="button"
        className="secondary btn-sm"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        {icon}
        {label}
        {badge ? <span className="badge badge-gold crm-pop-badge">{badge}</span> : null}
      </button>
      {open && (
        <div id={panelId} className="crm-pop-panel" role="group" aria-label={label}>
          {children(() => { setOpen(false); triggerRef.current?.focus(); })}
        </div>
      )}
    </div>
  );
}
