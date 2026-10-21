'use client';

import React from 'react';
import { Ban, CalendarClock, RotateCcw } from 'lucide-react';
import type { ScheduledPostView } from '../useScheduledPosts';
import { CONTENT_TYPE_LABELS, DAY_STATUS_COLORS, DAY_STATUS_LABELS, PILLAR_COLORS, SCHED_COLORS, SCHED_LABELS } from './constants';
import { ContentTypeIcon } from './ContentTypeIcon';
import { fmtShortDate, fmtWhen } from './utils';
import type { ContentDay } from './types';

interface DayCardProps {
  day: ContentDay;
  post: ScheduledPostView | undefined;
  selected: boolean;
  onSelect: (day: number) => void;
  onAction: (post: ScheduledPostView, action: 'cancel' | 'retry') => void;
}

function ScheduleChip({ post, onAction }: { post: ScheduledPostView; onAction: DayCardProps['onAction'] }) {
  const canCancel = post.status === 'scheduled' || post.status === 'draft' || post.status === 'failed';
  const canRetry = post.status === 'failed' || post.status === 'cancelled';
  return (
    <div className="rai-sched-chip" style={{ '--sc': SCHED_COLORS[post.status] } as React.CSSProperties}>
      <span className="rai-sched-state">
        {post.status === 'published'
          ? <svg className="rai-check-draw" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M3 8.5l3.2 3.2L13 4.8" /></svg>
          : <i aria-hidden="true" />}
        {SCHED_LABELS[post.status]}{post.simulated && post.status === 'published' ? ' · simulado' : ''}
      </span>
      <span className="rai-sched-when"><CalendarClock size={11} aria-hidden="true" /> {fmtWhen(post.scheduledAt, post.timezone)}</span>
      {post.status === 'failed' && post.lastError && <span className="rai-sched-err" title={post.lastError}>{post.lastError}</span>}
      {post.status === 'scheduled' && post.attempts > 0 && post.lastError && <span className="rai-sched-err" title={post.lastError}>Reintento pendiente</span>}
      {canCancel && (
        <button type="button" className="rai-sched-act" onClick={() => onAction(post, 'cancel')} aria-label={`Cancelar la publicación del día ${post.dayNumber}`}>
          <Ban size={11} aria-hidden="true" /> Cancelar
        </button>
      )}
      {canRetry && (
        <button type="button" className="rai-sched-act" onClick={() => onAction(post, 'retry')} aria-label={`Volver a programar el día ${post.dayNumber}`}>
          <RotateCcw size={11} aria-hidden="true" /> Reintentar
        </button>
      )}
    </div>
  );
}

/** Tarjeta de un día del calendario. El botón del encabezado es el control accesible; toda la tarjeta responde al clic. */
export function DayCard({ day, post, selected, onSelect, onAction }: DayCardProps) {
  const status = DAY_STATUS_LABELS[day.status] ?? day.status;
  return (
    <article
      className={`rai-day${selected ? ' is-selected' : ''}`}
      style={{ '--pc': PILLAR_COLORS[day.pillar] || 'var(--rai-border)', '--sc': DAY_STATUS_COLORS[day.status] } as React.CSSProperties}
      onClick={() => onSelect(day.day)}
    >
      <div className="rai-day-top">
        <button
          type="button"
          className="ig-day-select"
          aria-pressed={selected}
          aria-label={`Día ${day.day}, ${status}. ${selected ? 'Quitar selección' : 'Seleccionar para regenerar'}`}
          onClick={(e) => { e.stopPropagation(); onSelect(day.day); }}
        >
          <span className="rai-day-n">{String(day.day).padStart(2, '0')}</span>
        </button>
        <span className="rai-day-status"><i aria-hidden="true" />{status}</span>
      </div>
      <div className="rai-day-date">{fmtShortDate(day.date)}</div>
      <p className="rai-day-hook">{day.hook}</p>
      <div className="rai-day-tags">
        <span className="rai-tag rai-tag-pillar">{day.pillar}</span>
        <span className="rai-tag"><ContentTypeIcon type={day.type} size={12} /> {CONTENT_TYPE_LABELS[day.type]}</span>
      </div>
      {post && (
        <div onClick={(e) => e.stopPropagation()}>
          <ScheduleChip post={post} onAction={onAction} />
        </div>
      )}
    </article>
  );
}
