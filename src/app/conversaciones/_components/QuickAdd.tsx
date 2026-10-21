'use client';

import React, { useId, useState } from 'react';
import { Plus } from 'lucide-react';

interface QuickAddProps {
  label: string;
  placeholder: string;
  maxLength: number;
  /** Devuelve true si se guardó (entonces se vacía el campo). */
  onAdd: (value: string) => Promise<boolean>;
}

/** Campo de una línea con botón «Añadir»; Enter también envía. */
export function QuickAdd({ label, placeholder, maxLength, onAdd }: QuickAddProps) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const inputId = useId();

  async function submit() {
    if (!value.trim() || busy) return;
    setBusy(true);
    const ok = await onAdd(value);
    setBusy(false);
    if (ok) setValue('');
  }

  return (
    <form
      className="cv-quickadd"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <label className="fx-sr-only" htmlFor={inputId}>{label}</label>
      <input
        id={inputId}
        placeholder={placeholder}
        value={value}
        maxLength={maxLength}
        readOnly={busy}
        onChange={(e) => setValue(e.target.value)}
      />
      <button type="submit" className="primary cv-icon-btn" aria-label={`Añadir: ${label.toLowerCase()}`} disabled={!value.trim() || busy}>
        <Plus size={15} aria-hidden="true" />
      </button>
    </form>
  );
}
