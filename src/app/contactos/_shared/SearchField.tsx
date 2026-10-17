'use client';

import React, { useEffect, useId, useRef } from 'react';
import { Search, X } from 'lucide-react';

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** Nombre accesible del campo. */
  label: string;
  /** Activa el atajo «/» para enfocar el campo. */
  hotkey?: boolean;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/** Campo de búsqueda con atajo «/», «Esc» para limpiar y botón de borrado. */
export function SearchField({ value, onChange, placeholder, label, hotkey = true }: SearchFieldProps) {
  const ref = useRef<HTMLInputElement>(null);
  const id = useId();

  useEffect(() => {
    if (!hotkey) return undefined;
    function onKey(e: KeyboardEvent) {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || isTypingTarget(e.target)) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      e.preventDefault();
      ref.current?.focus();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [hotkey]);

  return (
    <div className="crm-search" role="search">
      <label htmlFor={id} className="fx-sr-only">{label}</label>
      <Search size={14} aria-hidden="true" />
      <input
        ref={ref}
        id={id}
        type="search"
        className="input"
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        aria-keyshortcuts={hotkey ? '/' : undefined}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Escape' && value) { e.stopPropagation(); onChange(''); } }}
      />
      {value ? (
        <button type="button" className="ghost crm-search-x" aria-label="Borrar búsqueda" onClick={() => { onChange(''); ref.current?.focus(); }}>
          <X size={12} aria-hidden="true" />
        </button>
      ) : hotkey ? (
        <kbd className="crm-kbd" aria-hidden="true">/</kbd>
      ) : null}
    </div>
  );
}
