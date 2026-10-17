import React from 'react';
import { ArrowLeft } from 'lucide-react';

/** Esqueleto del hilo con la misma estructura que el real (cabecera, burbujas y compositor). */
export function ThreadSkeleton({ onBack }: { onBack: () => void }) {
  return (
    <section className="cv-col cv-thread" aria-busy="true">
      <span className="fx-sr-only" role="status">Cargando la conversación…</span>
      <header className="cv-thread-head">
        <button type="button" className="ghost cv-icon-btn cv-back" aria-label="Volver a la lista de conversaciones" onClick={onBack}>
          <ArrowLeft size={16} aria-hidden="true" />
        </button>
        <span className="fx-shimmer cv-sk-avatar" aria-hidden="true" />
        <span className="cv-sk-lines" aria-hidden="true">
          <span className="fx-shimmer cv-sk-line" style={{ width: '38%' }} />
          <span className="fx-shimmer cv-sk-line cv-sk-line--sm" style={{ width: '56%' }} />
        </span>
      </header>
      <div className="cv-log" aria-hidden="true">
        {['58%', '44%', '66%', '40%'].map((w, i) => (
          <span key={i} className="fx-shimmer cv-sk-bubble" data-dir={i % 2 ? 'out' : 'in'} style={{ width: w }} />
        ))}
      </div>
      <div className="cv-composer" aria-hidden="true">
        <span className="fx-shimmer cv-sk-composer" />
      </div>
    </section>
  );
}
