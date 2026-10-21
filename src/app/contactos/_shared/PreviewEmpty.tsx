import React, { useId } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface EmptyBenefit {
  icon: LucideIcon;
  title: string;
  text: string;
}

interface PreviewEmptyProps {
  title: string;
  text: string;
  /** Filas o tarjetas fantasma (decorativas: se ocultan a lectores de pantalla). */
  ghosts: React.ReactNode;
  /** Acciones rápidas (Importar, Agregar, plantilla…). */
  actions: React.ReactNode;
  benefits?: readonly EmptyBenefit[];
  /** Estado vacío dentro de una tabla o tablero: sin marco propio. */
  bare?: boolean;
}

/** Estado vacío con vista previa: fantasmas con degradado de máscara (sin desenfoque) y arranque rápido. */
export function PreviewEmpty({ title, text, ghosts, actions, benefits, bare = false }: PreviewEmptyProps) {
  const titleId = useId();
  return (
    <section className={`crm-empty${bare ? ' crm-empty--bare' : ''}`} aria-labelledby={titleId}>
      <div className="crm-empty-ghosts" aria-hidden="true">{ghosts}</div>
      <div className="crm-empty-copy">
        <h2 id={titleId} className="crm-empty-title">{title}</h2>
        <p className="crm-empty-text">{text}</p>
      </div>
      <div className="crm-empty-actions">{actions}</div>
      {benefits && benefits.length > 0 && (
        <ul className="crm-benefits">
          {benefits.map(({ icon: Icon, title: t, text: d }) => (
            <li key={t} className="crm-benefit">
              <span className="crm-benefit-icon" aria-hidden="true"><Icon size={16} /></span>
              <strong>{t}</strong>
              <span>{d}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
