'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { formatDateTime, relativeTime } from '@/lib/automation-runs';
import { zoneOption, type DisplayZone } from '@/lib/automation-prefs';
import { RUN_STATUS_LABELS, TRIGGER_META } from '@/lib/automations/ui-meta';
import type { TriggerType } from '@/lib/automations/types';
import type { RunT } from '../types';
import '../activity.css';

const RUN_DOT: Record<string, string> = {
  success: 'fx-dot--ok',
  error: 'fx-dot--danger',
  pending: 'fx-dot--warn',
  skipped: '',
};

const RUN_BADGE: Record<string, string> = {
  success: 'badge-success',
  error: 'badge-error',
  skipped: 'badge-muted',
  pending: 'badge-gold',
};

interface RunRowProps {
  run: RunT;
  now: Date;
  zone: DisplayZone;
  expanded: boolean;
  onToggle: (id: string) => void;
}

export function RunRow({ run, now, zone, expanded, onToggle }: RunRowProps) {
  const log = run.result?.log ?? [];
  const hasDetail = log.length > 0 || !!run.error;
  const triggerType = run.trigger?.type ?? null;
  const triggerLabel = triggerType ? TRIGGER_META[triggerType as TriggerType]?.label ?? triggerType : null;
  const statusLabel = RUN_STATUS_LABELS[run.status] ?? run.status;
  const sub = [triggerLabel, run.contactName].filter(Boolean).join(' · ');

  return (
    <li className={`ac-row${run.status === 'error' ? ' is-error' : ''}`}>
      <div className="ac-line">
        <span className={`fx-dot ${RUN_DOT[run.status] ?? ''}`} role="img" aria-label={statusLabel} />
        <div className="ac-main">
          <Link href={`/automatizacion/${run.workflow.id}`} className="ac-flow">{run.workflow.name || '—'}</Link>
          {sub && <p className="ac-sub">{sub}</p>}
        </div>
        <span className={`ac-badge ${RUN_BADGE[run.status] ?? 'badge-muted'}`}>{statusLabel}</span>
        <time className="ac-time" dateTime={run.createdAt} title={formatDateTime(run.createdAt, zoneOption(zone))}>
          {relativeTime(run.createdAt, now)}
        </time>
        <span className="ac-toggle-slot">
          {hasDetail && (
            <button
              type="button"
              className="ac-toggle au-btn au-btn--ghost au-btn--sm"
              aria-expanded={expanded}
              aria-controls={`run-${run.id}`}
              onClick={() => onToggle(run.id)}
            >
              Detalle <ChevronDown size={14} />
            </button>
          )}
        </span>
      </div>
      {expanded && hasDetail && (
        <div id={`run-${run.id}`} className="ac-detail fx-field-in">
          {log.length > 0 && (
            <ul className="ac-log">
              {log.map((entry, i) => (
                <li key={i}>
                  <span className={`fx-dot ${entry.ok ? 'fx-dot--ok' : 'fx-dot--danger'}`} role="img" aria-label={entry.ok ? 'Correcto' : 'Con error'} />
                  <span>
                    <span className="ac-log-step">{entry.step}: </span>
                    <span className="ac-log-detail">{entry.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {run.error && <p className="ac-err">Error: {run.error}</p>}
          <p className="ac-exact">{formatDateTime(run.createdAt, zoneOption(zone))}</p>
        </div>
      )}
    </li>
  );
}
