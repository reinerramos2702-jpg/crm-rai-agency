'use client';

import React from 'react';

type BadgeVariant = 'success' | 'error' | 'warning' | 'gold' | 'purple' | 'muted';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  dot?: boolean; // mostrar punto de estado
}

/**
 * Badge de estado con variantes de la paleta RAI.
 */
export function Badge({ variant = 'muted', children, className = '', dot = false }: BadgeProps) {
  const variantClass = `badge-${variant}`;

  return (
    <span className={`badge ${variantClass} ${className}`}>
      {dot && (
        <span
          className="status-dot"
          style={{
            background:
              variant === 'success' ? 'var(--rai-success)'
              : variant === 'error' ? 'var(--rai-error)'
              : variant === 'warning' ? 'var(--rai-warning)'
              : variant === 'purple' ? 'var(--rai-purple)'
              : variant === 'gold' ? 'var(--rai-gold)'
              : 'var(--rai-muted)',
          }}
        />
      )}
      {children}
    </span>
  );
}

/**
 * Convierte el status string de una task/ejecución a Badge.
 */
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: BadgeVariant; label: string }> = {
    planning: { variant: 'muted', label: 'Planificando' },
    ready:    { variant: 'gold', label: 'Listo' },
    queued:   { variant: 'muted', label: 'En cola' },
    running:  { variant: 'purple', label: 'Procesando' },
    done:     { variant: 'success', label: 'Completado' },
    completed: { variant: 'success', label: 'Completado' },
    paused:   { variant: 'warning', label: 'Pausado' },
    failed:   { variant: 'error', label: 'Fallido' },
    skipped:  { variant: 'muted', label: 'Omitido' },
  };

  const config = map[status] || { variant: 'muted' as BadgeVariant, label: status };

  return (
    <Badge variant={config.variant} dot={status === 'running'}>
      {config.label}
    </Badge>
  );
}
