'use client';

import React, { useId } from 'react';

interface BaseProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  /** Ocupa las dos columnas del formulario. */
  wide?: boolean;
}

interface TextProps extends BaseProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  type?: 'text' | 'email' | 'tel' | 'number';
  placeholder?: string;
  maxLength?: number;
  autoFocus?: boolean;
  autoComplete?: string;
  inputMode?: 'text' | 'numeric' | 'tel' | 'email';
  min?: number;
  rows?: number;
}

function describe(id: string, error?: string, hint?: string): string | undefined {
  const ids = [error ? `${id}-err` : null, hint ? `${id}-hint` : null].filter(Boolean);
  return ids.length ? ids.join(' ') : undefined;
}

/** Espacio fijo para ayuda/error: así aparecer un mensaje no desplaza los botones entre el pulsar y el soltar (se perdería el clic). */
function Messages({ id, error, hint }: { id: string; error?: string; hint?: string }) {
  return (
    <span className="st-msg">
      {hint && !error && <span id={`${id}-hint`} className="st-hint">{hint}</span>}
      {error && <span id={`${id}-err`} className="st-error" role="alert">{error}</span>}
    </span>
  );
}

/** Campo de texto con etiqueta enlazada, ayuda y error en línea. `rows` lo convierte en textarea. */
export function TextField({
  label, error, hint, required, wide, value, onChange, onBlur, type = 'text',
  placeholder, maxLength, autoFocus, autoComplete, inputMode, min, rows,
}: TextProps) {
  const id = useId();
  const common = {
    id,
    className: 'input',
    value,
    placeholder,
    maxLength,
    required,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describe(id, error, hint),
    'data-autofocus': autoFocus ? '' : undefined,
    onBlur,
  } as const;
  return (
    <div className={`st-field${wide ? ' st-field--wide' : ''}${error ? ' has-error' : ''}`}>
      <label htmlFor={id}>{label}{required && <span className="st-req" aria-hidden="true"> *</span>}</label>
      {rows ? (
        <textarea {...common} rows={rows} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input
          {...common} type={type} autoComplete={autoComplete} inputMode={inputMode} min={min}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      <Messages id={id} error={error} hint={hint} />
    </div>
  );
}

interface SelectProps extends BaseProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}

export function SelectField({ label, error, hint, required, wide, value, onChange, options }: SelectProps) {
  const id = useId();
  return (
    <div className={`st-field${wide ? ' st-field--wide' : ''}${error ? ' has-error' : ''}`}>
      <label htmlFor={id}>{label}{required && <span className="st-req" aria-hidden="true"> *</span>}</label>
      <select
        id={id} className="input" value={value} onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined} aria-describedby={describe(id, error, hint)}
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <Messages id={id} error={error} hint={hint} />
    </div>
  );
}

/** Lleva el foco al primer campo inválido tras un intento de envío fallido (espera a que React pinte los errores). */
export function focusFirstInvalid(form: HTMLFormElement | null): void {
  if (!form) return;
  window.setTimeout(() => {
    form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, 60);
}
