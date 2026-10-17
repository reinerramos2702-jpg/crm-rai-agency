'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { useCachedJson } from '@/lib/use-cached-json';
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
import { Note, SectionSkeleton } from './shared';

interface PostsResponse {
  mode: 'simulated' | 'live';
  timezone: string;
  igHandle: string;
  posts: PlannerPost[];
}

type View = 'month' | 'week';

const LEGEND: Array<[string, string]> = [['ok', 'Publicada'], ['info', 'Simulada'], ['warn', 'Programada'], ['danger', 'Falló'], ['muted', 'Borrador o cancelada']];

function PlannerBody({ canWrite, anchor, setAnchor, tzGuess }: { canWrite: boolean; anchor: string; setAnchor: (k: string) => void; tzGuess: string }) {
  const [view, setView] = useState<View>('month');
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [selected, setSelected] = useState('');

  const month = monthOfKey(anchor);
  const weeks = useMemo(() => monthGrid(month), [month.year, month.month]); // eslint-disable-line react-hooks/exhaustive-deps
  const keys = useMemo(() => (view === 'month' ? weeks.flat().map((c) => c.key) : weekKeys(anchor)), [view, weeks, anchor]);
  const { from, to } = rangeForKeys(keys);
  const { data, error, loading, refresh } = useCachedJson<PostsResponse>(`/api/marketing/posts?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { ttlMs: 20_000 });

  const tz = data?.timezone ?? tzGuess;
  const todayKey = dayKeyInZone(Date.now(), tz);
  const visible = useMemo(() => filterPostsByStatus(data?.posts ?? [], filter), [data, filter]);
  const grouped = useMemo(() => groupPostsByDay(visible, tz), [visible, tz]);
  const gaps = useMemo(() => findGapKeys(keys, groupPostsByDay(data?.posts ?? [], tz), todayKey), [keys, data, tz, todayKey]);
  const inRange = useMemo(() => (data?.posts ?? []).filter((p) => keys.includes(dayKeyInZone(p.scheduledAt, tz))), [data, keys, tz]);
  const counts = countByVisualStatus(inRange);
  const monthGaps = view === 'month' ? [...gaps].filter((k) => weeks.flat().some((c) => c.key === k && c.inMonth)).length : gaps.size;
  const fallbackKey = keys.includes(todayKey) ? todayKey : view === 'month' ? `${month.year}-${String(month.month + 1).padStart(2, '0')}-01` : keys[0];
  const sel = selected && keys.includes(selected) ? selected : fallbackKey;

  const failed = error !== null && !data;
  const schemaPending = failed && error.includes('503');

  const step = (dir: -1 | 1) => {
    if (view === 'week') return setAnchor(addDaysKey(anchor, 7 * dir));
    const m = shiftMonth(month, dir);
    setAnchor(`${m.year}-${String(m.month + 1).padStart(2, '0')}-01`);
  };
  const title = view === 'month' ? monthLabel(month) : `Semana del ${longDayLabel(keys[0])}`;

  return (
    <div className="mkt-panel">
      {failed && (
        <Note tone="warn">
          {schemaPending ? (
            <>
              <strong>Falta aplicar la tabla de publicaciones.</strong> El calendario funciona, pero todavía no hay dónde guardar publicaciones (tabla ScheduledPost). Aplica <code>docs/planning/staging-scheduledpost.sql</code> en Supabase y reinicia el servidor.
            </>
          ) : (
            <>
              <strong>No se pudieron cargar las publicaciones.</strong> El servidor respondió con un error ({error}).
            </>
          )}{' '}
          <button type="button" className="mkt-btn" onClick={() => void refresh()}>Reintentar</button>
        </Note>
      )}
      {data?.mode === 'simulated' && (
        <Note tone="info"><strong>Modo simulado.</strong> Las publicaciones se procesan sin enviarse a Instagram; las verás como «Simulada». {data.igHandle ? `Cuenta configurada: ${data.igHandle}.` : 'Aún no hay cuenta de Instagram configurada.'}</Note>
      )}
      <section className="card" aria-labelledby="pl-title">
        <div className="mkt-cal-bar" style={{ marginBottom: 12 }}>
          <button type="button" className="mkt-btn" aria-label="Anterior" onClick={() => step(-1)}><ChevronLeft size={16} /></button>
          <h2 id="pl-title" className="mkt-cal-title" style={{ textTransform: view === 'week' ? 'capitalize' : undefined }}>{title}</h2>
          <button type="button" className="mkt-btn" aria-label="Siguiente" onClick={() => step(1)}><ChevronRight size={16} /></button>
          <button type="button" className="mkt-btn" onClick={() => { setAnchor(todayKey); setSelected(todayKey); }}>Hoy</button>
          <div className="mkt-seg" role="group" aria-label="Vista">
            <button type="button" className="mkt-seg-btn" aria-pressed={view === 'month'} onClick={() => setView('month')}>Mes</button>
            <button type="button" className="mkt-seg-btn" aria-pressed={view === 'week'} onClick={() => setView('week')}>Semana</button>
          </div>
          <span style={{ flex: 1 }} />
          <Link className="btn btn-primary" href={PLAN_CONTENT_HREF}>Planear contenido</Link>
        </div>

        <div className="mkt-chips" role="group" aria-label="Filtrar por estado" style={{ marginBottom: 12 }}>
          <span className="mkt-chip-net muted" style={{ fontSize: 12, alignSelf: 'center' }}>Red: Instagram</span>
          {STATUS_FILTERS.map((f) => (
            <button key={f.id} type="button" className="mkt-chip" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}{f.id !== 'all' && counts[f.id] > 0 ? ` · ${counts[f.id]}` : ''}</button>
          ))}
        </div>

        {loading ? <SectionSkeleton rows={6} /> : view === 'month' ? (
          <MonthGrid weeks={weeks} grouped={grouped} gaps={gaps} todayKey={todayKey} selected={sel} tz={tz} onSelect={setSelected} />
        ) : (
          <WeekView keys={keys} grouped={grouped} gaps={gaps} todayKey={todayKey} selected={sel} tz={tz} onSelect={setSelected} />
        )}

        <div className="mkt-legend" style={{ marginTop: 12 }}>
          {LEGEND.map(([t, l]) => <span key={l}><span className={`mkt-dot t-${t}`} />{l}</span>)}
          <span><span className="mkt-gap-swatch" />Día sin publicar</span>
        </div>
        {data && <p className="muted" style={{ fontSize: 12, margin: '8px 0 0' }}>{inRange.length} {inRange.length === 1 ? 'publicación' : 'publicaciones'} en esta vista · {monthGaps} {monthGaps === 1 ? 'día' : 'días'} por cubrir desde hoy · zona horaria {tz}</p>}
      </section>

      {(data || failed) && <PlannerDetail dayKey={sel} posts={grouped[sel] ?? []} isGap={gaps.has(sel)} tz={tz} canWrite={canWrite && !failed} onChanged={() => void refresh()} />}
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
  if (!anchor) return <SectionSkeleton rows={6} />;
  return <PlannerBody canWrite={canWrite} anchor={anchor} setAnchor={setAnchor} tzGuess={tzGuess} />;
}
