'use client';

import React from 'react';
import { Download, FilterX, Loader2, RefreshCw } from 'lucide-react';
import type { RunFilters, RunRange, RunStatusFilter } from '@/lib/automation-runs';
import { pickOption } from '../guards';
import type { WorkflowT } from '../types';

const STATUS_CHIPS: { id: RunStatusFilter; label: string }[] = [
  { id: 'todos', label: 'Todas' },
  { id: 'success', label: 'Exitosas' },
  { id: 'error', label: 'Con error' },
  { id: 'skipped', label: 'Omitidas' },
  { id: 'pending', label: 'Pendientes' },
];

const RANGES: { id: RunRange; label: string }[] = [
  { id: 'todo', label: 'Todo el historial' },
  { id: 'hoy', label: 'Hoy' },
  { id: '7d', label: 'Últimos 7 días' },
  { id: '30d', label: 'Últimos 30 días' },
];

interface ActivityFiltersProps {
  filters: RunFilters;
  onChange: (patch: Partial<RunFilters>) => void;
  workflows: WorkflowT[];
  counts: Record<string, number> | undefined;
  syncing: boolean;
  exporting: boolean;
  filtering: boolean;
  onClear: () => void;
  onRefresh: () => void;
  onExport: () => void;
}

export function ActivityFilters({ filters, onChange, workflows, counts, syncing, exporting, filtering, onClear, onRefresh, onExport }: ActivityFiltersProps) {
  const total = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : null;
  return (
    <div className="ac-filters">
      <div className="au-chips" role="group" aria-label="Filtrar por estado">
        {STATUS_CHIPS.map((chip) => {
          const n = chip.id === 'todos' ? total : counts ? counts[chip.id] ?? 0 : null;
          return (
            <button key={chip.id} type="button" className="au-chip" aria-pressed={filters.status === chip.id} onClick={() => onChange({ status: chip.id })}>
              {chip.label} {n !== null && <span className="au-chip-n">{n}</span>}
            </button>
          );
        })}
      </div>
      <div className="ac-selects">
        <label className="au-field">
          <span>Flujo</span>
          <select className="au-select ac-select-flow" value={filters.workflowId} onChange={(e) => onChange({ workflowId: e.target.value })}>
            <option value="">Todos los flujos</option>
            {workflows.filter((w) => !w.id.startsWith('tmp-')).map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </label>
        <label className="au-field">
          <span>Periodo</span>
          <select className="au-select" value={filters.range} onChange={(e) => {
              const range = pickOption(RANGES.map((r) => r.id), e.target.value);
              if (range) onChange({ range });
            }}>
            {RANGES.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
        </label>
        {filtering && (
          <button type="button" className="au-btn au-btn--ghost" onClick={onClear}>
            <FilterX size={14} aria-hidden="true" /> Limpiar filtros
          </button>
        )}
        <button type="button" className="au-btn au-btn--ghost au-btn--icon" onClick={onRefresh} aria-label="Actualizar actividad" title="Actualizar" disabled={syncing}>
          <RefreshCw size={15} className={syncing ? 'au-spin' : undefined} />
        </button>
        <button type="button" className="au-btn au-btn--soft" onClick={onExport} disabled={exporting} title="Descarga hasta 500 ejecuciones con los filtros actuales">
          {exporting ? <Loader2 size={14} className="au-spin" /> : <Download size={14} />} Exportar CSV
        </button>
      </div>
    </div>
  );
}
