'use client';

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

/**
 * Tarjeta con estilo RAI: fondo oscuro, borde sutil, border-radius 12px.
 */
export function Card({ children, className = '', onClick, hover = true }: CardProps) {
  return (
    <div
      className={`card ${hover ? '' : 'no-hover'} ${className}`}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return <div className={`card-header ${className}`}>{children}</div>;
}
