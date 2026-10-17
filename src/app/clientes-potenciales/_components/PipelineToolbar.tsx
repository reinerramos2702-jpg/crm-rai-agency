'use client';

import React from 'react';
import { ArrowUpDown, Settings, SlidersHorizontal } from 'lucide-react';
import { CrmPopover } from '../../contactos/_shared/CrmPopover';
import { SearchField } from '../../contactos/_shared/SearchField';
import {
  SORT_LABELS, STATUS_IDS, STATUS_LABELS, isStatus, type OpportunityFilters, type OpportunitySort,
} from './opportunity-model';

interface PipelineToolbarProps {
  filters: OpportunityFilters;
  onFilters: (next: OpportunityFilters) => void;
  sort: OpportunitySort;
  onSort: (key: OpportunitySort) => void;
  onManageFields: () => void;
}

const SORT_KEYS: readonly OpportunitySort[] = ['recent', 'value', 'close', 'name'];

export function PipelineToolbar({ filters, onFilters, sort, onSort, onManageFields }: PipelineToolbarProps) {
  return (
    <div className="crm-toolbar">
      <div className="crm-toolbar-group">
        <CrmPopover label="Filtros avanzados" icon={<SlidersHorizontal size={14} aria-hidden="true" />} badge={filters.status ? 1 : 0}>
          {() => (
            <div className="crm-field">
              <label className="label" htmlFor="pl-f-status">Estado</label>
              <select
                id="pl-f-status"
                className="input"
                value={filters.status}
                onChange={(e) => onFilters({ ...filters, status: isStatus(e.target.value) ? e.target.value : '' })}
              >
                <option value="">Todos</option>
                {STATUS_IDS.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
          )}
        </CrmPopover>
        <CrmPopover label="Ordenar" icon={<ArrowUpDown size={14} aria-hidden="true" />}>
          {(close) => (
            <div className="crm-menu" role="radiogroup" aria-label="Ordenar oportunidades por">
              {SORT_KEYS.map((key) => (
                <button key={key} type="button" role="radio" aria-checked={sort === key} className="crm-menu-item" onClick={() => { onSort(key); close(); }}>
                  {SORT_LABELS[key]}
                </button>
              ))}
            </div>
          )}
        </CrmPopover>
      </div>
      <div className="crm-toolbar-group">
        <SearchField
          value={filters.q}
          onChange={(q) => onFilters({ ...filters, q })}
          placeholder="Buscar clientes potenciales"
          label="Buscar clientes potenciales por nombre, contacto, negocio o etiqueta"
        />
        <button type="button" className="secondary btn-sm" onClick={onManageFields}>
          <Settings size={14} aria-hidden="true" /> Gestionar campos
        </button>
      </div>
    </div>
  );
}
