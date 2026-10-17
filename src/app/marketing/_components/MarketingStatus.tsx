import React from 'react';
import type { MarketingSummary } from './shared';

type Tone = 'ok' | 'warn' | 'live';

function Pill({ tone, label, detail }: { tone: Tone; label: string; detail: string }) {
  return (
    <span className="mkt-pill">
      <span className={`fx-dot fx-dot--${tone}`} aria-hidden="true" />
      {label}
      <small>{detail}</small>
    </span>
  );
}

/** Estado de las conexiones que condicionan las herramientas: publicación y claves de IA. */
export function MarketingStatus({ summary }: { summary: MarketingSummary }) {
  const live = summary.publishMode === 'live';
  return (
    <div className="mkt-status" aria-label="Estado de las conexiones">
      <Pill tone={live ? 'live' : 'warn'} label="Publicación" detail={live ? 'en vivo' : 'simulada'} />
      <Pill tone={summary.providers.anthropic ? 'ok' : 'warn'} label="Anthropic" detail={summary.providers.anthropic ? 'conectada' : 'sin clave'} />
      <Pill tone={summary.providers.google ? 'ok' : 'warn'} label="Google" detail={summary.providers.google ? 'conectada' : 'sin clave'} />
    </div>
  );
}
