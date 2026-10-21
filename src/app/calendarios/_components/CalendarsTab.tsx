'use client';

import React, { useMemo, useState } from 'react';
import { Plus, RotateCw, TriangleAlert } from 'lucide-react';
import { CalendarCard } from './CalendarCard';
import { CalendarsEmpty } from './CalendarsEmpty';
import { CalendarGridSkeleton } from './CalendarsSkeleton';
import { GroupsSidebar } from './GroupsSidebar';
import type { CalendarResource } from './calendar-types';
import type { OpenModal } from './modal-state';
import type { CalendarTemplate } from './templates';
import type { CalendarActions } from './use-calendar-actions';
import type { CalendarData } from './use-calendar-data';
import { useOrigin } from './use-origin';

interface Props {
  data: CalendarData;
  upcoming: Record<string, number>;
  actions: CalendarActions;
  openModal: OpenModal;
}

/** Pestaña «Calendarios»: columna de grupos + panel con las tarjetas de calendario. */
export function CalendarsTab({ data, upcoming, actions, openModal }: Props) {
  const { groups, calendars } = data;
  const origin = useOrigin();
  const [picked, setPicked] = useState('all');
  // Si el grupo elegido ya no existe (se eliminó), se vuelve a «Todos».
  const selected = picked !== 'all' && groups.items.some((g) => g.id === picked) ? picked : 'all';
  const selectedGroup = groups.items.find((g) => g.id === selected);

  const countByGroup = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of calendars.items) if (c.groupId) counts[c.groupId] = (counts[c.groupId] ?? 0) + 1;
    return counts;
  }, [calendars.items]);
  const showCounts = !calendars.loading && !calendars.failed;
  const visible = selected === 'all' ? calendars.items : calendars.items.filter((c) => c.groupId === selected);

  const newCalendar = (template: CalendarTemplate | null) =>
    openModal({ kind: 'calendar', calendar: null, template, groupId: selected === 'all' ? '' : selected });
  const schedule = (c: CalendarResource) =>
    openModal({ kind: 'appointment', appointment: null, prefill: { calendarId: c.id } });

  let body: React.ReactNode;
  if (calendars.loading) {
    body = <CalendarGridSkeleton />;
  } else if (calendars.failed) {
    body = (
      <div className="card cal-state" role="alert">
        <TriangleAlert size={28} aria-hidden="true" />
        <h3 className="cal-state-title">No se pudieron cargar los calendarios</h3>
        <p className="cal-state-text">Revisa tu conexión e inténtalo de nuevo. No se perdió ningún dato.</p>
        <button type="button" className="primary" onClick={() => void calendars.refresh()}>
          <RotateCw size={14} aria-hidden="true" /> Reintentar
        </button>
      </div>
    );
  } else if (calendars.items.length === 0) {
    body = <CalendarsEmpty onCreate={newCalendar} />;
  } else if (visible.length === 0) {
    body = (
      <div className="card cal-state">
        <h3 className="cal-state-title">Este grupo aún no tiene calendarios</h3>
        <p className="cal-state-text">Crea uno dentro de «{selectedGroup?.name ?? 'este grupo'}» o asigna un calendario existente desde «Editar».</p>
        <div className="cal-actions">
          <button type="button" className="ghost" onClick={() => setPicked('all')}>Ver todos</button>
          <button type="button" className="primary" onClick={() => newCalendar(null)}>
            <Plus size={14} aria-hidden="true" /> Crear calendario aquí
          </button>
        </div>
      </div>
    );
  } else {
    body = (
      <div className="cal-grid">
        {visible.map((c) => (
          <CalendarCard
            key={c.id}
            calendar={c}
            upcoming={upcoming[c.id] ?? 0}
            origin={origin}
            onEdit={(cal) => openModal({ kind: 'calendar', calendar: cal, template: null, groupId: '' })}
            onDelete={(cal) => openModal({ kind: 'delete-calendar', calendar: cal })}
            onToggleStatus={(cal) => void actions.toggleCalendarStatus(cal)}
            onSchedule={schedule}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="cal-cq">
      <div className="cal-layout">
        <GroupsSidebar
          groups={groups}
          countByGroup={countByGroup}
          total={showCounts ? calendars.items.length : null}
          selected={selected}
          onSelect={setPicked}
          onNew={() => openModal({ kind: 'group' })}
          onDelete={(group) => openModal({ kind: 'delete-group', group })}
        />

        <section className="cal-panel" aria-labelledby="cal-panel-title">
          <div className="cal-panel-head">
            <h2 id="cal-panel-title" className="cal-card-title">
              {selectedGroup ? selectedGroup.name : 'Todos los calendarios'}
              {showCounts && <span className="cal-count" aria-label={`${visible.length} calendarios`}>{visible.length}</span>}
            </h2>
            <button type="button" className="primary btn-sm" onClick={() => newCalendar(null)}>
              <Plus size={14} aria-hidden="true" /> Nuevo calendario
            </button>
          </div>
          {calendars.stale && (
            <p className="cal-banner cal-banner--err" role="alert">
              <TriangleAlert size={14} aria-hidden="true" />
              <span>No se pudo actualizar la lista. Mostrando lo último guardado.</span>
              <button type="button" className="ghost btn-sm" onClick={() => void calendars.refresh()}>Reintentar</button>
            </p>
          )}
          {body}
        </section>
      </div>
    </div>
  );
}
