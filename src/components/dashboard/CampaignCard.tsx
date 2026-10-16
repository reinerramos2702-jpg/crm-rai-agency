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

  const tone =
    campaign.status === 'done' || campaign.status === 'completed' ? 'success'
    : campaign.status === 'processing' || campaign.status === 'ready' ? 'gold'
    : campaign.status === 'failed' ? 'error'
    : 'muted';

  return (
    <article className={`dash-camp is-${tone}`}>
      <div className="dash-camp-head">
        <span className="dash-camp-ico"><Icon size={18} /></span>
        <div className="dash-camp-title">
          <h3 title={campaign.name}>{campaign.name}</h3>
          <span>{PIPELINE_LABELS[campaign.pipelineType] || campaign.pipelineType}</span>
        </div>
        <StatusBadge status={campaign.status} />
      </div>

      {totalTasks > 0 && (
        <div className="dash-camp-progress">
          <div>
            <span>{doneTasks}/{totalTasks} días completados</span>
            <b>{progressPct}%</b>
          </div>
          <div className="progress-bar" role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100}>
            <div className="progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      )}

      <div className="dash-camp-foot">
        <span className="dash-camp-time"><Clock size={12} /> {timeAgo}</span>
        <div className="dash-camp-actions">
          {onDelete && (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(campaign.id); }}
              className="dash-icon-btn is-danger"
              title="Eliminar campaña"
              aria-label={`Eliminar campaña ${campaign.name}`}
            >
              <Trash2 size={14} />
            </button>
          )}
          <Link href={`/campaign/${campaign.id}`} className="btn btn-secondary btn-sm dash-camp-open">
            {campaign.status === 'ready' ? <Play size={12} /> : <ChevronRight size={12} />}
            {campaign.status === 'planning' ? 'Continuar' : 'Ver detalles'}
          </Link>
        </div>
      </div>
    </article>
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
