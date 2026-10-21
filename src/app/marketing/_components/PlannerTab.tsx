'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { useCachedJson } from '@/lib/use-cached-json';
import { getCached, prefetchJson } from '@/lib/swr-cache';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  PLAN_CONTENT_HREF,
  STATUS_FILTERS,
  addDaysKey,
  countByVisualStatus,
  dayKeyInZone,
  filterPostsByStatus,
  findGapKeys,
  groupPostsByDay,
  monthGrid,
  monthLabel,
  monthOfKey,
  rangeForKeys,
  shiftMonth,
  weekKeys,
  longDayLabel,
  type PlannerPost,
  type StatusFilter,
} from '@/lib/marketing-calendar';
import { MonthGrid, WeekView } from './PlannerGrid';
import { PlannerDetail } from './PlannerDetail';
import { PlannerSkeleton, CalendarSkeleton } from './skeletons';
import { loadErrorText, scrollBehavior } from './shared';
import { CardTitle, InlineError, Note } from './ui';

interface PostsResponse {
  mode: 'simulated' | 'live';
  timezone: string;
  igHandle: string;
  posts: PlannerPost[];
}

type View = 'month' | 'week';

const LEGEND: Array<[string, string]> = [['ok', 'Publicada'], ['info', 'Simulada'], ['warn', 'Programada'], ['danger', 'Falló'], ['muted', 'Borrador o cancelada']];

const monthStart = (m: { year: number; month: number }) => `${m.year}-${String(m.month + 1).padStart(2, '0')}-01`;

/** Claves de día que muestra la vista para un ancla dada. */
function keysFor(view: View, anchor: string): string[] {
  return view === 'month' ? monthGrid(monthOfKey(anchor)).flat().map((c) => c.key) : weekKeys(anchor);
}

function postsUrl(keys: string[]): string {
  const { from, to } = rangeForKeys(keys);
  return `/api/marketing/posts?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
}

/** Ancla del periodo contiguo (mes o semana anterior/siguiente). */
function neighbour(view: View, anchor: string, dir: -1 | 1): string {
  return view === 'week' ? addDaysKey(anchor, 7 * dir) : monthStart(shiftMonth(monthOfKey(anchor), dir));
}

interface BodyProps {
  canWrite: boolean;
  anchor: string;
  setAnchor: (k: string) => void;
  tzGuess: string;
}

function PlannerBody({ canWrite, anchor, setAnchor, tzGuess }: BodyProps) {
  const [view, setView] = useState<View>('month');
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [selected, setSelected] = useState('');
  const detailRef = useRef<HTMLDivElement>(null);

  const month = monthOfKey(anchor);
  const weeks = useMemo(() => monthGrid(month), [month.year, month.month]); // eslint-disable-line react-hooks/exhaustive-deps
  const keys = useMemo(() => (view === 'month' ? weeks.flat().map((c) => c.key) : weekKeys(anchor)), [view, weeks, anchor]);
  const url = postsUrl(keys);
  const { data: latest, error, refresh, revalidating } = useCachedJson<PostsResponse>(url, { ttlMs: 20_000 });
  // Solo se usan datos de este rango: al cambiar de mes no se muestran los del anterior (evita falsos «días sin publicar»).
  const data = getCached<PostsResponse>(url)?.data;

  const tz = data?.timezone ?? latest?.timezone ?? tzGuess;
  const todayKey = dayKeyInZone(Date.now(), tz);
  const visible = useMemo(() => filterPostsByStatus(data?.posts ?? [], filter), [data, filter]);
  const grouped = useMemo(() => groupPostsByDay(visible, tz), [visible, tz]);
  const gaps = useMemo(() => (data ? findGapKeys(keys, groupPostsByDay(data.posts, tz), todayKey) : new Set<string>()), [keys, data, tz, todayKey]);
  const inRange = useMemo(() => (data?.posts ?? []).filter((p) => keys.includes(dayKeyInZone(p.scheduledAt, tz))), [data, keys, tz]);
  const counts = countByVisualStatus(inRange);
  const monthGaps = view === 'month' ? [...gaps].filter((k) => weeks.flat().some((c) => c.key === k && c.inMonth)).length : gaps.size;
  const fallbackKey = keys.includes(todayKey) ? todayKey : view === 'month' ? monthStart(month) : keys[0];
  const sel = selected && keys.includes(selected) ? selected : fallbackKey;

  const failed = error !== null && !data;
  const loading = !data && error === null;
  const schemaPending = failed && error === 'HTTP 503';

  const step = (dir: -1 | 1) => setAnchor(neighbour(view, anchor, dir));
  const warm = (dir: -1 | 1) => prefetchJson(postsUrl(keysFor(view, neighbour(view, anchor, dir))));
  const title = view === 'month' ? monthLabel(month) : `Semana del ${longDayLabel(keys[0])}`;

  // Al elegir un día en pantallas donde el detalle queda abajo, se acerca a la vista.
  const choose = (key: string) => {
    setSelected(key);
    requestAnimationFrame(() => {
      const el = detailRef.current;
      if (el && el.getBoundingClientRect().top > window.innerHeight - 140) el.scrollIntoView({ block: 'start', behavior: scrollBehavior() });
    });
  };

  return (
    <div className="mkt-panel">
      {schemaPending && (
        <Note tone="warn">
          <strong>Falta aplicar la tabla de publicaciones.</strong> El calendario funciona, pero todavía no hay dónde guardar publicaciones (tabla ScheduledPost). Aplica <code>docs/planning/staging-scheduledpost.sql</code> en Supabase y reinicia el servidor.
          <div className="mkt-note-actions"><button type="button" className="mkt-btn" disabled={revalidating} onClick={() => void refresh()}>{revalidating ? 'Reintentando…' : 'Reintentar'}</button></div>
        </Note>
      )}
      {failed && !schemaPending && (
        <InlineError title="No se pudieron cargar las publicaciones." detail={loadErrorText(error)} onRetry={() => void refresh()} retrying={revalidating} />
      )}
      {data?.mode === 'simulated' && (
        <Note tone="info"><strong>Modo simulado.</strong> Las publicaciones se procesan sin enviarse a Instagram; las verás como «Simulada». {data.igHandle ? `Cuenta configurada: ${data.igHandle}.` : 'Aún no hay cuenta de Instagram configurada.'}</Note>
      )}

      <div className="mkt-planner-layout">
        <section className="card" aria-labelledby="pl-title">
          <div className="mkt-cal-bar">
            <div className="mkt-cal-nav">
              <button type="button" className="mkt-btn is-icon" aria-label={view === 'month' ? 'Mes anterior' : 'Semana anterior'} onClick={() => step(-1)} onPointerEnter={() => warm(-1)}><ChevronLeft size={16} aria-hidden="true" /></button>
              <CardTitle id="pl-title" icon={CalendarDays}>{title}</CardTitle>
              <button type="button" className="mkt-btn is-icon" aria-label={view === 'month' ? 'Mes siguiente' : 'Semana siguiente'} onClick={() => step(1)} onPointerEnter={() => warm(1)}><ChevronRight size={16} aria-hidden="true" /></button>
            </div>
            <div className="mkt-cal-tools">
              <button type="button" className="mkt-btn" onClick={() => { setAnchor(todayKey); setSelected(todayKey); }}>Hoy</button>
              <div className="mkt-seg" role="group" aria-label="Vista">
                <button type="button" className="mkt-seg-btn" aria-pressed={view === 'month'} onClick={() => setView('month')}>Mes</button>
                <button type="button" className="mkt-seg-btn" aria-pressed={view === 'week'} onClick={() => setView('week')}>Semana</button>
              </div>
              <Link className="btn btn-primary" href={PLAN_CONTENT_HREF}>Planear contenido</Link>
            </div>
          </div>

          <div className="mkt-chips" role="group" aria-label="Filtrar por estado" style={{ marginBottom: 12 }}>
            <span className="muted" style={{ marginRight: 4 }}>Red: Instagram</span>
            {STATUS_FILTERS.map((f) => (
              <button key={f.id} type="button" className="mkt-chip" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}{f.id !== 'all' && counts[f.id] > 0 ? ` · ${counts[f.id]}` : ''}</button>
            ))}
          </div>

          {data && (
            <p className="mkt-sum" aria-live="polite">
              <span><strong>{inRange.length}</strong> {inRange.length === 1 ? 'publicación' : 'publicaciones'} en esta vista</span>
              {monthGaps > 0 && <span className="is-gap"><span className="mkt-gap-swatch" aria-hidden="true" /><strong>{monthGaps}</strong> {monthGaps === 1 ? 'día por cubrir' : 'días por cubrir'}</span>}
              <span>Zona horaria {tz}</span>
            </p>
          )}

          {loading ? <CalendarSkeleton weeks={view === 'month' ? weeks.length : 1} /> : view === 'month' ? (
            <MonthGrid weeks={weeks} grouped={grouped} gaps={gaps} todayKey={todayKey} selected={sel} tz={tz} onSelect={choose} />
          ) : (
            <WeekView keys={keys} grouped={grouped} gaps={gaps} todayKey={todayKey} selected={sel} tz={tz} onSelect={choose} />
          )}

          <div className="mkt-legend">
            {LEGEND.map(([t, l]) => <span key={l}><span className={`mkt-dot t-${t}`} />{l}</span>)}
            <span><span className="mkt-gap-swatch" />Día sin publicar</span>
          </div>
        </section>

        <div ref={detailRef} className="mkt-detail-side" style={{ scrollMarginTop: 12 }}>
          <PlannerDetail dayKey={sel} posts={grouped[sel] ?? []} isGap={gaps.has(sel)} loading={loading} tz={tz} canWrite={canWrite && !failed} onChanged={() => void refresh()} />
        </div>
      </div>
      <Note>Hoy el planificador publica solo en Instagram. Facebook y TikTok requieren conectar sus cuentas (aún no integradas). Las publicaciones se crean desde el Generador de imágenes.</Note>
    </div>
  );
}

export default function PlannerTab({ canWrite, canManageContent }: { canWrite: boolean; canManageContent: boolean | undefined }) {
  const [anchor, setAnchor] = useState('');
  const [tzGuess, setTzGuess] = useState('UTC');
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    setTzGuess(tz);
    setAnchor(dayKeyInZone(Date.now(), tz));
  }, []);

  if (canManageContent === false) {
    return <EmptyState icon={Lock} title="Tu rol no administra contenido" text="El planificador está disponible para quienes pueden gestionar contenido. Pide acceso a un administrador." />;
  }
  if (!anchor) return <PlannerSkeleton />;
  return <PlannerBody canWrite={canWrite} anchor={anchor} setAnchor={setAnchor} tzGuess={tzGuess} />;
}
