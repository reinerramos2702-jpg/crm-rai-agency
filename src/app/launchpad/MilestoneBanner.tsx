import React from 'react';
import { X } from 'lucide-react';

interface MilestoneBannerProps {
  /** Total de pasos de la guía completados. */
  total: number;
  onDismiss: () => void;
}

/**
 * Aviso sobrio al completar el 100 % de la guía. El trazo del check se «dibuja»
 * revelándolo con una cubierta que se desplaza (solo transform; ver launchpad.css).
 */
export function MilestoneBanner({ total, onDismiss }: MilestoneBannerProps) {
  return (
    <div className="card mb-6 lp-milestone fx-field-in" role="status">
      <span className="lp-milestone-badge" aria-hidden="true">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 12.5l4.5 4.5L19 7.5"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect className="lp-milestone-cover" x="0" y="0" width="24" height="24" />
        </svg>
      </span>
      <p className="lp-milestone-text">
        <strong>¡Plataforma lista!</strong> Completaste los {total} pasos
      </p>
      <button type="button" className="lp-milestone-close" onClick={onDismiss} aria-label="Cerrar aviso">
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
