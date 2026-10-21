'use client';

import React from 'react';
import Link from 'next/link';
import { Copy, Layers, Pencil, Play, Trash2, Zap } from 'lucide-react';
import { formatDateTime, relativeTime } from '@/lib/automation-runs';
import { lastRunBadge } from '@/lib/automation-flows';
import { zoneOption, type DisplayZone } from '@/lib/automation-prefs';
import { STATUS_LABELS, TRIGGER_META } from '@/lib/automations/ui-meta';
import type { WorkflowT } from '../types';

const STATUS_DOT: Record<string, string> = { active: 'fx-dot--ok', paused: 'fx-dot--warn', draft: '' };
const TONE_DOT: Record<string, string> = { ok: 'fx-dot--ok', danger: 'fx-dot--danger', warn: 'fx-dot--warn', muted: '' };

interface FlowRowProps {
  flow: WorkflowT;
  pending: boolean;
  showDescription: boolean;
  zone: DisplayZone;
  compact?: boolean;
  onToggle: (flow: WorkflowT) => void;
  onDuplicate: (flow: WorkflowT) => void;
  onDelete: (flow: WorkflowT) => void;
}

export function FlowRow({ flow, pending, showDescription, zone, compact = false, onToggle, onDuplicate, onDelete }: FlowRowProps) {
  const active = flow.status === 'active';
  const runs = flow._count?.runs ?? flow.runsCount ?? 0;
  const steps = flow.steps?.length ?? 0;
  const trigger = TRIGGER_META[flow.trigger?.type]?.label ?? flow.trigger?.type ?? '—';
  const href = `/automatizacion/${flow.id}`;
  const badge = lastRunBadge(flow.lastRunStatus);
  const when = flow.lastRunAt ? relativeTime(flow.lastRunAt) : null;
  const statusLabel = STATUS_LABELS[flow.status] ?? flow.status;
  const attention = badge?.tone === 'danger';
  const className = [
    'fl-row',
    'fx-reveal',
    `fl-row--${flow.status}`,
    attention ? 'fl-row--attn' : '',
    pending ? 'is-pending' : '',
    compact ? 'fl-row--compact' : '',
  ].filter(Boolean).join(' ');

  return (
    <li className={className}>
      <button
        type="button"
        role="switch"
        aria-checked={active}
        aria-label={`${active ? 'Pausar' : 'Activar'} el flujo ${flow.name}`}
        title={active ? 'Pausar' : 'Activar'}
        className="au-switch"
        onClick={() => onToggle(flow)}
        disabled={pending}
      >
        <span className="au-switch-knob" />
      </button>

      <div className="fl-main">
        <div className="fl-title-line">
          {pending ? <span className="fl-name">{flow.name}</span> : <Link href={href} className="fl-name">{flow.name}</Link>}
          <span className={`fl-pill fl-pill--${flow.status}`}>
            <span className={`fx-dot ${STATUS_DOT[flow.status] ?? ''}`} aria-hidden="true" />
            {statusLabel}
          </span>
        </div>
        {showDescription && flow.description && <p className="fl-desc">{flow.description}</p>}
        <div className="fl-meta">
          <span><Zap size={12} aria-hidden="true" /> {trigger}</span>
          <span><Layers size={12} aria-hidden="true" /> {steps} {steps === 1 ? 'paso' : 'pasos'}</span>
          <span><Play size={12} aria-hidden="true" /> {runs} {runs === 1 ? 'ejecución' : 'ejecuciones'}</span>
        </div>
      </div>

      <div className="fl-result" title={formatDateTime(flow.lastRunAt, zoneOption(zone))}>
        <span className="fl-result-kicker">Último resultado</span>
        {badge ? (
          <span className={`fl-last fl-last--${badge.tone}`}>
            <span className={`fx-dot ${TONE_DOT[badge.tone] ?? ''}`} aria-hidden="true" />
            {badge.label.replace(/^Última: /, '')}{when ? ` · ${when}` : ''}
          </span>
        ) : (
          <span className="fl-last fl-last--muted">{when ? `Última: ${when}` : 'Sin ejecutar'}</span>
        )}
      </div>

      <div className="fl-actions fx-reveal-actions">
        {!pending && (
          <Link href={href} className="au-btn au-btn--ghost au-btn--icon au-btn--sm" aria-label={`Editar ${flow.name}`} title="Editar">
            <Pencil size={14} />
          </Link>
        )}
        <button type="button" className="au-btn au-btn--ghost au-btn--icon au-btn--sm" onClick={() => onDuplicate(flow)} disabled={pending} aria-label={`Duplicar ${flow.name}`} title="Duplicar">
          <Copy size={14} />
        </button>
        <button type="button" className="au-btn au-btn--ghost au-btn--icon au-btn--sm" onClick={() => onDelete(flow)} disabled={pending} aria-label={`Eliminar ${flow.name}`} title="Eliminar">
          <Trash2 size={14} />
        </button>
      </div>
    </li>
  );
}
