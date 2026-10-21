'use client';

import React, { useRef } from 'react';
import { useDialog } from './use-dialog';

interface DialogShellProps {
  /** Id del título (h2) dentro de `children`, para `aria-labelledby`. */
  titleId: string;
  onClose: () => void;
  size?: 'md' | 'sm';
  children: React.ReactNode;
}

/** Ventana modal accesible: fondo que cierra al pulsarlo, foco atrapado, Esc y foco devuelto al cerrar. */
export function DialogShell({ titleId, onClose, size = 'md', children }: DialogShellProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  useDialog(rootRef, onClose);
  return (
    <div className="mm-dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className={`mm-dialog${size === 'sm' ? ' is-sm' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={rootRef}
        tabIndex={-1}
      >
        {children}
      </div>
    </div>
  );
}
