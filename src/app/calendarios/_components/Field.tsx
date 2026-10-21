'use client';

import React, { useId } from 'react';

export interface FieldControlProps {
  id: string;
  'aria-invalid': true | undefined;
  'aria-describedby': string | undefined;
}

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  /** Ocupa todas las columnas del formulario. */
  wide?: boolean;
  children: (control: FieldControlProps) => React.ReactNode;
}

/**
 * Campo con etiqueta enlazada, ayuda y error en línea. El espacio del mensaje es fijo
 * para que un error no desplace los botones entre el pulsar y el soltar.
 */
export function Field({ label, error, hint, required, wide, children }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errId = `${id}-err`;
  const describedBy = [error ? errId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`cal-field${wide ? ' cal-field--wide' : ''}${error ? ' has-error' : ''}`}>
      <label htmlFor={id}>{label}{required && <span className="cal-req" aria-hidden="true"> *</span>}</label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      <span className="cal-msg">
        {error
          ? <span id={errId} className="cal-error" role="alert">{error}</span>
          : hint && <span id={hintId} className="cal-hint">{hint}</span>}
      </span>
    </div>
  );
}

/** Lleva el foco al primer control inválido de un formulario. */
export function focusFirstInvalid(root: HTMLElement | null): void {
  const el = root?.querySelector<HTMLElement>('[aria-invalid="true"],[data-invalid="true"]');
  el?.focus();
}
