import React from 'react';

/** Esqueleto de la lista con las medidas reales de una fila (68 px): al llegar los datos no hay saltos. */
export function ListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="cv-list-skel" aria-busy="true" role="status">
      <span className="fx-sr-only">Cargando conversaciones…</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="cv-row-skel" aria-hidden="true">
          <span className="fx-shimmer cv-sk-avatar" />
          <span className="cv-sk-lines">
            <span className="fx-shimmer cv-sk-line" style={{ width: `${58 + ((i * 13) % 30)}%` }} />
            <span className="fx-shimmer cv-sk-line cv-sk-line--sm" style={{ width: `${40 + ((i * 17) % 45)}%` }} />
          </span>
        </div>
      ))}
    </div>
  );
}
