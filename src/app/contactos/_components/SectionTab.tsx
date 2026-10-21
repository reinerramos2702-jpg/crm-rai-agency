'use client';

import React from 'react';
import { Plus, Upload } from 'lucide-react';
import { CrmTabs, panelDomId, tabDomId } from '../_shared/CrmTabs';
import { PreviewEmpty } from '../_shared/PreviewEmpty';
import { notifySoon } from '../_shared/crm-notify';
import { useTimeZone } from '../_shared/use-time-zone';
import type { SectionConfig } from './section-configs';

function GhostRow() {
  return <div className="crm-ghost-row"><i className="crm-ghost-dot" /><i /><i /><i /><i /></div>;
}

/**
 * Secciones sin servicio propio todavía (Acciones en lote, Tareas, Empresas): conservan su estructura
 * y columnas, y los botones avisan «próximamente» en lugar de fingir que guardan algo.
 */
export function SectionTab({ config }: { config: SectionConfig }) {
  const tz = useTimeZone();
  const { id, title, description, noun, importLabel, addLabel, subTabs, addListLabel, filterButtons, columns } = config;
  const tabs = subTabs.map((label) => ({ id: label, label }));
  const firstTab = tabs[0]?.id ?? '';

  return (
    <>
      <div className="crm-head">
        <div className="crm-head-main">
          <div>
            <h2 className="crm-head-title">{title}</h2>
            {description && <p className="crm-head-sub">{description}</p>}
          </div>
          {!description && <span className="badge badge-gold">0 {noun.many}</span>}
        </div>
        <div className="crm-actions">
          {importLabel && (
            <button type="button" className="secondary" onClick={() => notifySoon(importLabel)}>
              <Upload size={14} aria-hidden="true" /> {importLabel}
            </button>
          )}
          {addLabel && (
            <button type="button" className="primary" onClick={() => notifySoon(addLabel)}>
              <Plus size={14} aria-hidden="true" /> {addLabel}
            </button>
          )}
        </div>
      </div>

      {tabs.length > 0 && (
        <CrmTabs
          tabs={tabs}
          value={firstTab}
          onChange={() => undefined}
          idPrefix={`sec-${id}`}
          ariaLabel={`Vistas de ${title.toLowerCase()}`}
          trailing={addListLabel ? (
            <button type="button" className="ghost btn-sm" onClick={() => notifySoon(addListLabel)}>
              <Plus size={14} aria-hidden="true" /> {addListLabel}
            </button>
          ) : undefined}
        />
      )}

      {config.inlineFilters && (
        <div className="crm-toolbar" role="group" aria-label="Filtros de acciones en lote">
          <div className="crm-toolbar-group">
            <label className="fx-sr-only" htmlFor="lote-desde">Desde</label>
            <input id="lote-desde" type="date" className="input crm-filter-input" disabled />
            <label className="fx-sr-only" htmlFor="lote-hasta">Hasta</label>
            <input id="lote-hasta" type="date" className="input crm-filter-input" disabled />
            {['Todos los estados', 'Todas las acciones', 'Todos los usuarios'].map((label) => (
              <select key={label} className="input crm-filter-input" aria-label={label} disabled><option>{label}</option></select>
            ))}
          </div>
        </div>
      )}

      {filterButtons.length > 0 && (
        <div className="crm-toolbar">
          <div className="crm-toolbar-group">
            {filterButtons.map((label) => (
              <button key={label} type="button" className="secondary btn-sm" onClick={() => notifySoon(label.split(':')[0])}>{label}</button>
            ))}
          </div>
        </div>
      )}

      <div
        role="tabpanel"
        id={panelDomId(`sec-${id}`, firstTab)}
        aria-labelledby={tabs.length > 0 ? tabDomId(`sec-${id}`, firstTab) : undefined}
        aria-label={tabs.length > 0 ? undefined : title}
        className="crm-panel"
      >
        <div className="crm-card">
          <div className="crm-tablewrap">
            <table className={`crm-table${columns.length > 8 ? ' crm-table--wide' : ''}`}>
              <caption className="fx-sr-only">{title}</caption>
              <thead>
                <tr>
                  {config.selectable && <th scope="col" className="col-check"><input type="checkbox" disabled aria-label="Seleccionar todo" /></th>}
                  {columns.map((c) => (
                    <th key={c.label} scope="col" className={c.zone ? 'col-date' : undefined}>
                      {c.label}{c.zone && tz.label ? ` (${tz.label})` : ''}
                    </th>
                  ))}
                </tr>
              </thead>
            </table>
          </div>
          <PreviewEmpty
            bare
            title={config.empty.title}
            text={config.empty.text}
            ghosts={<><GhostRow /><GhostRow /></>}
            actions={addLabel ? (
              <button type="button" className="primary" onClick={() => notifySoon(addLabel)}>
                <Plus size={14} aria-hidden="true" /> {addLabel}
              </button>
            ) : null}
          />
        </div>
      </div>
    </>
  );
}
