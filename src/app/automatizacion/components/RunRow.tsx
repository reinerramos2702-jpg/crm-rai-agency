'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronDown, Copy, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDateTime, friendlyRunError, humanizeDetail, relativeTime } from '@/lib/automation-runs';
import { zoneOption, type DisplayZone } from '@/lib/automation-prefs';
import { RUN_STATUS_LABELS, TRIGGER_META } from '@/lib/automations/ui-meta';
import { isTriggerType } from '../guards';
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
  const triggerLabel = triggerType ? (isTriggerType(triggerType) ? TRIGGER_META[triggerType].label : triggerType) : null;
  const statusLabel = RUN_STATUS_LABELS[run.status] ?? run.status;
  const sub = [triggerLabel, run.contactName].filter(Boolean).join(' · ');
  const error = friendlyRunError(run.error);
  const failedSteps = log.filter((l) => !l.ok).length;

  const copySummary = async () => {
    const lines = [
      `Flujo: ${run.workflow.name}`,
      `Estado: ${statusLabel}`,
      `Fecha: ${formatDateTime(run.createdAt, zoneOption(zone))}`,
      ...(error ? [`Error: ${error}`] : []),
      ...log.map((l, i) => `${i + 1}. ${l.ok ? 'OK' : 'ERROR'} — ${humanizeDetail(l.detail)}`),
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      toast.success('Resumen copiado.');
    } catch {
      toast.error('No se pudo copiar. Selecciona el texto manualmente.');
    }
  };

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
          {error && <p className="ac-err" role="alert">{error}</p>}
          {log.length > 0 && (
            <>
              <p className="ac-detail-title">
                {log.length} {log.length === 1 ? 'paso' : 'pasos'}
                {failedSteps > 0 ? ` · ${failedSteps} con error` : ' · todos correctos'}
              </p>
              <ol className="ac-log">
                {log.map((entry, i) => (
                  <li key={i}>
                    <span className={`fx-dot ${entry.ok ? 'fx-dot--ok' : 'fx-dot--danger'}`} role="img" aria-label={entry.ok ? 'Correcto' : 'Con error'} />
                    <span>
                      <span className="ac-log-step">{i + 1}. {entry.step}: </span>
                      <span className="ac-log-detail" title={entry.detail}>{humanizeDetail(entry.detail)}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </>
          )}
          <div className="ac-detail-foot">
            <span className="ac-exact">{formatDateTime(run.createdAt, zoneOption(zone))}</span>
            <span className="ac-detail-actions">
              <button type="button" className="au-btn au-btn--ghost au-btn--sm" onClick={() => void copySummary()}>
                <Copy size={13} /> Copiar resumen
              </button>
              <Link href={`/automatizacion/${run.workflow.id}`} className="au-btn au-btn--soft au-btn--sm">
                <ExternalLink size={13} /> Abrir flujo
              </Link>
            </span>
          </div>
        </div>
      )}
    </li>
  );
}
