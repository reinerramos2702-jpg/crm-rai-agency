'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Loader2, SearchX } from 'lucide-react';
import toast from 'react-hot-toast';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonLine } from '@/components/ui/Skeleton';
import {
  DEFAULT_RUN_FILTERS,
  buildRunsCsv,
  buildRunsUrl,
  groupByDay,
  hasActiveFilters,
  runsCsvFileName,
  type RunFilters,
} from '@/lib/automation-runs';
import { RUN_STATUS_LABELS } from '@/lib/automations/ui-meta';
import { ActivityFilters } from '../components/ActivityFilters';
import { ActivitySummary } from '../components/ActivitySummary';
import { RunRow } from '../components/RunRow';
import { isRunsPayload } from '../guards';
import { RUNS_PAGE_SIZE, type RunT, type WorkflowT } from '../types';
import { useAutomationPrefs } from '../use-automation-prefs';
import { useRuns } from '../use-runs';

const EXPORT_PAGE = 100;
const EXPORT_MAX_PAGES = 5;

interface ActivityTabProps {
  workflows: WorkflowT[];
}

async function downloadCsv(filters: RunFilters): Promise<number> {
  const rows: RunT[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < EXPORT_MAX_PAGES; page += 1) {
    const res: Response = await fetch(buildRunsUrl(filters, { limit: EXPORT_PAGE, cursor }));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: unknown = await res.json();
    if (!isRunsPayload(data)) throw new Error('Respuesta inesperada');
    rows.push(...data.runs);
    cursor = data.nextCursor;
    if (!cursor) break;
  }
  const url = URL.createObjectURL(new Blob([buildRunsCsv(rows, RUN_STATUS_LABELS)], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = runsCsvFileName();
  link.click();
  URL.revokeObjectURL(url);
  return rows.length;
}

export default function ActivityTab({ workflows }: ActivityTabProps) {
  const { prefs } = useAutomationPrefs();
  const [filters, setFilters] = useState<RunFilters>(DEFAULT_RUN_FILTERS);
  // El «ahora» de la consulta solo cambia con los filtros: así la URL (y su caché) no cambia cada minuto.
  const [anchor, setAnchor] = useState(() => new Date());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [exporting, setExporting] = useState(false);

  const url = useMemo(() => buildRunsUrl(filters, { limit: RUNS_PAGE_SIZE, now: anchor }), [filters, anchor]);
  const moreUrl = useCallback((cursor: string) => buildRunsUrl(filters, { limit: RUNS_PAGE_SIZE, cursor, now: anchor }), [filters, anchor]);
  const data = useRuns(url, moreUrl);
  const { refresh } = data;

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

  const change = useCallback((patch: Partial<RunFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setAnchor(new Date());
    setExpanded(null);
  }, []);

  const groups = useMemo(() => groupByDay(data.runs, now), [data.runs, now]);
  const filtering = hasActiveFilters(filters);
  const toggleRow = useCallback((id: string) => setExpanded((cur) => (cur === id ? null : id)), []);
  const syncing = data.revalidating && !data.loading;

  async function loadMore() {
    try {
      await data.loadMore();
    } catch {
      toast.error('No se pudieron cargar más ejecuciones.');
    }
  }

  async function exportCsv() {
    if (exporting) return;
    setExporting(true);
    try {
      const n = await downloadCsv(filters);
      toast.success(n === 0 ? 'No había ejecuciones que exportar.' : `${n} ${n === 1 ? 'ejecución exportada' : 'ejecuciones exportadas'}.`);
    } catch {
      toast.error('No se pudo exportar. Inténtalo de nuevo.');
    } finally {
      setExporting(false);
    }
  }

  let body: React.ReactNode;
  if (data.loading) {
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
  } else if (data.error && data.runs.length === 0) {
    body = (
      <div className="au-error" role="alert">
        No se pudo cargar la actividad.
        <button type="button" className="au-btn au-btn--sm" onClick={() => void refresh()}>Reintentar</button>
      </div>
    );
  } else if (data.runs.length === 0) {
    body = filtering ? (
      <EmptyState
        icon={SearchX}
        title="Nada con estos filtros"
        text="No hay ejecuciones con ese estado, flujo y periodo. Prueba con otros valores."
        action={<button type="button" className="au-btn au-btn--soft" onClick={() => change(DEFAULT_RUN_FILTERS)}>Limpiar filtros</button>}
      />
    ) : (
      <EmptyState
        icon={Activity}
        title="Aún no hay ejecuciones"
        text="Activa un flujo y dispara su evento (o espera la próxima corrida programada) para ver aquí qué pasó y cuándo."
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
            {data.runs.length} {data.runs.length === 1 ? 'ejecución cargada' : 'ejecuciones cargadas'}
            {data.nextCursor ? ' · hay más' : ''}
          </p>
          {data.nextCursor && (
            <button type="button" className="au-btn au-btn--soft" onClick={() => void loadMore()} disabled={data.loadingMore}>
              {data.loadingMore ? <Loader2 size={14} className="au-spin" /> : null} Cargar {RUNS_PAGE_SIZE} más
            </button>
          )}
        </div>
      </>
    );
  }

  return (
    <div className={`ac-wrap fx-sync${syncing ? ' is-syncing' : ''}`} data-tour="activity">
      <ActivitySummary summary={data.summary} />
      <ActivityFilters
        filters={filters}
        onChange={change}
        workflows={workflows}
        counts={data.summary}
        syncing={data.revalidating}
        exporting={exporting}
        filtering={filtering}
        onClear={() => change(DEFAULT_RUN_FILTERS)}
        onRefresh={() => void refresh()}
        onExport={() => void exportCsv()}
      />
      {data.error && data.runs.length > 0 && (
        <div className="fl-banner" role="alert">
          <AlertTriangle size={16} aria-hidden="true" style={{ color: 'var(--rai-warning)' }} />
          <span>No se pudo actualizar la actividad; ves la última versión conocida.</span>
          <button type="button" className="au-btn au-btn--sm" onClick={() => void refresh()}>Reintentar</button>
        </div>
      )}
      <div className={data.stale ? 'ac-stale' : undefined} aria-busy={data.stale}>{body}</div>
    </div>
  );
}
