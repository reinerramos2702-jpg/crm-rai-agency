import React from 'react';
import { Bot, PhoneCall } from 'lucide-react';

interface Props {
  variant: 'chat' | 'voice';
  name: string;
  chips: string[];
  bubbleLabel: string;
  bubble: string;
  footnote?: string;
}

/** Vista previa viva del agente mientras se completa el asistente. */
export function WizardAside({ variant, name, chips, bubbleLabel, bubble, footnote }: Props) {
  const Icon = variant === 'voice' ? PhoneCall : Bot;
  return (
    <>
      <div className="card" style={{ display: 'grid', gap: 12 }}>
        <div className="row" style={{ gap: 10 }}>
          <span className="ag-kpi-icon" style={{ color: 'var(--ag-accent)', background: 'color-mix(in srgb, var(--ag-accent) 14%, transparent)' }} aria-hidden="true"><Icon size={16} /></span>
          <strong style={{ overflowWrap: 'anywhere' }}>{name.trim() || 'Agente sin nombre'}</strong>
        </div>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {chips.map((c) => <span key={c} className="badge-muted" style={{ fontSize: 11 }}>{c}</span>)}
        </div>
        <div>
          <span className="label">{bubbleLabel}</span>
          <div className="ag-bubble" style={{ marginTop: 6 }}>{bubble.trim() || '—'}</div>
        </div>
      </div>
      {footnote && <p className="ag-hint">{footnote}</p>}
    </>
  );
}
