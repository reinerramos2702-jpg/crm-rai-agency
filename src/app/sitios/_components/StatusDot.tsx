import React from 'react';
import { SITE_STATUS_LABELS, ROOM_STATUS_LABELS } from '@/components/hotel/StatusBadges';
import { statusTone } from './site-model';

/** Punto de estado con texto visible (el color nunca es el único indicador). */
export function StatusPill({ status, kind = 'site' }: { status: string; kind?: 'site' | 'room' }) {
  const labels = kind === 'site' ? SITE_STATUS_LABELS : ROOM_STATUS_LABELS;
  return (
    <span className="st-pill" data-tone={statusTone(status)}>
      <span className="fx-dot st-dot" aria-hidden="true" />
      {labels[status] ?? status}
    </span>
  );
}
