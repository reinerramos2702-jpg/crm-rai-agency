'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Clock, Rocket, Sparkles } from 'lucide-react';
import { SkeletonLine } from '@/components/ui/Skeleton';
import { LAUNCHPAD_STEPS, LAUNCHPAD_TOTAL, isManualStep, nextBestAction, remainingMinutes } from '@/lib/launchpad-steps';

interface NextActionCardProps {
  /** undefined mientras carga el progreso. */
  completed: string[] | undefined;
  skipped: string[];
}

/** «Siguiente mejor acción»: reutiliza el progreso real de la Guía de Inicio. */
export function NextActionCard({ completed, skipped }: NextActionCardProps) {
  if (completed === undefined) {
    return (
      <div className="dsh-card dsh-next" aria-busy="true" data-tour="dash-next">
        <SkeletonLine width={150} height={12} />
        <SkeletonLine width="80%" height={18} />
        <SkeletonLine width="100%" height={12} />
        <SkeletonLine width="60%" height={12} />
        <SkeletonLine width="100%" height={6} />
        <div className="dsh-card-foot"><SkeletonLine width={120} height={34} /></div>
      </div>
    );
  }

  const next = nextBestAction(completed, skipped);
  const done = LAUNCHPAD_STEPS.filter((st) => completed.includes(st.id)).length;
  const pct = Math.round((done / LAUNCHPAD_TOTAL) * 100);

  if (!next) {
    return (
      <div className="dsh-card dsh-next is-complete" data-tour="dash-next">
        <span className="dsh-kicker"><Sparkles size={12} aria-hidden="true" /> Guía de Inicio</span>
        <h3 className="dsh-card-title">Plataforma lista</h3>
        <p className="dsh-card-text">Completaste los {LAUNCHPAD_TOTAL} pasos. Revisa la guía cuando quieras repasar algo.</p>
        <div className="dsh-card-foot"><Link href="/launchpad" className="btn btn-secondary btn-sm">Abrir la guía</Link></div>
      </div>
    );
  }

  const { step, fromSkipped } = next;
  const auto = !isManualStep(step.id);
  return (
    <div className="dsh-card dsh-next" data-tour="dash-next">
      <span className="dsh-kicker"><Rocket size={12} aria-hidden="true" /> {fromSkipped ? 'Retoma este paso' : 'Siguiente mejor acción'}</span>
      <h3 className="dsh-card-title">{step.title}</h3>
      <p className="dsh-card-text dsh-clamp-2">{auto && step.autoHow ? step.autoHow : step.description}</p>
      <div className="dsh-next-meta">
        <span><Clock size={12} aria-hidden="true" /> ≈ {step.minutes} min</span>
        <span>{done} de {LAUNCHPAD_TOTAL} pasos · faltan ≈ {remainingMinutes(completed)} min</span>
      </div>
      <div className="dsh-progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progreso de la guía">
        <i style={{ '--w': pct / 100 } as React.CSSProperties} />
      </div>
      <div className="dsh-card-foot">
        <Link href={step.href} className="btn btn-primary btn-sm">Hacerlo ahora <ArrowRight size={14} /></Link>
        <Link href={`/launchpad?paso=${step.id}`} className="dash-link">Ver en la guía</Link>
      </div>
    </div>
  );
}
