'use client';

import React, { useId, useState } from 'react';
import type { LucideIcon } from 'lucide-react';

interface DisabledActionProps {
  label: string;
  /** Motivo honesto por el que la acción aún no existe; se anuncia como descripción y se muestra en un tooltip. */
  reason: string;
  icon?: LucideIcon;
  variant?: 'primary' | 'secondary';
  /** Alineación del tooltip respecto al botón. */
  align?: 'start' | 'end';
  small?: boolean;
}

/**
 * Botón deshabilitado pero enfocable (aria-disabled): nunca ejecuta nada y explica por qué.
 * El motivo aparece al pasar el cursor, al enfocar con teclado o al tocar (táctil).
 */
export function DisabledAction({ label, reason, icon: Icon, variant = 'secondary', align = 'start', small = false }: DisabledActionProps) {
  const tipId = useId();
  const [open, setOpen] = useState(false);

  return (
    <span
      className={`mk-da${open ? ' is-open' : ''}`}
      data-align={align}
      onKeyDown={(e) => {
        if (e.key === 'Escape') setOpen(false);
      }}
    >
      <button
        type="button"
        className={`${variant} mk-da-btn${small ? ' btn-sm' : ''}`}
        aria-disabled="true"
        aria-describedby={tipId}
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
      >
        {Icon && <Icon size={small ? 14 : 16} aria-hidden="true" />}
        {label}
      </button>
      <span role="tooltip" id={tipId} className="mk-da-tip">
        {reason}
      </span>
    </span>
  );
}
