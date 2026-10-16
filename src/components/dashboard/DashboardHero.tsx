'use client';

import React from 'react';
import Link from 'next/link';
import { PlusCircle, Instagram, CalendarDays, MessageSquare, ArrowUpRight } from 'lucide-react';

interface Props {
  displayName: string | null;
  workspaceName: string | null;
  campaigns: number;
  activeFlows: number;
}

function greeting(d: Date): string {
  const h = d.getHours();
  if (h < 6) return 'Buenas noches';
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

const ACTIONS = [
  { href: '/campaign/new', label: 'Nueva campaña', hint: 'La IA genera hasta 31 días', icon: PlusCircle, tone: 'gold' },
  { href: '/automatizacion', label: 'Contenido Instagram', hint: 'Planea, programa y publica', icon: Instagram, tone: 'purple' },
  { href: '/calendarios', label: 'Calendarios', hint: 'Citas y reservas', icon: CalendarDays, tone: 'teal' },
  { href: '/conversaciones', label: 'Conversaciones', hint: 'Responde a tus clientes', icon: MessageSquare, tone: 'gold' },
] as const;

/** Cabecera del dashboard: saludo contextual + accesos rápidos a lo que más se usa. */
export function DashboardHero({ displayName, workspaceName, campaigns, activeFlows }: Props) {
  const now = new Date();
  const first = displayName?.trim().split(/\s+/)[0] ?? '';
  const date = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' }).format(now);

  return (
    <section className="dash-hero" aria-labelledby="dash-hero-title">
      <div className="dash-hero-top">
        <span className="rai-eyebrow">{date}</span>
        <h2 id="dash-hero-title" className="dash-hero-title">
          {greeting(now)}{first ? `, ${first}` : ''}
        </h2>
        <p className="dash-hero-sub">
          {workspaceName ? <><b>{workspaceName}</b> · </> : null}
          {campaigns === 0
            ? 'Empieza creando tu primera campaña: en minutos tienes un mes de contenido listo.'
            : `${campaigns} campaña${campaigns === 1 ? '' : 's'}${activeFlows > 0 ? ` y ${activeFlows} automatización${activeFlows === 1 ? '' : 'es'} activa${activeFlows === 1 ? '' : 's'}` : ''} trabajando para ti.`}
        </p>
      </div>
      <nav className="dash-actions" data-tour="dash-actions" aria-label="Accesos rápidos">
        {ACTIONS.map((a) => {
          const Icon = a.icon;
          return (
            <Link key={a.href} href={a.href} className={`dash-action is-${a.tone}`}>
              <span className="dash-action-ico"><Icon size={18} /></span>
              <span className="dash-action-text"><strong>{a.label}</strong><small>{a.hint}</small></span>
              <ArrowUpRight size={15} className="dash-action-arrow" aria-hidden="true" />
            </Link>
          );
        })}
      </nav>
    </section>
  );
}
