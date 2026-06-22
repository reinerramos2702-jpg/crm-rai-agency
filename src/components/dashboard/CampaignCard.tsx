'use client';

import React from 'react';
import Link from 'next/link';
import {
  Video,
  Image,
  Film,
  LayoutGrid,
  ChevronRight,
  Play,
  Trash2,
  Clock,
  type LucideIcon,
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/Badge';

interface Campaign {
  id: string;
  name: string;
  pipelineType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count?: { executions: number };
  executions?: Array<{
    id: string;
    status: string;
    tasks?: Array<{ status: string }>;
  }>;
}

interface CampaignCardProps {
  campaign: Campaign;
  onDelete?: (id: string) => void;
}

const PIPELINE_ICONS: Record<string, LucideIcon> = {
  ugc: Video,
  avatar_reel: Film,
  static_ads: Image,
  carousel: LayoutGrid,
};

const PIPELINE_LABELS: Record<string, string> = {
  ugc: 'UGC',
  avatar_reel: 'Avatar Reel',
  static_ads: 'Anuncios Estáticos',
  carousel: 'Carrusel',
};

/**
 * Tarjeta de campaña del Dashboard.
 * Muestra nombre, tipo de pipeline, fecha, progreso de tasks y acciones.
 */
export function CampaignCard({ campaign, onDelete }: CampaignCardProps) {
  const Icon = PIPELINE_ICONS[campaign.pipelineType] || Video;

  // Calcular progreso de tasks
  const latestExecution = campaign.executions?.[0];
  const tasks = latestExecution?.tasks || [];
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === 'done').length;
  const progressPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const timeAgo = formatTimeAgo(campaign.updatedAt);

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Línea decorativa dorada en la parte superior */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background:
            campaign.status === 'done'
              ? 'var(--rai-success)'
              : campaign.status === 'processing' || campaign.status === 'ready'
              ? 'linear-gradient(90deg, var(--rai-gold), var(--rai-gold-br))'
              : campaign.status === 'failed'
              ? 'var(--rai-error)'
              : 'var(--rai-border)',
          opacity: 0.8,
        }}
      />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingTop: 8 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'rgba(201,168,76,0.1)',
              border: '1px solid rgba(201,168,76,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon size={18} color="var(--rai-gold)" />
          </div>
          <div>
            <h3
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: 'var(--rai-text)',
                marginBottom: 2,
                lineHeight: 1.3,
              }}
            >
              {campaign.name}
            </h3>
            <span style={{ fontSize: 12, color: 'var(--rai-muted)' }}>
              {PIPELINE_LABELS[campaign.pipelineType] || campaign.pipelineType}
            </span>
          </div>
        </div>
        <StatusBadge status={campaign.status} />
      </div>

      {/* Barra de progreso (si hay ejecuciones) */}
      {totalTasks > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--rai-muted)' }}>
              {doneTasks}/{totalTasks} días completados
            </span>
            <span style={{ fontSize: 11, color: 'var(--rai-gold)' }}>{progressPct}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Clock size={11} color="var(--rai-muted)" />
          <span style={{ fontSize: 11, color: 'var(--rai-muted)' }}>{timeAgo}</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {onDelete && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(campaign.id);
              }}
              className="btn btn-ghost btn-sm"
              style={{ padding: '4px 8px', color: 'var(--rai-error)', borderColor: 'transparent' }}
              title="Eliminar campaña"
            >
              <Trash2 size={13} />
            </button>
          )}
          <Link
            href={`/campaign/${campaign.id}`}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 12px', fontSize: 12 }}
          >
            {campaign.status === 'ready' ? <Play size={12} /> : <ChevronRight size={12} />}
            {campaign.status === 'planning' ? 'Continuar' : 'Ver detalles'}
          </Link>
        </div>
      </div>
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffMin < 1) return 'Ahora mismo';
  if (diffMin < 60) return `Hace ${diffMin}m`;
  if (diffHrs < 24) return `Hace ${diffHrs}h`;
  if (diffDays === 1) return 'Ayer';
  return `Hace ${diffDays} días`;
}
