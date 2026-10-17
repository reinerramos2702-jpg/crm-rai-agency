'use client';

import React from 'react';
import {
  WEEKDAYS_SHORT,
  longDayLabel,
  postVisualStatus,
  timeLabel,
  utcFromKey,
  type GridCell,
  type PlannerPost,
} from '@/lib/marketing-calendar';

interface GridProps {
  grouped: Record<string, PlannerPost[]>;
  gaps: Set<string>;
  todayKey: string;
  selected: string;
  tz: string;
  onSelect: (key: string) => void;
}

interface MonthProps extends GridProps {
  weeks: GridCell[][];
}

interface WeekProps extends GridProps {
  keys: string[];
}

const plural = (n: number) => `${n} ${n === 1 ? 'publicación' : 'publicaciones'}`;

function dayLabel(key: string, count: number, isGap: boolean, isToday: boolean): string {
  const base = `${isToday ? 'Hoy, ' : ''}${longDayLabel(key)}: ${count === 0 ? 'sin publicaciones' : plural(count)}`;
  return isGap ? `${base}, día por cubrir` : base;
}

/** Cuadrícula mensual: puntos de estado en móvil y chips con hora en pantallas anchas. */
export function MonthGrid({ weeks, grouped, gaps, todayKey, selected, tz, onSelect }: MonthProps) {
  return (
    <div className="mkt-cal" role="group" aria-label="Calendario del mes">
      <div className="mkt-cal-head" aria-hidden="true">
        {WEEKDAYS_SHORT.map((d) => <span key={d}>{d}</span>)}
      </div>
      {weeks.map((week) => (
        <div key={week[0].key} className="mkt-cal-week">
          {week.map((cell) => {
            const posts = grouped[cell.key] ?? [];
            const isToday = cell.key === todayKey;
            const isGap = gaps.has(cell.key) && cell.inMonth;
            const cls = ['mkt-day', cell.inMonth ? '' : 'is-out', isToday ? 'is-today' : '', cell.key < todayKey ? 'is-past' : '', isGap ? 'is-gap' : '']
              .filter(Boolean).join(' ');
            return (
              <button
                key={cell.key}
                type="button"
                className={cls}
                aria-pressed={selected === cell.key}
                aria-current={isToday ? 'date' : undefined}
                aria-label={dayLabel(cell.key, posts.length, isGap, isToday)}
                onClick={() => onSelect(cell.key)}
              >
                <span className="mkt-day-top">
                  <span className="mkt-day-num">{cell.day}</span>
                  {posts.length > 0 && <span className="mkt-day-count" aria-hidden="true">{posts.length}</span>}
                </span>
                <span className="mkt-day-dots" aria-hidden="true">
                  {posts.slice(0, 6).map((p) => <span key={p.id} className={`mkt-dot t-${postVisualStatus(p).tone}`} />)}
                </span>
                <span className="mkt-day-chips" aria-hidden="true">
                  {posts.slice(0, 2).map((p) => (
                    <span key={p.id} className={`mkt-day-chip t-${postVisualStatus(p).tone}`}><b>{timeLabel(p.scheduledAt, tz)}</b><span>{p.caption.slice(0, 60)}</span></span>
                  ))}
                  {posts.length > 2 && <span className="mkt-day-more">+{posts.length - 2} más</span>}
                  {posts.length === 0 && isGap && <span className="mkt-day-gap-label">Sin contenido</span>}
                </span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** Vista semanal: siete tarjetas de día (columnas en pantallas anchas, lista en móvil). */
export function WeekView({ keys, grouped, gaps, todayKey, selected, tz, onSelect }: WeekProps) {
  return (
    <div className="mkt-week" role="group" aria-label="Calendario de la semana">
      {keys.map((k, i) => {
        const posts = grouped[k] ?? [];
        const isToday = k === todayKey;
        const cls = ['mkt-week-day', isToday ? 'is-today' : '', k < todayKey ? 'is-past' : '', gaps.has(k) ? 'is-gap' : ''].filter(Boolean).join(' ');
        return (
          <div key={k} className={cls}>
            <button
              type="button"
              className="mkt-week-head"
              aria-pressed={selected === k}
              aria-current={isToday ? 'date' : undefined}
              aria-label={dayLabel(k, posts.length, gaps.has(k), isToday)}
              onClick={() => onSelect(k)}
            >
              <span>{WEEKDAYS_SHORT[i]} {utcFromKey(k).getUTCDate()}</span>
              <small>{isToday ? 'Hoy' : posts.length > 0 ? plural(posts.length) : ''}</small>
            </button>
            {posts.length === 0 && <span className="mkt-week-empty">{gaps.has(k) ? 'Sin contenido' : '—'}</span>}
            {posts.map((p) => {
              const st = postVisualStatus(p);
              return (
                <button key={p.id} type="button" className={`mkt-week-post t-${st.tone}`} onClick={() => onSelect(k)}>
                  <span className="mkt-post-head"><span className={`mkt-dot t-${st.tone}`} />{timeLabel(p.scheduledAt, tz)} · {st.label}</span>
                  <span>{p.caption.slice(0, 70)}{p.caption.length > 70 ? '…' : ''}</span>
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
