'use client';

import React from 'react';
import { Calendar } from 'lucide-react';
import { CONTENT_TYPE_LABELS, DAY_STATUS_COLORS, DAY_STATUS_LABELS, PILLAR_COLORS } from './constants';
import { ContentTypeIcon } from './ContentTypeIcon';
import { fmtShortDate } from './utils';
import type { Campaign } from './types';

/** Vista previa del plan de la campaña activa: una fila por día. */
export function PlanPreview({ campaign }: { campaign: Campaign | null }) {
  return (
    <aside className="card rai-plan-side" data-tour="plan-preview" aria-label="Vista previa del plan">
      <h3 className="rai-cfg-title ig-plan-title">
        <Calendar size={15} aria-hidden="true" style={{ color: 'var(--rai-gold)' }} /> Vista previa del plan
      </h3>
      {campaign ? (
        <>
          <dl className="ig-plan-meta">
            <div><dt>Carpeta</dt><dd><code>{campaign.folderName}</code></dd></div>
            <div><dt>Período</dt><dd>{fmtShortDate(campaign.startDate)} → {fmtShortDate(campaign.endDate)}</dd></div>
          </dl>
          <ol className="ig-plan-list">
            {campaign.days.map((day) => (
              <li
                key={day.day}
                className="rai-plan-row"
                style={{ '--pc': PILLAR_COLORS[day.pillar] || 'var(--rai-muted)', '--sc': DAY_STATUS_COLORS[day.status] } as React.CSSProperties}
              >
                <span className="rai-plan-n">{String(day.day).padStart(2, '0')}</span>
                <span className="rai-plan-pillar">{day.pillar}</span>
                <span title={CONTENT_TYPE_LABELS[day.type]}><ContentTypeIcon type={day.type} size={13} /><span className="fx-sr-only">{CONTENT_TYPE_LABELS[day.type]}</span></span>
                <span className="rai-plan-hook" title={day.hook}>{day.hook}</span>
                <span className="rai-plan-dot" role="img" aria-label={DAY_STATUS_LABELS[day.status] ?? day.status} title={DAY_STATUS_LABELS[day.status]} />
              </li>
            ))}
          </ol>
        </>
      ) : (
        <div className="rai-empty-mini">
          <Calendar size={30} aria-hidden="true" />
          <p>Chatea con la IA para planear tu contenido. El plan aparecerá aquí cuando esté listo.</p>
        </div>
      )}
    </aside>
  );
}
