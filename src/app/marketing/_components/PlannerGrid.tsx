'use client';

import React from 'react';
import {
  WEEKDAYS_SHORT,
  longDayLabel,
  postVisualStatus,
  timeLabel,
  type GridCell,
  type PlannerPost,
} from '@/lib/marketing-calendar';

interface GridProps {
  weeks: GridCell[][];
  grouped: Record<string, PlannerPost[]>;
  gaps: Set<string>;
  todayKey: string;
  selected: string;
  tz: string;
  onSelect: (key: string) => void;
}

/** Cuadrícula mensual: puntos de estado en móvil y chips con hora en pantallas anchas. */
export function MonthGrid({ weeks, grouped, gaps, todayKey, selected, tz, onSelect }: GridProps) {
  return (
    <div className="mkt-cal" role="group" aria-label="Calendario del mes">
      <div className="mkt-cal-head" aria-hidden="true">
        {WEEKDAYS_SHORT.map((d) => <span key={d}>{d}</span>)}
      </div>
      {weeks.map((week) => (
        <div key={week[0].key} className="mkt-cal-week">
          {week.map((cell) => {
            const posts = grouped[cell.key] ?? [];
            const cls = ['mkt-day', cell.inMonth ? '' : 'is-out', cell.key === todayKey ? 'is-today' : '', gaps.has(cell.key) && cell.inMonth ? 'is-gap' : '']
              .filter(Boolean).join(' ');
            const label = `${longDayLabel(cell.key)}: ${posts.length === 0 ? (gaps.has(cell.key) ? 'sin publicaciones' : 'sin publicaciones') : `${posts.length} ${posts.length === 1 ? 'publicación' : 'publicaciones'}`}`;
            return (
              <button key={cell.key} type="button" className={cls} aria-pressed={selected === cell.key} aria-label={label} onClick={() => onSelect(cell.key)}>
                <span className="mkt-day-num">{cell.day}</span>
                <span className="mkt-day-dots" aria-hidden="true">
                  {posts.slice(0, 6).map((p) => <span key={p.id} className={`mkt-dot t-${postVisualStatus(p).tone}`} />)}
                </span>
                <span className="mkt-day-chips" aria-hidden="true">
                  {posts.slice(0, 2).map((p) => (
                    <span key={p.id} className="mkt-day-chip"><span className={`mkt-dot t-${postVisualStatus(p).tone}`} />{timeLabel(p.scheduledAt, tz)} {p.caption.slice(0, 24)}</span>
                  ))}
                  {posts.length > 2 && <span className="mkt-day-more">+{posts.length - 2} más</span>}
                </span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

interface WeekProps {
  keys: string[];
  grouped: Record<string, PlannerPost[]>;
  gaps: Set<string>;
  todayKey: string;
  selected: string;
  tz: string;
  onSelect: (key: string) => void;
}

/** Vista semanal: siete tarjetas de día (columnas en pantallas anchas, lista en móvil). */
export function WeekView({ keys, grouped, gaps, todayKey, selected, tz, onSelect }: WeekProps) {
  return (
    <div className="mkt-week" role="group" aria-label="Calendario de la semana">
      {keys.map((k) => {
        const posts = grouped[k] ?? [];
        const cls = ['mkt-week-day', k === todayKey ? 'is-today' : '', gaps.has(k) ? 'is-gap' : ''].filter(Boolean).join(' ');
        return (
          <div key={k} className={cls}>
            <h3>{longDayLabel(k)}</h3>
            {posts.length === 0 && <span className="mkt-week-empty">{gaps.has(k) ? 'Sin publicar' : '—'}</span>}
            {posts.map((p) => {
              const st = postVisualStatus(p);
              return (
                <div key={p.id} className="mkt-week-post">
                  <span className="mkt-post-head"><span className={`mkt-dot t-${st.tone}`} />{timeLabel(p.scheduledAt, tz)} · {st.label}</span>
                  <span>{p.caption.slice(0, 70)}{p.caption.length > 70 ? '…' : ''}</span>
                </div>
              );
            })}
            <button type="button" className="mkt-btn" aria-pressed={selected === k} onClick={() => onSelect(k)}>Ver detalle</button>
          </div>
        );
      })}
    </div>
  );
}
