'use client';

import React from 'react';
import Link from 'next/link';
import { SkeletonLine } from '@/components/ui/Skeleton';
import { describeActivity, relativeTime, type DashboardActivityItem } from '@/lib/dashboard-summary';

const ROWS = 8;

/** Actividad reciente del espacio de trabajo (registro de auditoría). Solo roles con acceso. */
export function ActivityFeed({ items, now }: { items: DashboardActivityItem[] | null | undefined; now: Date | null }) {
  if (items === null) return null; // el rol no ve la actividad
  const busy = items === undefined;
  return (
    <section className="dsh-section dsh-activity" data-tour="dash-activity" aria-labelledby="dsh-act-title" aria-busy={busy}>
      <div className="dsh-sec-head">
        <h2 id="dsh-act-title">Actividad reciente</h2>
        <small>Lo último que pasó en tu espacio de trabajo</small>
      </div>
      <ul className="dsh-act-list">
        {busy && Array.from({ length: ROWS }, (_, i) => (
          <li key={i} className="dsh-act-row" aria-hidden="true"><SkeletonLine width={10} height={10} /><SkeletonLine width={i % 2 ? '58%' : '72%'} height={12} /></li>
        ))}
        {items?.map((it) => {
          const d = describeActivity(it.action, it.entityType);
          const body = (
            <>
              <span className={d.tone === 'info' ? 'fx-dot' : `fx-dot fx-dot--${d.tone}`} aria-hidden="true" />
              <span className="dsh-act-text">{d.label}</span>
              <time className="dsh-act-time" dateTime={it.createdAt}>{now ? relativeTime(it.createdAt, now) : ''}</time>
            </>
          );
          return (
            <li key={it.id} className="dsh-act-row">
              {d.href ? <Link href={d.href} className="dsh-act-link">{body}</Link> : <div className="dsh-act-link">{body}</div>}
            </li>
          );
        })}
        {items && items.length === 0 && <li className="dsh-act-row dsh-muted">Aún no hay actividad registrada.</li>}
      </ul>
    </section>
  );
}
