'use client';

import React from 'react';
import { firstName, greetingFor } from '@/lib/dashboard-summary';

interface HeroProps {
  displayName: string | null;
  workspaceName: string | null;
  /** Frase de «lo de hoy»; null mientras no hay datos. */
  headline: string | null;
  /** Hora local; null en el servidor y en el primer render (hidratación). */
  now: Date | null;
}

/** Cabecera: saludo por hora con el nombre real y una frase con lo que pide atención hoy. */
export function Hero({ displayName, workspaceName, headline, now }: HeroProps) {
  const name = firstName(displayName);
  const date = now ? new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' }).format(now) : '';
  return (
    <section className="dash-hero dsh-hero" aria-labelledby="dash-hero-title">
      <span className="rai-eyebrow dsh-hero-date">{date || ' '}</span>
      <h2 id="dash-hero-title" className="dash-hero-title">
        {now ? greetingFor(now.getHours()) : 'Hola'}{name ? `, ${name}` : ''}
      </h2>
      <p className="dash-hero-sub dsh-hero-sub">
        {workspaceName ? <><b>{workspaceName}</b> · </> : null}
        {headline ?? ' '}
      </p>
    </section>
  );
}
