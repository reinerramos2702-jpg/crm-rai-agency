'use client';

import React from 'react';
import Link from 'next/link';
import { Activity, ArrowRight } from 'lucide-react';
import { formatDateTime, friendlyRunError, relativeTime } from '@/lib/automation-runs';
import { zoneOption, type DisplayZone } from '@/lib/automation-prefs';
import { RUN_STATUS_LABELS } from '@/lib/automations/ui-meta';
import type { DetailRun } from './types';

const DOT: Record<string, string> = { success: 'fx-dot--ok', error: 'fx-dot--danger', pending: 'fx-dot--warn', skipped: '' };

/** Últimas ejecuciones del flujo (la API devuelve estado, error y fecha; el detalle paso a paso está en Actividad). */
export function RunsPanel({ runs, zone }: { runs: DetailRun[]; zone: DisplayZone }) {
  return (
    <aside className="card bd-runs" aria-labelledby="bd-runs-title">
      <h2 id="bd-runs-title" className="bd-runs-title"><Activity size={15} aria-hidden="true" /> Ejecuciones recientes</h2>
      {runs.length === 0 ? (
        <p className="bd-help">Aún no hay ejecuciones para este flujo. Cuando se dispare, aparecerán aquí.</p>
      ) : (
        <ol className="bd-runs-list">
          {runs.map((r) => {
            const error = friendlyRunError(r.error);
            return (
              <li key={r.id} className="bd-run">
                <span className={`fx-dot ${DOT[r.status] ?? ''}`} aria-hidden="true" />
                <div className="bd-run-main">
                  <span className="bd-run-status">{RUN_STATUS_LABELS[r.status] ?? r.status}</span>
                  <time className="bd-run-time" dateTime={r.createdAt} title={formatDateTime(r.createdAt, zoneOption(zone))}>
                    {relativeTime(r.createdAt)}
                  </time>
                  {error && <p className="bd-run-error">{error}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <Link href="/automatizacion?tab=actividad" className="bd-runs-link">
        Ver toda la actividad <ArrowRight size={13} aria-hidden="true" />
      </Link>
    </aside>
  );
}
