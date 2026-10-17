import React from 'react';

interface FieldProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  hint?: string;
  wide?: boolean;
  children: React.ReactNode;
}

/** Etiqueta + control + mensaje (el error y la ayuda se enlazan con `aria-describedby`: `${htmlFor}-msg`). */
export function Field({ label, htmlFor, required, error, hint, wide, children }: FieldProps) {
  return (
    <div className={`crm-field${wide ? ' crm-field--wide' : ''}${error ? ' has-error' : ''}`}>
      <label htmlFor={htmlFor} className="label">
        {label}{required && <span className="crm-req" aria-hidden="true"> *</span>}
      </label>
      {children}
      <span id={`${htmlFor}-msg`} className="crm-msg" role={error ? 'alert' : undefined}>
        {error ? <span className="crm-error">{error}</span> : hint ? <span className="crm-hint">{hint}</span> : null}
      </span>
    </div>
  );
}
