'use client';

import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

interface DialogProps {
  title: string;
  /** Texto de apoyo bajo el título (se enlaza con aria-describedby). */
  description?: string;
  onClose: () => void;
  /** Mientras es false no se cierra con Escape, clic fuera ni la X (p. ej. guardando). */
  dismissible?: boolean;
  /** `alertdialog` para confirmaciones destructivas. */
  role?: 'dialog' | 'alertdialog';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Diálogo accesible sin desenfoque: foco atrapado, Escape, devolución del foco y bloqueo del
 * scroll de fondo. En móvil se acopla abajo como hoja. Si el contenido es alto se desplaza el
 * propio fondo (no hay scroller anidado).
 */
export function Dialog({
  title, description, onClose, dismissible = true, role = 'dialog', size = 'md', icon, children,
}: DialogProps) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const dismissRef = useRef(dismissible);
  closeRef.current = onClose;
  dismissRef.current = dismissible;

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    if (panel) {
      const preferred = panel.querySelector<HTMLElement>('[data-autofocus]');
      (preferred ?? panel.querySelector<HTMLElement>(FOCUSABLE) ?? panel).focus();
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
      previous?.focus();
    };
  }, []);

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      if (dismissRef.current) closeRef.current();
      return;
    }
    if (e.key !== 'Tab' || !panelRef.current) return;
    const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) { e.preventDefault(); return; }
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  return (
    <div
      className="cal-backdrop"
      onMouseDown={(e) => { if (e.target === e.currentTarget && dismissible) onClose(); }}
    >
      <div
        ref={panelRef}
        className={`cal-dialog cal-dialog--${size}`}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        onKeyDown={onKeyDown}
      >
        <header className="cal-dialog-head">
          {icon && <span className="cal-dialog-icon" aria-hidden="true">{icon}</span>}
          <div className="cal-dialog-titles">
            <h2 id={titleId} className="cal-dialog-title">{title}</h2>
            {description && <p id={descId} className="cal-dialog-desc">{description}</p>}
          </div>
          <button
            type="button" className="ghost cal-dialog-x" aria-label="Cerrar" disabled={!dismissible}
            onClick={onClose}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
