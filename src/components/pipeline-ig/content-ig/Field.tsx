'use client';

import React, { useId } from 'react';

interface FieldProps {
  label: string;
  hint?: string;
  className?: string;
  children: (props: { id: string; describedBy: string | undefined }) => React.ReactNode;
}

/** Campo con etiqueta enlazada al control (`htmlFor`) y pista asociada por `aria-describedby`. */
export function Field({ label, hint, className, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className={`ig-field${className ? ` ${className}` : ''}`}>
      <label className="muted ig-label" htmlFor={id}>{label}</label>
      {children({ id, describedBy: hintId })}
      {hint && <small className="rai-hint" id={hintId}>{hint}</small>}
    </div>
  );
}
