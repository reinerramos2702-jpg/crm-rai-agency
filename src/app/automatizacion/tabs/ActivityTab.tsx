'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Loader2, RefreshCw, SearchX } from 'lucide-react';
import toast from 'react-hot-toast';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonLine } from '@/components/ui/Skeleton';
import { useCachedJson } from '@/lib/use-cached-json';
import {
  DEFAULT_RUN_FILTERS,
  countByStatus,
  filterRuns,
  groupByDay,
  hasActiveFilters,
  mergeRuns,
  type RunRange,
  type RunStatusFilter,
} from '@/lib/automation-runs';
import { RunRow } from '../components/RunRow';
import { RUNS_PAGE_SIZE, RUNS_URL, type RunT, type RunsPayload, type WorkflowT } from '../types';
import { useAutomationPrefs } from '../use-automation-prefs';
import '../activity.css';

const STATUS_CHIPS: { id: RunStatusFilter; label: string }[] = [
  { id: 'todos', label: 'Todas' },
  { id: 'success', label: 'Exitosas' },
  { id: 'error', label: 'Con error' },
  { id: 'skipped', label: 'Omitidas' },
  { id: 'pending', label: 'Pendientes' },
];

const RANGES: { id: RunRange; label: string }[] = [
  { id: 'todo', label: 'Todo el historial' },
  { id: 'hoy', label: 'Hoy' },
  { id: '7d', label: 'Últimos 7 días' },
  { id: '30d', label: 'Últimos 30 días' },
];

interface ActivityTabProps {
  workflows: WorkflowT[];
}

export default function ActivityTab({ workflows }: ActivityTabProps) {
  const { prefs } = useAutomationPrefs();
  const first = useCachedJson<RunsPayload>(RUNS_URL, { ttlMs: 15_000 });
  const { refresh } = first;
  const [more, setMore] = useState<RunT[]>([]);
  const [moreCursor, setMoreCursor] = useState<string | null | undefined>(undefined);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_RUN_FILTERS);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (prefs.activityRefresh === 0) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, prefs.activityRefresh * 1000);
    return () => window.clearInterval(id);
  }, [prefs.activityRefresh, refresh]);

  const runs = useMemo(() => mergeRuns(first.data?.runs ?? [], more), [first.data, more]);
  const nextCursor = moreCursor !== undefined ? moreCursor : first.data?.nextCursor ?? null;
  const filtered = useMemo(() => filterRuns(runs, filters, now), [runs, filters, now]);
  const groups = useMemo(() => groupByDay(filtered, now), [filtered, now]);
  const counts = useMemo(() => countByStatus(runs), [runs]);
  const filtering = hasActiveFilters(filters);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`${RUNS_URL}&cursor=${encodeURIComponent(nextCursor)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const page = (await res.json()) as RunsPayload;
      setMore((prev) => mergeRuns(prev, page.runs));
      setMoreCursor(page.nextCursor);
    } catch {
      toast.error('No se pudieron cargar más ejecuciones.');
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore]);

  const toggleRow = useCallback((id: string) => setExpanded((cur) => (cur === id ? null : id)), []);
  const syncing = first.revalidating && !first.loading;

  let body: React.ReactNode;
  if (first.loading) {
    body = (
      <div aria-busy="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="ac-skel">
            <span className="fx-dot" aria-hidden="true" />
            <div className="ac-skel-text">
              <SkeletonLine width={`${45 + (i % 3) * 14}%`} />
              <SkeletonLine width="30%" height={10} />
            </div>
            <SkeletonLine width={64} />
          </div>
        ))}
      </div>
    );
  } else if (first.error && runs.length === 0) {
    body = (
      <div className="au-error" role="alert">
        No se pudo cargar la actividad.
        <button type="button" className="au-btn au-btn--sm" onClick={() => void refresh()}>Reintentar</button>
      </div>
    );
  } else if (runs.length === 0) {
    body = (
      <EmptyState
        icon={Activity}
        title="Aún no hay ejecuciones"
        text="Activa un flujo y dispara su evento (o espera la próxima corrida programada) para ver aquí qué pasó y cuándo."
      />
    );
  } else if (filtered.length === 0) {
    body = (
      <EmptyState
        icon={SearchX}
        title="Nada con estos filtros"
        text={nextCursor ? 'Los filtros se aplican a las ejecuciones ya cargadas. Carga más o cambia los filtros.' : 'Prueba con otro estado, flujo o periodo.'}
        action={
          <>
            <button type="button" className="au-btn au-btn--soft" onClick={() => setFilters(DEFAULT_RUN_FILTERS)}>Limpiar filtros</button>
            {nextCursor && (
              <button type="button" className="au-btn" onClick={() => void loadMore()} disabled={loadingMore}>
                {loadingMore ? <Loader2 size={14} className="au-spin" /> : null} Cargar más
              </button>
            )}
          </>
        }
      />
    );
  } else {
    body = (
      <>
        {groups.map((group) => (
          <section key={group.key} aria-label={group.label}>
            <h3 className="ac-day">{group.label}</h3>
            <ul className="ac-list">
              {group.runs.map((run) => (
                <RunRow key={run.id} run={run} now={now} zone={prefs.displayZone} expanded={expanded === run.id} onToggle={toggleRow} />
              ))}
            </ul>
          </section>
        ))}
        <div className="ac-foot">
          <p className="au-note" role="status">
            {filtering ? `${filtered.length} de ${runs.length} ejecuciones cargadas` : `${runs.length} ${runs.length === 1 ? 'ejecución' : 'ejecuciones'}`}
            {nextCursor && filtering ? ' · los filtros usan lo ya cargado' : ''}
          </p>
          {nextCursor && (
            <button type="button" className="au-btn au-btn--soft" onClick={() => void loadMore()} disabled={loadingMore}>
              {loadingMore ? <Loader2 size={14} className="au-spin" /> : null} Cargar {RUNS_PAGE_SIZE} más
            </button>
          )}
        </div>
      </>
    );
  }

  return (
    <div className={`ac-wrap fx-sync${syncing ? ' is-syncing' : ''}`} data-tour="activity">
      <div className="ac-filters">
        <div className="au-chips" role="group" aria-label="Filtrar por estado">
          {STATUS_CHIPS.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className="au-chip"
              aria-pressed={filters.status === chip.id}
              onClick={() => setFilters((f) => ({ ...f, status: chip.id }))}
            >
              {chip.label} <span className="au-chip-n">{counts[chip.id]}</span>
            </button>
          ))}
        </div>
        <div className="ac-selects">
          <label className="au-field">
            <span>Flujo</span>
            <select className="au-select ac-select-flow" value={filters.workflowId} onChange={(e) => setFilters((f) => ({ ...f, workflowId: e.target.value }))}>
              <option value="">Todos los flujos</option>
              {workflows.filter((w) => !w.id.startsWith('tmp-')).map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </label>
          <label className="au-field">
            <span>Periodo</span>
            <select className="au-select" value={filters.range} onChange={(e) => setFilters((f) => ({ ...f, range: e.target.value as RunRange }))}>
              {RANGES.map((r) => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
          </label>
          <button type="button" className="au-btn au-btn--ghost au-btn--icon" onClick={() => void refresh()} aria-label="Actualizar actividad" title="Actualizar" disabled={first.revalidating}>
            <RefreshCw size={15} className={syncing ? 'au-spin' : undefined} />
          </button>
        </div>
      </div>
      {body}
    </div>
  );
}
