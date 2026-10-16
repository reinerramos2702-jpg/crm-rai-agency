'use client';

import React from 'react';
import { Search, X, FilterX, Wallet, Clock, CheckCircle2, Eye, XCircle, RefreshCw, Ban, type LucideIcon } from 'lucide-react';
import {
  DATE_PRESETS, PAYMENT_METHODS, activePreset, rangeForPreset,
  type DatePreset, type PaymentFilters,
} from '@/lib/payments-view';

const STATUS_TABS: Array<{ id: string; label: string; icon: LucideIcon }> = [
  { id: '', label: 'Todos', icon: Wallet },
  { id: 'pending', label: 'Pendientes', icon: Clock },
  { id: 'paid', label: 'Pagados', icon: CheckCircle2 },
  { id: 'under_review', label: 'En revisión', icon: Eye },
  { id: 'failed', label: 'Fallidos', icon: XCircle },
  { id: 'refunded', label: 'Reembolsados', icon: RefreshCw },
  { id: 'cancelled', label: 'Cancelados', icon: Ban },
];

interface Props {
  filters: PaymentFilters;
  counts: Record<string, number>;
  totalAll: number;
  active: boolean;
  now: number;
  onChange: (patch: Partial<PaymentFilters>) => void;
  onClear: () => void;
}

export function PaymentsFilters({ filters, counts, totalAll, active, now, onChange, onClear }: Props) {
  const preset = activePreset(filters, now);

  function togglePreset(id: DatePreset) {
    onChange(preset === id ? { from: '', to: '' } : rangeForPreset(id, Date.now()));
  }

  return (
    <div className="pg-filters">
      <div className="pg-tabs" role="tablist" aria-label="Filtrar por estado">
        {STATUS_TABS.map(({ id, label, icon: Icon }) => {
          const selected = filters.status === id;
          const count = id ? counts[id] ?? 0 : totalAll;
          return (
            <button
              key={id || 'all'} type="button" role="tab" aria-selected={selected}
              className={`pg-tab${selected ? ' is-active' : ''} ghost`}
              onClick={() => onChange({ status: id })}
            >
              <Icon size={14} aria-hidden="true" />
              {label}
              <span className="pg-tab-count">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="pg-bar">
        <div className="pg-search">
          <Search size={15} aria-hidden="true" className="pg-search-icon" />
          <input
            type="search" className="input" value={filters.query} aria-label="Buscar pagos"
            placeholder="Buscar por referencia, huésped, reserva o nota…"
            onChange={(e) => onChange({ query: e.target.value })}
          />
          {filters.query && (
            <button type="button" className="pg-search-clear ghost" aria-label="Borrar búsqueda" onClick={() => onChange({ query: '' })}>
              <X size={14} />
            </button>
          )}
        </div>

        <select
          className="pg-method-select" aria-label="Filtrar por método de pago"
          value={filters.method} onChange={(e) => onChange({ method: e.target.value })}
        >
          <option value="">Todos los métodos</option>
          {PAYMENT_METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>

        <div className="pg-dates">
          <label className="pg-date">
            <span>Desde</span>
            <input type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => onChange({ from: e.target.value })} />
          </label>
          <label className="pg-date">
            <span>Hasta</span>
            <input type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => onChange({ to: e.target.value })} />
          </label>
        </div>
      </div>

      <div className="pg-chips">
        {DATE_PRESETS.map(({ id, label }) => (
          <button
            key={id} type="button" aria-pressed={preset === id}
            className={`pg-chip${preset === id ? ' is-active' : ''} ghost`}
            onClick={() => togglePreset(id)}
          >
            {label}
          </button>
        ))}
        {active && (
          <button type="button" className="pg-clear ghost" onClick={onClear}>
            <FilterX size={14} aria-hidden="true" /> Limpiar filtros
          </button>
        )}
      </div>
    </div>
  );
}
