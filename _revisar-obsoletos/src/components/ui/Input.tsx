'use client';

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

/**
 * Input con estilo RAI: fondo card, borde gold en focus.
 */
export function Input({ label, error, hint, className = '', ...props }: InputProps) {
  return (
    <div className="form-group">
      {label && <label>{label}</label>}
      <input className={className} {...props} />
      {error && <p style={{ color: 'var(--rai-error)', fontSize: 12, marginTop: 4 }}>{error}</p>}
      {hint && !error && <p style={{ color: 'var(--rai-muted)', fontSize: 12, marginTop: 4 }}>{hint}</p>}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Textarea({ label, error, hint, className = '', ...props }: TextareaProps) {
  return (
    <div className="form-group">
      {label && <label>{label}</label>}
      <textarea className={className} {...props} />
      {error && <p style={{ color: 'var(--rai-error)', fontSize: 12, marginTop: 4 }}>{error}</p>}
      {hint && !error && <p style={{ color: 'var(--rai-muted)', fontSize: 12, marginTop: 4 }}>{hint}</p>}
    </div>
  );
}
