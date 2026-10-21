import React from 'react';

interface SkeletonLineProps {
  /** Ancho CSS (número = px). Por defecto, 100 %. */
  width?: number | string;
  /** Alto en px. */
  height?: number;
  className?: string;
}

/** Línea de esqueleto con barrido de brillo (`.fx-shimmer`). Decorativa: oculta a lectores de pantalla. */
export function SkeletonLine({ width = '100%', height, className = '' }: SkeletonLineProps) {
  return (
    <span
      className={`fx-shimmer fx-skel-line ${className}`.trim()}
      style={{ width, ...(height ? { height } : null) }}
      aria-hidden="true"
    />
  );
}

interface SkeletonCardProps {
  /** Número de líneas (la última es más corta). Por defecto, 3. */
  lines?: number;
  className?: string;
}

const WIDTHS: Array<number | string> = ['100%', '85%', '60%'];

/** Tarjeta de esqueleto: contenedor `aria-busy` con un aviso accesible de carga. */
export function SkeletonCard({ lines = 3, className = '' }: SkeletonCardProps) {
  const count = Math.max(1, Math.floor(lines));
  return (
    <div className={`card fx-skel-card ${className}`.trim()} aria-busy="true" role="status">
      <span className="fx-sr-only">Cargando…</span>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonLine
          key={i}
          width={i === count - 1 && count > 1 ? WIDTHS[2] : WIDTHS[i % 2]}
        />
      ))}
    </div>
  );
}
