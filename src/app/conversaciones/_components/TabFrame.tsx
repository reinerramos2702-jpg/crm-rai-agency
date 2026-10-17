import React from 'react';
import { InlineError } from './InlineError';

/** Marco común de las pestañas secundarias: texto de ayuda y contenido en un único scroll. */
export function TabFrame({ intro, children }: { intro: string; children: React.ReactNode }) {
  return (
    <div className="cv-scroll">
      <div className="cv-tab-content">
        <p className="cv-intro">{intro}</p>
        {children}
      </div>
    </div>
  );
}

export function CardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="cv-cards" aria-busy="true" role="status">
      <span className="fx-sr-only">Cargando…</span>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card cv-card-skel" aria-hidden="true">
          <span className="fx-shimmer cv-sk-line" style={{ width: '50%' }} />
          <span className="fx-shimmer cv-sk-line" />
          <span className="fx-shimmer cv-sk-line cv-sk-line--sm" style={{ width: '30%' }} />
        </div>
      ))}
    </div>
  );
}

/** Carga / error / vacío de una lista secundaria; si hay datos, pinta los hijos. */
export function ListState({
  loading, error, hasData, count, emptyText, onRetry, children,
}: {
  loading: boolean;
  error: string | null;
  hasData: boolean;
  count: number;
  emptyText: string;
  onRetry: () => void;
  children: React.ReactNode;
}) {
  if (loading) return <CardsSkeleton />;
  if (error && !hasData) return <InlineError title="No se pudo cargar" message={error} onRetry={onRetry} />;
  return (
    <>
      {error && <InlineError compact title="No se pudo actualizar" message={error} onRetry={onRetry} />}
      {count === 0 ? <p className="cv-empty-card card">{emptyText}</p> : children}
    </>
  );
}
