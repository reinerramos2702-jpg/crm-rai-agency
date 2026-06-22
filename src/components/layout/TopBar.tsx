'use client';

import React from 'react';

interface TopBarProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

/**
 * Barra superior de cada sección con título, subtítulo y acciones.
 */
export function TopBar({ title, subtitle, actions }: TopBarProps) {
  return (
    <div
      className="top-bar"
      style={{
        borderBottom: '1px solid var(--rai-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--rai-dark)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div>
        {title && (
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--rai-text)' }}>
            {title}
          </h1>
        )}
        {subtitle && (
          <p style={{ fontSize: 13, color: 'var(--rai-muted)', marginTop: 2 }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{actions}</div>}
    </div>
  );
}
