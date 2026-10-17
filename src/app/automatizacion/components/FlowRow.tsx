'use client';

import React from 'react';
import Link from 'next/link';
import { Copy, Pencil, Trash2, Zap } from 'lucide-react';
import { formatDateTime, relativeTime } from '@/lib/automation-runs';
import { lastRunBadge } from '@/lib/automation-flows';
import { zoneOption, type DisplayZone } from '@/lib/automation-prefs';
import { STATUS_LABELS, TRIGGER_META } from '@/lib/automations/ui-meta';
import type { WorkflowT } from '../types';
import '../flows.css';

const DOT: Record<string, string> = { active: 'fx-dot--ok', paused: 'fx-dot--warn', draft: '' };

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
  const trigger = TRIGGER_META[flow.trigger?.type]?.label ?? flow.trigger?.type ?? '—';
  const href = `/automatizacion/${flow.id}`;
  const badge = lastRunBadge(flow.lastRunStatus);
  const when = flow.lastRunAt ? relativeTime(flow.lastRunAt) : null;

  return (
    <li className={`fl-row fx-reveal${pending ? ' is-pending' : ''}${compact ? ' fl-row--compact' : ''}`}>
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
        {pending ? <span className="fl-name">{flow.name}</span> : <Link href={href} className="fl-name">{flow.name}</Link>}
        {showDescription && flow.description && <p className="fl-desc">{flow.description}</p>}
        <div className="fl-meta">
          <span><Zap size={12} aria-hidden="true" /> {trigger}</span>
          <span>{flow.steps?.length ?? 0} pasos</span>
          <span>{runs} {runs === 1 ? 'ejecución' : 'ejecuciones'}</span>
          <span className={badge ? `fl-last fl-last--${badge.tone}` : undefined} title={formatDateTime(flow.lastRunAt, zoneOption(zone))}>
            {badge && <span className={`fx-dot ${badge.tone === 'ok' ? 'fx-dot--ok' : badge.tone === 'danger' ? 'fx-dot--danger' : badge.tone === 'warn' ? 'fx-dot--warn' : ''}`} aria-hidden="true" />}
            {badge ? `${badge.label}${when ? ` · ${when}` : ''}` : when ? `Última: ${when}` : 'Sin ejecutar'}
          </span>
        </div>
      </div>
      <span className="fl-status">
        <span className={`fx-dot ${DOT[flow.status] ?? ''}`} aria-hidden="true" />
        {STATUS_LABELS[flow.status] ?? flow.status}
      </span>
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
