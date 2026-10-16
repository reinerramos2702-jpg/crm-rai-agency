'use client';

import Link from 'next/link';
import { AlertTriangle, CheckCircle2, CircleDashed, HelpCircle } from 'lucide-react';
import type { ReadinessItem, ReadinessStatus } from '@/lib/campaign-readiness';

const STATUS_ICON = {
  ok: CheckCircle2,
  warn: AlertTriangle,
  pending: CircleDashed,
  unknown: HelpCircle,
} as const;

const STATUS_LABEL: Record<ReadinessStatus, string> = {
  ok: 'Listo',
  warn: 'Requiere atención',
  pending: 'Verificando',
  unknown: 'No verificable',
};

interface ReadinessChecklistProps {
  items: ReadinessItem[];
  onAction: (action: NonNullable<ReadinessItem['action']>) => void;
}

/** Lista de requisitos antes de generar, cada uno con el enlace o acción para resolverlo. */
export function ReadinessChecklist({ items, onAction }: ReadinessChecklistProps) {
  return (
    <ul className="cn-check" aria-label="Preparación antes de generar">
      {items.map((it) => {
        const Icon = STATUS_ICON[it.status];
        return (
          <li key={it.id} className={`cn-check-row is-${it.status}`}>
            <span className="cn-check-icon" role="img" aria-label={STATUS_LABEL[it.status]}>
              <Icon size={15} />
            </span>
            <span className="cn-check-body">
              <span className="cn-check-label">{it.label}</span>
              <span className="cn-check-detail">{it.detail}</span>
            </span>
            {it.cta && it.href && (
              <Link href={it.href} className="cn-mini-link">
                {it.cta}
              </Link>
            )}
            {it.cta && it.action && (
              <button type="button" className="cn-mini-btn" onClick={() => onAction(it.action!)}>
                {it.cta}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
