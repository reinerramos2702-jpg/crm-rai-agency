import React from 'react';
import { Plus } from 'lucide-react';
import { formatMoney, plural } from '../../contactos/_shared/crm-text';
import type { CardPrefs } from './card-prefs';
import { stageVars } from './css-vars';
import { OpportunityCard } from './OpportunityCard';
import { totals, type Opportunity } from './opportunity-model';
import type { Stage, StageId } from './stages';

interface StageColumnProps {
  stage: Stage;
  items: readonly Opportunity[];
  prefs: CardPrefs;
  selected: ReadonlySet<string>;
  /** Cuántas tarjetas fantasma mostrar cuando todo el embudo está vacío (vista previa). */
  ghosts: number;
  onToggle: (id: string) => void;
  onMove: (id: string, stageId: StageId) => void;
  onAdd: (stageId: StageId) => void;
}

function GhostCard() {
  return <div className="crm-ghost-card"><i /><i /><i /></div>;
}

/** Columna del tablero: total por etapa, acento de color, tarjetas y «Añadir» discreto. */
export function StageColumn({ stage, items, prefs, selected, ghosts, onToggle, onMove, onAdd }: StageColumnProps) {
  const sum = totals(items);
  const headingId = `pl-stage-${stage.id}`;
  return (
    <section className="pl-col" style={stageVars(stage)} aria-labelledby={headingId}>
      <header className="pl-col-head">
        <h3 id={headingId} className="pl-col-title">
          <span className="pl-dot" aria-hidden="true" />
          <span>{stage.label}</span>
        </h3>
        <p className="pl-col-meta">{plural(sum.count, 'cliente potencial', 'clientes potenciales')} · {formatMoney(sum.value)}</p>
      </header>
      <div className={`pl-col-body${items.length === 0 ? ' is-empty' : ''}`}>
        {items.map((o) => (
          <OpportunityCard key={o.id} opportunity={o} prefs={prefs} selected={selected.has(o.id)} onToggle={onToggle} onMove={onMove} />
        ))}
        {items.length === 0 && ghosts > 0 && (
          <div className="pl-ghosts" aria-hidden="true">
            {Array.from({ length: ghosts }, (_, i) => <GhostCard key={i} />)}
          </div>
        )}
        {items.length === 0 && ghosts === 0 && <p className="pl-col-empty">Sin oportunidades</p>}
        <button type="button" className="ghost btn-sm pl-add" onClick={() => onAdd(stage.id)} aria-label={`Añadir oportunidad en ${stage.label}`}>
          <Plus size={12} aria-hidden="true" /> Añadir
        </button>
      </div>
    </section>
  );
}
