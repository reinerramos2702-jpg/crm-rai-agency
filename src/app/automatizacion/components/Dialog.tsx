'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import '../automation.css';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const CLOSE_MS = 160;

interface DialogProps {
  title: string;
  titleId: string;
  onClose: () => void;
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  footer?: (close: () => void) => React.ReactNode;
  children: React.ReactNode;
}

/** Diálogo accesible: foco atrapado, Esc, clic fuera, salida animada de 160 ms y el foco vuelve a quien lo abrió. */
export function Dialog({ title, titleId, onClose, size = 'md', icon, footer, children }: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [closing, setClosing] = useState(false);

  const close = useCallback(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      onClose();
      return;
    }
    setClosing(true);
    window.setTimeout(onClose, CLOSE_MS);
  }, [onClose]);

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const node = dialogRef.current;
    const first = node?.querySelector<HTMLElement>('[data-autofocus]') ?? node?.querySelector<HTMLElement>(FOCUSABLE) ?? node;
    first?.focus();
    return () => opener?.focus?.();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === firstItem || active === dialogRef.current)) {
        e.preventDefault();
        lastItem.focus();
      } else if (!e.shiftKey && active === lastItem) {
        e.preventDefault();
        firstItem.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [close]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={`au-dialog-backdrop${closing ? ' is-closing' : ''}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={dialogRef}
        className={`au-dialog${size === 'sm' ? ' au-dialog--sm' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="au-dialog-head">
          {icon}
          <h2 id={titleId} className="au-dialog-title">{title}</h2>
          <button type="button" className="au-btn au-btn--ghost au-btn--icon au-btn--sm" onClick={close} aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>
        <div className="au-dialog-body">{children}</div>
        {footer && <div className="au-dialog-foot">{footer(close)}</div>}
      </div>
    </div>,
    document.body
  );
}
