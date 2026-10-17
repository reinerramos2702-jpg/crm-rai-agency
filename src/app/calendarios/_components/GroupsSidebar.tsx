'use client';

import React from 'react';
import { Plus, RotateCw, Trash2, Users } from 'lucide-react';
import { GroupsSkeleton } from './CalendarsSkeleton';
import type { CalendarGroup } from './calendar-types';
import type { Resource } from './use-calendar-data';

interface Props {
  groups: Resource<CalendarGroup>;
  /** Calendarios por grupo y total (se calculan a partir de la lista de calendarios). */
  countByGroup: Record<string, number>;
  total: number | null;
  selected: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (group: CalendarGroup) => void;
}

/** Filtro por grupo. En pantallas angostas se convierte en chips horizontales (sin scroll propio). */
export function GroupsSidebar({ groups, countByGroup, total, selected, onSelect, onNew, onDelete }: Props) {
  return (
    <aside className="card cal-groups" aria-labelledby="cal-groups-title">
      <div className="cal-groups-head">
        <h2 id="cal-groups-title" className="cal-card-title">Grupos</h2>
        <button type="button" className="primary btn-sm" onClick={onNew}>
          <Plus size={14} aria-hidden="true" /> Nuevo
        </button>
      </div>

      {groups.loading ? (
        <>
          <span className="fx-sr-only" role="status">Cargando grupos…</span>
          <GroupsSkeleton />
        </>
      ) : (
        <ul className="cal-group-list">
          <li className="cal-group">
            <button
              type="button" className="cal-group-btn" aria-pressed={selected === 'all'} onClick={() => onSelect('all')}
            >
              <span className="cal-group-name">Todos los calendarios</span>
              {total !== null && <span className="cal-count">{total}</span>}
            </button>
          </li>
          {groups.items.map((g) => (
            <li key={g.id} className="cal-group">
              <button
                type="button" className="cal-group-btn" aria-pressed={selected === g.id} onClick={() => onSelect(g.id)}
              >
                <Users size={13} aria-hidden="true" />
                <span className="cal-group-name" title={g.name}>{g.name}</span>
                <span className="cal-count">{countByGroup[g.id] ?? 0}</span>
              </button>
              <button
                type="button" className="ghost cal-group-del" aria-label={`Eliminar el grupo ${g.name}`}
                onClick={() => onDelete(g)}
              >
                <Trash2 size={13} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {!groups.loading && groups.failed && (
        <p className="cal-groups-note" role="alert">
          No se pudieron cargar los grupos.{' '}
          <button type="button" className="ghost btn-sm" onClick={() => void groups.refresh()}>
            <RotateCw size={12} aria-hidden="true" /> Reintentar
          </button>
        </p>
      )}
      {!groups.loading && !groups.failed && groups.items.length === 0 && (
        <p className="cal-groups-note muted">Sin grupos aún. Crea uno para organizar tus calendarios.</p>
      )}
    </aside>
  );
}
