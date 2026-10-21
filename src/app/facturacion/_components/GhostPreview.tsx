import React from 'react';
import type { GhostChip, PreviewSpec } from './billing-tabs';

function Chip({ chip }: { chip: GhostChip }) {
  return <span className={`badge badge-${chip.tone} bl-chip`}>{chip.label}</span>;
}

function Chips({ chips }: { chips: readonly GhostChip[] }) {
  return (
    <div className="bl-chips">
      {chips.map((c) => (
        <Chip key={c.label} chip={c} />
      ))}
    </div>
  );
}

/** Documento fantasma: cabecera, líneas y totales (solo barras; no hay cifras inventadas). */
function GhostDocument({ docLabel, chips }: { docLabel: string; chips: readonly GhostChip[] }) {
  return (
    <div className="bl-ghost bl-doc">
      <div className="bl-doc-head">
        <strong>{docLabel}</strong>
        <i className="bl-bar" style={{ width: 70 }} />
        <span className="bl-spacer" />
        <Chip chip={chips[0]} />
      </div>
      <div className="bl-doc-party">
        <i className="bl-bar" style={{ width: '40%' }} />
        <i className="bl-bar bl-bar--thin" style={{ width: '28%' }} />
      </div>
      <div className="bl-doc-lines">
        {[0, 1, 2].map((n) => (
          <div key={n} className="bl-doc-line">
            <i className="bl-bar" style={{ width: `${70 - n * 12}%` }} />
            <i className="bl-bar bl-bar--short" />
          </div>
        ))}
      </div>
      <div className="bl-doc-totals">
        {['Subtotal', 'Impuestos', 'Total'].map((t) => (
          <div key={t} className={`bl-doc-total${t === 'Total' ? ' is-main' : ''}`}>
            <span>{t}</span>
            <i className="bl-bar bl-bar--short" />
          </div>
        ))}
      </div>
      <Chips chips={chips} />
    </div>
  );
}

function GhostTable({ columns, chips }: { columns: readonly string[]; chips: readonly GhostChip[] }) {
  return (
    <div className="bl-ghost bl-table">
      <div className="bl-table-row bl-table-head" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
        {columns.map((c) => (
          <span key={c}>{c}</span>
        ))}
      </div>
      {chips.map((chip, r) => (
        <div key={chip.label} className="bl-table-row" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
          {columns.map((c, i) =>
            i === columns.length - 1 ? (
              <span key={c}>
                <Chip chip={chip} />
              </span>
            ) : (
              <i key={c} className="bl-bar" style={{ width: `${82 - ((r + i) % 3) * 16}%` }} />
            ),
          )}
        </div>
      ))}
    </div>
  );
}

function GhostCards({ tag, chips }: { tag: string; chips: readonly GhostChip[] }) {
  return (
    <div className="bl-cards">
      {chips.map((chip, n) => (
        <div key={chip.label} className="bl-ghost bl-card">
          <div className="bl-card-top">
            <span className="bl-card-tag">{tag}</span>
            <Chip chip={chip} />
          </div>
          <i className="bl-bar" style={{ width: `${86 - n * 14}%` }} />
          <i className="bl-bar bl-bar--thin" style={{ width: '52%' }} />
        </div>
      ))}
    </div>
  );
}

function GhostForm({ fields }: { fields: readonly string[] }) {
  return (
    <div className="bl-ghost bl-form">
      {fields.map((f) => (
        <div key={f} className="bl-field">
          <span>{f}</span>
          <i className="bl-bar bl-bar--input" />
        </div>
      ))}
    </div>
  );
}

/** Vista previa ilustrativa (decorativa, oculta a lectores de pantalla). */
export function GhostPreview({ spec }: { spec: PreviewSpec }) {
  return (
    <div className="bl-preview" aria-hidden="true">
      {spec.kind === 'document' && <GhostDocument docLabel={spec.docLabel} chips={spec.chips} />}
      {spec.kind === 'table' && <GhostTable columns={spec.columns} chips={spec.chips} />}
      {spec.kind === 'cards' && <GhostCards tag={spec.tag} chips={spec.chips} />}
      {spec.kind === 'form' && <GhostForm fields={spec.fields} />}
      <span className="bl-preview-tag">Vista previa ilustrativa</span>
    </div>
  );
}
