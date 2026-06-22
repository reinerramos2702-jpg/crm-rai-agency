'use client';

import React from 'react';
import { Layers, CheckCircle2, AlertCircle, Clock, type LucideIcon } from 'lucide-react';

interface StatItem {
  label: string;
  value: number;
  icon: LucideIcon;
  color: string;
  bg: string;
}

interface StatsBarProps {
  total: number;
  completed: number;
  processing: number;
  failed: number;
}

/**
 * Barra de estadísticas del dashboard.
 * Muestra resumen de campañas por estado.
 */
export function StatsBar({ total, completed, processing, failed }: StatsBarProps) {
  const stats = [
    {
      label: 'Total Campañas',
      value: total,
      icon: Layers,
      color: 'var(--rai-gold)',
      bg: 'rgba(201,168,76,0.1)',
    },
    {
      label: 'Completadas',
      value: completed,
      icon: CheckCircle2,
      color: 'var(--rai-success)',
      bg: 'rgba(46,196,182,0.1)',
    },
    {
      label: 'En Proceso',
      value: processing,
      icon: Clock,
      color: 'var(--rai-purple)',
      bg: 'rgba(123,94,167,0.1)',
    },
    {
      label: 'Con Errores',
      value: failed,
      icon: AlertCircle,
      color: 'var(--rai-error)',
      bg: 'rgba(230,57,70,0.1)',
    },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 12,
        marginBottom: 32,
      }}
    >
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="card"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '16px 20px',
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: stat.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Icon size={18} color={stat.color} />
            </div>
            <div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: stat.color,
                  lineHeight: 1.1,
                }}
              >
                {stat.value}
              </div>
              <div style={{ fontSize: 12, color: 'var(--rai-muted)', marginTop: 2 }}>
                {stat.label}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
