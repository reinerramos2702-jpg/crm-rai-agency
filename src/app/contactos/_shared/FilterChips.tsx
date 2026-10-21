import React from 'react';
import { X } from 'lucide-react';

export interface FilterChip {
  key: string;
  label: string;
  onRemove: () => void;
}

/** Chips de filtros activos: cada uno se quita solo; «Limpiar todo» aparece desde dos. */
export function FilterChips({ chips, onClear }: { chips: readonly FilterChip[]; onClear: () => void }) {
  if (chips.length === 0) return null;
  return (
    <ul className="crm-chips" aria-label="Filtros activos">
      {chips.map((c) => (
        <li key={c.key} className="crm-chip">
          <span>{c.label}</span>
          <button type="button" className="ghost crm-chip-x" aria-label={`Quitar filtro: ${c.label}`} onClick={c.onRemove}>
            <X size={12} aria-hidden="true" />
          </button>
        </li>
      ))}
      {chips.length > 1 && (
        <li>
          <button type="button" className="ghost btn-sm crm-chip-clear" onClick={onClear}>Limpiar todo</button>
        </li>
      )}
    </ul>
  );
}
