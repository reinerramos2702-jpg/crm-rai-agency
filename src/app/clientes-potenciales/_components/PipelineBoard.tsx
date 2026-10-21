import React from 'react';
import type { CardPrefs } from './card-prefs';
import { groupByStage, type Opportunity } from './opportunity-model';
import { StageColumn } from './StageColumn';
import { STAGES, type StageId } from './stages';

interface PipelineBoardProps {
  items: readonly Opportunity[];
  prefs: CardPrefs;
  selected: ReadonlySet<string>;
  /** Embudo sin ninguna oportunidad: las primeras columnas muestran una vista previa. */
  showGhosts: boolean;
  onToggle: (id: string) => void;
  onMove: (id: string, stageId: StageId) => void;
  onAdd: (stageId: StageId) => void;
}

const GHOST_COUNTS = [2, 2, 1, 1, 0, 0];

/** Tablero Kanban: un único scroller horizontal; en móvil cada columna se ajusta con scroll-snap. */
export function PipelineBoard({ items, prefs, selected, showGhosts, onToggle, onMove, onAdd }: PipelineBoardProps) {
  const groups = groupByStage(items);
  return (
    <div className="pl-board" role="region" aria-label="Tablero del embudo de ventas" tabIndex={0}>
      {STAGES.map((stage, index) => (
        <StageColumn
          key={stage.id}
          stage={stage}
          items={groups[stage.id]}
          prefs={prefs}
          selected={selected}
          ghosts={showGhosts ? (GHOST_COUNTS[index] ?? 0) : 0}
          onToggle={onToggle}
          onMove={onMove}
          onAdd={onAdd}
        />
      ))}
    </div>
  );
}
