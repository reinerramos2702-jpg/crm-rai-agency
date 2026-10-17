'use client';

import React, { useMemo, useState } from 'react';
import { Calendar, CalendarClock, FolderOpen, Instagram, Loader2, Play, RefreshCw, Sparkles } from 'lucide-react';
import { DAY_STATUS_COLORS, DAY_STATUS_LABELS, DAY_STATUS_ORDER, folderTreeLines } from './constants';
import { DayCard } from './DayCard';
import type { useIgScheduling } from './useIgScheduling';
import { fmtShortDate } from './utils';
import type { Campaign, DayStatus } from './types';

type Scheduling = ReturnType<typeof useIgScheduling>;

interface CalendarViewProps {
  campaign: Campaign | null;
  scheduling: Scheduling;
  onPlan: () => void;
}

export function CalendarView({ campaign, scheduling, onPlan }: CalendarViewProps) {
  const { sched, batch, selectedDay, toggleDay, nextBusy, hasPending, publishNext, regenerateDay, cancelOrRetry, setDialogOpen } = scheduling;
  const [filter, setFilter] = useState<DayStatus | null>(null);

  const counts = useMemo(() => {
    const c: Record<DayStatus, number> = { pending: 0, generated: 0, approved: 0, published: 0, failed: 0 };
    for (const d of campaign?.days ?? []) c[d.status] += 1;
    return c;
  }, [campaign]);
  const statusTiles: DayStatus[] = counts.failed > 0 ? [...DAY_STATUS_ORDER, 'failed'] : DAY_STATUS_ORDER;
  const days = useMemo(() => (campaign?.days ?? []).filter((d) => filter === null || d.status === filter), [campaign, filter]);

  if (!campaign) {
    return (
      <div data-tour="calendar">
        <div className="card ig-empty">
          <div className="rai-halo" aria-hidden="true"><Calendar size={30} /></div>
          <h2 className="ig-empty-title">Selecciona una campaña</h2>
          <p className="ig-empty-text">Ve a «Mis campañas» para elegir una, o planea una nueva.</p>
          <button type="button" className="primary ig-cta" onClick={onPlan}>
            <Sparkles size={16} aria-hidden="true" /> Planear contenido
          </button>
        </div>
      </div>
    );
  }

  return (
    <div data-tour="calendar">
      <div className="ig-head">
        <div className="ig-head-main">
          <h2 className="ig-head-title"><Instagram size={18} aria-hidden="true" style={{ color: 'var(--rai-gold)' }} /> {campaign.name || 'Campaña sin nombre'}</h2>
          <p className="ig-camp-meta">{fmtShortDate(campaign.startDate)} → {fmtShortDate(campaign.endDate)} · <code>{campaign.folderName}</code></p>
        </div>
        <div className="ig-actions">
          <button
            type="button"
            className="ghost ig-btn"
            onClick={regenerateDay}
            disabled={selectedDay == null}
            title={selectedDay == null ? 'Toca un día del calendario para elegirlo' : `Pedir a la IA un nuevo contenido para el día ${selectedDay}`}
          >
            <RefreshCw size={14} aria-hidden="true" /> {selectedDay == null ? 'Regenerar día' : `Regenerar día ${selectedDay}`}
          </button>
          <button type="button" className="ghost ig-btn" onClick={() => void publishNext()} disabled={nextBusy || !hasPending} title="Publica ya la siguiente pieza programada">
            {nextBusy ? <Loader2 size={14} className="au-spin" aria-hidden="true" /> : <Play size={14} aria-hidden="true" />} Publicar siguiente
          </button>
          <button
            type="button"
            className="primary ig-btn"
            onClick={() => setDialogOpen(true)}
            disabled={batch.valid.length === 0}
            data-tour="schedule-btn"
            title={batch.valid.length === 0 ? 'No hay piezas pendientes de programar' : 'Programa el lote: el CRM publica solo'}
          >
            <CalendarClock size={14} aria-hidden="true" /> Programar lote{batch.valid.length > 0 ? ` (${batch.valid.length})` : ''}
          </button>
        </div>
      </div>

      <div className="rai-stats" role="group" aria-label="Filtrar por estado">
        {statusTiles.map((st) => (
          <button
            key={st}
            type="button"
            className="rai-stat ig-stat"
            aria-pressed={filter === st}
            style={{ '--sc': DAY_STATUS_COLORS[st] } as React.CSSProperties}
            onClick={() => setFilter((cur) => (cur === st ? null : st))}
          >
            <strong>{counts[st]}</strong>
            <span><i aria-hidden="true" />{DAY_STATUS_LABELS[st]}</span>
          </button>
        ))}
      </div>

      {sched.mode === 'simulated' && (
        <p className="rai-sched-mode" role="status"><i aria-hidden="true" /> Modo simulado: programar y publicar recorre todo el ciclo sin tocar tu Instagram real.</p>
      )}
      {!sched.available && (
        <p className="rai-sched-mode is-warn" role="status"><i aria-hidden="true" /> La programación no está disponible todavía en este entorno (falta aplicar la migración).</p>
      )}
      {filter !== null && (
        <p className="ig-filter-note" role="status">
          Mostrando {days.length} de {campaign.days.length} días · {DAY_STATUS_LABELS[filter]}.{' '}
          <button type="button" className="ig-link" onClick={() => setFilter(null)}>Ver todos</button>
        </p>
      )}

      {days.length === 0 ? (
        <p className="ig-none">No hay días con ese estado.</p>
      ) : (
        <div className="rai-cal-grid">
          {days.map((day) => (
            <DayCard key={day.day} day={day} post={sched.byDay.get(day.day)} selected={selectedDay === day.day} onSelect={toggleDay} onAction={(p, a) => void cancelOrRetry(p, a)} />
          ))}
        </div>
      )}

      <details className="card ig-tree">
        <summary><FolderOpen size={15} aria-hidden="true" style={{ color: 'var(--rai-gold)' }} /> Estructura de carpetas</summary>
        <pre>{folderTreeLines(campaign.folderName).join('\n')}</pre>
      </details>
    </div>
  );
}
