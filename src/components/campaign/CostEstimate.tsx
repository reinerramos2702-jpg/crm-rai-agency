'use client';

import React from 'react';
import { DollarSign, Cpu, Mic, Video, Image, type LucideIcon } from 'lucide-react';

interface CostItem {
  label: string;
  costUsd: number;
  icon: LucideIcon;
}

interface CostEstimateProps {
  items: number;
  pipelineType: string;
  imageProvider: string;
}

/**
 * Breakdown de costos estimados antes de procesar la campaña.
 * Basado en los proveedores seleccionados y cantidad de días.
 */
export function CostEstimate({ items, pipelineType, imageProvider }: CostEstimateProps) {
  const hasVideo = pipelineType === 'ugc' || pipelineType === 'avatar_reel';

  // Costos unitarios aproximados (por pieza)
  const COSTS: CostItem[] = [
    {
      label: 'Copy (DeepSeek)',
      costUsd: 0.002 * items,
      icon: Cpu,
    },
    {
      label: `Imagen (${imageProvider === 'gemini' ? 'Gemini Imagen 3' : imageProvider === 'openai' ? 'gpt-image-1' : 'Stability AI'})`,
      costUsd:
        (imageProvider === 'openai' ? 0.04 : imageProvider === 'stabilityai' ? 0.08 : 0.03) *
        items,
      icon: Image,
    },
    {
      label: 'Audio (ElevenLabs)',
      costUsd: 0.05 * items,
      icon: Mic,
    },
  ];

  if (hasVideo) {
    COSTS.push({
      label: 'Video (Gemini Veo 2)',
      costUsd: 0.4 * 8 * items, // 8 segundos promedio
      icon: Video,
    });
  }

  const total = COSTS.reduce((s, c) => s + c.costUsd, 0);

  return (
    <div
      style={{
        background: 'var(--rai-card)',
        border: '1px solid var(--rai-border)',
        borderRadius: 10,
        padding: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <DollarSign size={14} color="var(--rai-gold)" />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--rai-text)' }}>
          Estimado de costos
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {COSTS.map((cost) => {
          const Icon = cost.icon;
          return (
            <div
              key={cost.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon size={12} color="var(--rai-muted)" />
                <span style={{ fontSize: 12, color: 'var(--rai-muted)' }}>{cost.label}</span>
              </div>
              <span style={{ fontSize: 12, color: 'var(--rai-text)', fontWeight: 500 }}>
                ${cost.costUsd.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 12,
          paddingTop: 12,
          borderTop: '1px solid var(--rai-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--rai-text)' }}>Total ({items} días)</span>
        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--rai-gold)' }}>
          ~${total.toFixed(2)} USD
        </span>
      </div>

      <p style={{ fontSize: 10, color: 'var(--rai-muted)', marginTop: 8, lineHeight: 1.5 }}>
        * Estimados aproximados. El costo real puede variar.
      </p>
    </div>
  );
}
