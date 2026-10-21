import React from 'react';
import { RotateCw, TriangleAlert } from 'lucide-react';

interface InlineErrorProps {
  title: string;
  message: string;
  onRetry: () => void;
  busy?: boolean;
  /** Versión de una línea para avisar de que los datos mostrados pueden estar desactualizados. */
  compact?: boolean;
}

/** Error en línea con «Reintentar»: nunca reemplaza la estructura de la pantalla. */
export function InlineError({ title, message, onRetry, busy = false, compact = false }: InlineErrorProps) {
  return (
    <div className={`cv-error${compact ? ' cv-error--compact' : ''}`} role="alert">
      <TriangleAlert size={compact ? 14 : 20} aria-hidden="true" className="cv-error-icon" />
      <div className="cv-error-copy">
        <strong>{title}</strong>
        {!compact && <span>{message}</span>}
      </div>
      <button type="button" className="secondary btn-sm cv-error-btn" onClick={onRetry} disabled={busy}>
        <RotateCw size={13} aria-hidden="true" /> Reintentar
      </button>
    </div>
  );
}
