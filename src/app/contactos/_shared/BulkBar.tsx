import React from 'react';
import { X } from 'lucide-react';

interface BulkBarProps {
  count: number;
  noun: { one: string; many: string };
  onClear: () => void;
  children: React.ReactNode;
}

/** Barra de acciones sobre la selección múltiple (el recuento se anuncia a lectores de pantalla). */
export function BulkBar({ count, noun, onClear, children }: BulkBarProps) {
  if (count === 0) return null;
  return (
    <section className="crm-bulk" aria-label="Acciones sobre la selección">
      <p className="crm-bulk-count" role="status">
        <strong>{count}</strong> {count === 1 ? noun.one : noun.many}
      </p>
      <div className="crm-bulk-actions">{children}</div>
      <button type="button" className="ghost btn-sm crm-bulk-clear" onClick={onClear}>
        <X size={12} aria-hidden="true" /> Quitar selección
      </button>
    </section>
  );
}
