import React from 'react';
import { SkeletonCard, SkeletonLine } from './Skeleton';

interface PageSkeletonProps {
  /** Título real del módulo: se muestra al instante en lugar de una barra. */
  title?: string;
  /** Subtítulo real (opcional). */
  subtitle?: string;
  /** Número de tarjetas de la fila superior. Por defecto, 3. */
  cards?: number;
  /** Filas del bloque de lista inferior. Por defecto, 5. 0 lo oculta. */
  rows?: number;
  /** Contenedor estrecho (páginas tipo formulario). */
  narrow?: boolean;
}

/**
 * Esqueleto de página para los `loading.tsx` de cada ruta.
 * Es un componente de servidor sin estado: se envía en el primer fragmento
 * del HTML, de modo que el clic en el menú responde al instante con la
 * estructura de la página mientras llegan los datos reales.
 * Solo usa clases existentes (`container`, `grid`, `card`, `fx-shimmer`).
 */
export function PageSkeleton({ title, subtitle, cards = 3, rows = 5, narrow = false }: PageSkeletonProps) {
  const nCards = Math.max(0, Math.floor(cards));
  const nRows = Math.max(0, Math.floor(rows));
  return (
    <div className={narrow ? 'container-sm' : 'container'} aria-busy="true" aria-live="polite">
      <span className="fx-sr-only" role="status">Cargando…</span>
      <div style={{ marginBottom: 24, display: 'grid', gap: 8 }}>
        {title ? <h1>{title}</h1> : <SkeletonLine width={240} height={26} />}
        {subtitle ? <p className="muted">{subtitle}</p> : <SkeletonLine width={360} height={14} />}
      </div>

      {nCards > 0 && (
        <div className="grid grid-3" style={{ marginBottom: 24 }}>
          {Array.from({ length: nCards }, (_, i) => (
            <SkeletonCard key={i} lines={3} />
          ))}
        </div>
      )}

      {nRows > 0 && (
        <div className="card" style={{ display: 'grid', gap: 14 }}>
          {Array.from({ length: nRows }, (_, i) => (
            <SkeletonLine key={i} height={16} width={i % 2 ? '88%' : '100%'} />
          ))}
        </div>
      )}
    </div>
  );
}
