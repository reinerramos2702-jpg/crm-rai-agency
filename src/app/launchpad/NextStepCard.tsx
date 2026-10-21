import React from 'react';
import Link from 'next/link';
import { Clock, PauseCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface NextStepCardProps {
  icon: LucideIcon;
  title: string;
  minutes: number;
  /** Enlace profundo al módulo donde se hace el paso. */
  href: string;
  /** Se sugiere retomar un paso pospuesto (no hay otros pendientes). */
  resumed?: boolean;
  onView: () => void;
  onSnooze?: () => void;
}

/** Tarjeta «Siguiente paso recomendado»: el primer paso pendiente que no esté pospuesto. */
export function NextStepCard({ icon: Icon, title, minutes, href, resumed = false, onView, onSnooze }: NextStepCardProps) {
  return (
    <div className="card mb-6 lp-next" data-tour="lp-next">
      <span className="lp-next-icon" aria-hidden="true">
        <Icon size={18} />
      </span>
      <div className="lp-next-body">
        <span className="lp-next-kicker">{resumed ? 'Retoma este paso' : 'Siguiente paso recomendado'}</span>
        <strong className="lp-next-title">{title}</strong>
        <span className="lp-next-meta"><Clock size={11} aria-hidden="true" /> ≈ {minutes} min</span>
      </div>
      <div className="lp-next-actions">
        <Link href={href} className="btn btn-primary btn-sm lp-next-go">Hacerlo ahora</Link>
        <button type="button" className="ghost btn-sm" onClick={onView}>Ver paso</button>
        {onSnooze && !resumed && (
          <button type="button" className="ghost btn-sm" onClick={onSnooze} title="No lo sugeriré como siguiente paso">
            <PauseCircle size={14} /> Más tarde
          </button>
        )}
      </div>
    </div>
  );
}
