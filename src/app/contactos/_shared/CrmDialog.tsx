'use client';

import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

interface CrmDialogProps {
  title: string;
  description?: string;
  onClose: () => void;
  /** Mientras es false no se cierra con Escape, clic fuera ni la X (p. ej. guardando). */
  dismissible?: boolean;
  role?: 'dialog' | 'alertdialog';
  size?: 'sm' | 'md' | 'lg';
  /** `drawer` abre un panel lateral (en móvil, hoja inferior). */
  variant?: 'modal' | 'drawer';
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Diálogo accesible sin desenfoque: foco atrapado, Escape, devolución del foco y bloqueo
 * del scroll de fondo. El fondo es el único scroller si el contenido es alto.
 */
export function CrmDialog({
  title, description, onClose, dismissible = true, role = 'dialog', size = 'md', variant = 'modal', icon, children,
}: CrmDialogProps) {
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
      className={`crm-backdrop crm-backdrop--${variant}`}
      onMouseDown={(e) => { if (e.target === e.currentTarget && dismissible) onClose(); }}
    >
      <div
        ref={panelRef}
        className={`crm-dialog crm-dialog--${variant === 'drawer' ? 'drawer' : size}`}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        onKeyDown={onKeyDown}
      >
        <header className="crm-dialog-head">
          {icon && <span className="crm-dialog-icon" aria-hidden="true">{icon}</span>}
          <div className="crm-dialog-titles">
            <h2 id={titleId} className="crm-dialog-title">{title}</h2>
            {description && <p id={descId} className="crm-dialog-desc">{description}</p>}
          </div>
          <button type="button" className="ghost crm-icon-btn" aria-label="Cerrar" disabled={!dismissible} onClick={onClose}>
            <X size={16} aria-hidden="true" />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
