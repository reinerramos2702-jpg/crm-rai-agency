'use client';

import React from 'react';
import { ArrowUpDown, Settings, SlidersHorizontal } from 'lucide-react';
import { CrmPopover } from '../_shared/CrmPopover';
import { SearchField } from '../_shared/SearchField';
import { notifySoon } from '../_shared/crm-notify';
import {
  SORT_LABELS, activeFilterCount, sourceLabel, type ContactFilters, type SortKey,
} from './contact-model';

interface ContactsToolbarProps {
  filters: ContactFilters;
  onFilters: (next: ContactFilters) => void;
  sort: SortKey;
  onSort: (key: SortKey) => void;
  sources: readonly string[];
  tags: readonly string[];
}

const SORT_KEYS: readonly SortKey[] = ['recent', 'activity', 'created', 'name'];

export function ContactsToolbar({ filters, onFilters, sort, onSort, sources, tags }: ContactsToolbarProps) {
  return (
    <div className="crm-toolbar">
      <div className="crm-toolbar-group">
        <CrmPopover label="Filtros avanzados" icon={<SlidersHorizontal size={14} aria-hidden="true" />} badge={activeFilterCount(filters)}>
          {() => (
            <>
              <div className="crm-field">
                <label className="label" htmlFor="crm-f-source">Fuente</label>
                <select id="crm-f-source" className="input" value={filters.source} onChange={(e) => onFilters({ ...filters, source: e.target.value })}>
                  <option value="">Todas</option>
                  {sources.map((s) => <option key={s} value={s}>{sourceLabel(s)}</option>)}
                </select>
              </div>
              <div className="crm-field">
                <label className="label" htmlFor="crm-f-tag">Etiqueta</label>
                <select id="crm-f-tag" className="input" value={filters.tag} onChange={(e) => onFilters({ ...filters, tag: e.target.value })} disabled={tags.length === 0}>
                  <option value="">{tags.length === 0 ? 'Aún no hay etiquetas' : 'Todas'}</option>
                  {tags.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </>
          )}
        </CrmPopover>
        <CrmPopover label="Ordenar" icon={<ArrowUpDown size={14} aria-hidden="true" />}>
          {(close) => (
            <div className="crm-menu" role="radiogroup" aria-label="Ordenar contactos por">
              {SORT_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={sort === key}
                  className="crm-menu-item"
                  onClick={() => { onSort(key); close(); }}
                >
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
          placeholder="Buscar contactos"
          label="Buscar contactos por nombre, correo, teléfono o etiqueta"
        />
        <button type="button" className="secondary btn-sm" onClick={() => notifySoon('Administrar campos')}>
          <Settings size={14} aria-hidden="true" /> Administrar campos
        </button>
      </div>
    </div>
  );
}
