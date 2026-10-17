'use client';

import React, { useEffect, useRef } from 'react';
import { SearchX } from 'lucide-react';
import { selectionState } from '../../contactos/_shared/crm-selection';
import { formatMoney } from '../../contactos/_shared/crm-text';
import { formatDate } from '../../contactos/_shared/crm-time';
import { stageVars } from './css-vars';
import { STATUS_LABELS, type Opportunity } from './opportunity-model';
import { stageById } from './stages';

interface PipelineListProps {
  rows: readonly Opportunity[];
  selected: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onToggleAll: (checked: boolean) => void;
  onResetFilters: () => void;
}

const dash = <span className="crm-dash" aria-label="Sin dato">—</span>;

/** Vista de lista (tabla): misma estructura que Contactos, con cabecera fija y tarjetas en móvil. */
export function PipelineList({ rows, selected, onToggle, onToggleAll, onResetFilters }: PipelineListProps) {
  const state = selectionState(selected, rows.map((r) => r.id));
  const allRef = useRef<HTMLInputElement>(null);
  const mobileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    for (const ref of [allRef, mobileRef]) if (ref.current) ref.current.indeterminate = state === 'some';
  }, [state]);

  return (
    <div className="crm-card">
      <label className="crm-select-all">
        <input ref={mobileRef} type="checkbox" checked={state === 'all'} onChange={(e) => onToggleAll(e.target.checked)} />
        Seleccionar las {rows.length} oportunidades
      </label>
      <div className="crm-tablewrap">
        <table className="crm-table">
          <caption className="fx-sr-only">Lista de oportunidades</caption>
          <thead>
            <tr>
              <th scope="col" className="col-check">
                <input ref={allRef} type="checkbox" checked={state === 'all'} onChange={(e) => onToggleAll(e.target.checked)} aria-label="Seleccionar todas las oportunidades" />
              </th>
              <th scope="col" className="col-name">Nombre</th>
              <th scope="col">Etapa</th>
              <th scope="col">Contacto</th>
              <th scope="col">Valor</th>
              <th scope="col">Propietario</th>
              <th scope="col" className="col-date">Fecha de cierre</th>
              <th scope="col">Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => {
              const stage = stageById(o.stageId);
              const isSel = selected.has(o.id);
              return (
                <tr key={o.id} className={`crm-row${isSel ? ' is-selected' : ''}`}>
                  <td className="col-check"><input type="checkbox" checked={isSel} onChange={() => onToggle(o.id)} aria-label={`Seleccionar ${o.name}`} /></td>
                  <td className="col-name"><strong>{o.name}</strong></td>
                  <td data-label="Etapa"><span className="pl-stage-tag" style={stageVars(stage)}><span className="pl-dot" aria-hidden="true" />{stage.label}</span></td>
                  <td data-label="Contacto">{o.contactName}</td>
                  <td data-label="Valor">{formatMoney(o.value)}</td>
                  <td data-label="Propietario" className={o.owner ? undefined : 'is-empty'}>{o.owner || dash}</td>
                  <td data-label="Cierre" className={o.closeDate ? 'col-date' : 'col-date is-empty'}>{o.closeDate ? formatDate(`${o.closeDate}T12:00:00`) : dash}</td>
                  <td data-label="Estado">{STATUS_LABELS[o.status]}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && (
        <div className="crm-noresults">
          <SearchX size={22} aria-hidden="true" />
          <strong>Ninguna oportunidad coincide</strong>
          <span>Prueba con otra búsqueda o quita los filtros.</span>
          <button type="button" className="secondary btn-sm" onClick={onResetFilters}>Limpiar búsqueda y filtros</button>
        </div>
      )}
    </div>
  );
}
