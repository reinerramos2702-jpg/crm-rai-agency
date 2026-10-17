'use client';

import React, { useEffect, useRef } from 'react';
import { SearchX } from 'lucide-react';
import { selectionState } from '../_shared/crm-selection';
import { useTimeZone } from '../_shared/use-time-zone';
import { ContactRow } from './ContactRow';
import type { Contact } from './contact-model';

interface ContactsTableProps {
  rows: readonly Contact[];
  selected: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onToggleAll: (checked: boolean) => void;
  onResetFilters: () => void;
  /** Contenido cuando no hay ningún contacto (vista previa); si falta, se muestra «Ningún contacto coincide». */
  emptyNode?: React.ReactNode;
}

/** Cabecera de columna con la zona horaria legible («UTC−4») y su nombre IANA como ayuda. */
function ZoneHeader({ label, zone, name }: { label: string; zone: string; name: string }) {
  return (
    <th scope="col" className="col-date">
      {label}{' '}
      {zone && <abbr className="crm-zone" title={`Zona horaria: ${name || zone}`}>({zone})</abbr>}
    </th>
  );
}

/** Tabla a todo el ancho: columnas fluidas, cabecera fija y scroll solo dentro de la tabla. */
export function ContactsTable({ rows, selected, onToggle, onToggleAll, onResetFilters, emptyNode }: ContactsTableProps) {
  const tz = useTimeZone();
  const ids = rows.map((r) => r.id);
  const state = selectionState(selected, ids);
  const allRef = useRef<HTMLInputElement>(null);
  const mobileAllRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    for (const ref of [allRef, mobileAllRef]) {
      if (ref.current) ref.current.indeterminate = state === 'some';
    }
  }, [state]);

  const allChecked = state === 'all';
  return (
    <div className="crm-card">
      {rows.length > 0 && (
        <label className="crm-select-all">
          <input ref={mobileAllRef} type="checkbox" checked={allChecked} onChange={(e) => onToggleAll(e.target.checked)} />
          Seleccionar los {rows.length} de esta página
        </label>
      )}
      <div className="crm-tablewrap">
        <table className="crm-table">
          <caption className="fx-sr-only">Lista de contactos</caption>
          <thead>
            <tr>
              <th scope="col" className="col-check">
                <input
                  ref={allRef}
                  type="checkbox"
                  checked={allChecked}
                  onChange={(e) => onToggleAll(e.target.checked)}
                  aria-label="Seleccionar todos los contactos de esta página"
                />
              </th>
              <th scope="col" className="col-name">Nombre</th>
              <th scope="col">Teléfono</th>
              <th scope="col">Correo</th>
              <th scope="col">Empresa</th>
              <ZoneHeader label="Creado" zone={tz.label} name={tz.zone} />
              <ZoneHeader label="Última actividad" zone={tz.label} name={tz.zone} />
              <th scope="col" className="col-tags">Etiquetas</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <ContactRow key={c.id} contact={c} selected={selected.has(c.id)} onToggle={onToggle} />
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && emptyNode}
      {rows.length === 0 && !emptyNode && (
        <div className="crm-noresults">
          <SearchX size={22} aria-hidden="true" />
          <strong>Ningún contacto coincide</strong>
          <span>Prueba con otra búsqueda o quita los filtros.</span>
          <button type="button" className="secondary btn-sm" onClick={onResetFilters}>Limpiar búsqueda y filtros</button>
        </div>
      )}
    </div>
  );
}
