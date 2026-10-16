import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface NextStepCardProps {
  icon: LucideIcon;
  title: string;
  onView: () => void;
}

/** Tarjeta «Siguiente paso recomendado»: el primer paso pendiente de la guía. */
export function NextStepCard({ icon: Icon, title, onView }: NextStepCardProps) {
  return (
    <div className="card mb-6 lp-next" data-tour="lp-next">
      <span className="lp-next-icon" aria-hidden="true">
        <Icon size={18} />
      </span>
      <div className="lp-next-body">
        <span className="lp-next-kicker">Siguiente paso recomendado</span>
        <strong className="lp-next-title">{title}</strong>
      </div>
      <button type="button" className="primary lp-next-cta" onClick={onView}>
        Ver paso
      </button>
    </div>
  );
}
