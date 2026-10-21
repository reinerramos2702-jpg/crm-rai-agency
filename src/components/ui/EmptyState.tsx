import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface EmptyStep {
  icon: LucideIcon;
  title: string;
  text: string;
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  text: string;
  /** Acción principal (normalmente un botón). */
  action?: React.ReactNode;
  /** Pasos opcionales para explicar cómo empezar. */
  steps?: EmptyStep[];
}

/**
 * Estado vacío reutilizable: círculo dorado con icono, título, texto,
 * lista opcional de pasos y acción opcional. Estilos en `effects.css` (`fx-empty*`).
 */
export function EmptyState({ icon: Icon, title, text, action, steps }: EmptyStateProps) {
  return (
    <div className="card fx-empty">
      <div className="fx-empty-icon" aria-hidden="true">
        <Icon size={28} />
      </div>
      <h2 className="fx-empty-title">{title}</h2>
      <p className="fx-empty-text">{text}</p>
      {steps && steps.length > 0 && (
        <ol className="fx-empty-steps">
          {steps.map(({ icon: StepIcon, title: stepTitle, text: stepText }) => (
            <li key={stepTitle} className="fx-empty-step">
              <span className="fx-empty-step-icon" aria-hidden="true">
                <StepIcon size={16} />
              </span>
              <strong>{stepTitle}</strong>
              <span>{stepText}</span>
            </li>
          ))}
        </ol>
      )}
      {action && <div className="fx-empty-action">{action}</div>}
    </div>
  );
}
