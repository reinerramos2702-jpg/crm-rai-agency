import React from 'react';
import { avatarTone, formatMoney, initials } from '../../contactos/_shared/crm-text';
import { formatDate } from '../../contactos/_shared/crm-time';
import type { CardFieldId, CardPrefs } from './card-prefs';
import { stageVars } from './css-vars';
import { STATUS_LABELS, type Opportunity } from './opportunity-model';
import { STAGES, isStageId, stageById, type StageId } from './stages';

interface OpportunityCardProps {
  opportunity: Opportunity;
  prefs: CardPrefs;
  selected?: boolean;
  /** Vista previa (panel de personalización): sin selección ni cambio de etapa. */
  preview?: boolean;
  onToggle?: (id: string) => void;
  onMove?: (id: string, stageId: StageId) => void;
}

type LineId = Exclude<CardFieldId, 'tags' | 'value'>;

const LINES: readonly { id: LineId; label: string }[] = [
  { id: 'owner', label: 'Propietario' },
  { id: 'business', label: 'Negocio' },
  { id: 'source', label: 'Fuente' },
  { id: 'closeDate', label: 'Cierre' },
];

function lineValue(o: Opportunity, id: LineId): string {
  switch (id) {
    case 'owner': return o.owner;
    case 'business': return o.business;
    case 'source': return o.source;
    default: return o.closeDate ? formatDate(`${o.closeDate}T12:00:00`) : '';
  }
}

/** Tarjeta de oportunidad: valor, avatar del propietario (o del contacto), etapa y datos según las preferencias. */
export function OpportunityCard({ opportunity: o, prefs, selected = false, preview = false, onToggle, onMove }: OpportunityCardProps) {
  const stage = stageById(o.stageId);
  const person = o.owner || o.contactName;
  const lines = LINES
    .map(({ id, label }) => ({ id, label, value: lineValue(o, id) }))
    .filter((l) => prefs.fields[l.id] && l.value);

  return (
    <article
      className={`pl-card${selected ? ' is-selected' : ''}`}
      style={stageVars(stage)}
      data-design={prefs.design}
    >
      <div className="pl-card-top">
        {!preview && onToggle && (
          <input type="checkbox" checked={selected} onChange={() => onToggle(o.id)} aria-label={`Seleccionar ${o.name}`} />
        )}
        <h4 className="pl-card-name">{o.name}</h4>
        <span className="crm-avatar pl-card-avatar" data-tone={avatarTone(person)} title={person} aria-label={`Responsable: ${person}`}>
          {initials(person)}
        </span>
      </div>
      <p className="pl-card-contact">{o.contactName}</p>
      {prefs.fields.value && <p className="pl-card-value">{formatMoney(o.value)}</p>}
      {lines.length > 0 && (
        <dl className="pl-card-lines">
          {lines.map((l) => (
            <div key={l.id}>
              {prefs.design !== 'unlabeled' && <dt>{l.label}:</dt>}
              <dd>{l.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {prefs.fields.tags && o.tags.length > 0 && (
        <div className="crm-cell-tags">{o.tags.map((t) => <span key={t} className="crm-tag">{t}</span>)}</div>
      )}
      <div className="pl-card-foot">
        {o.status !== 'open'
          ? <span className={`badge ${o.status === 'won' ? 'badge-success' : 'badge-muted'}`}>{STATUS_LABELS[o.status]}</span>
          : <span className="pl-stage-pill">{stage.probability}% probabilidad</span>}
        {!preview && onMove && (
          <label className="pl-move">
            <span className="fx-sr-only">Mover {o.name} a otra etapa</span>
            <select
              className="input"
              value={o.stageId}
              onChange={(e) => { if (isStageId(e.target.value)) onMove(o.id, e.target.value); }}
            >
              {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
        )}
      </div>
    </article>
  );
}
