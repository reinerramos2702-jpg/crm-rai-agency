'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Play, Pause, RefreshCw, ArrowLeft, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { TopBar } from '@/components/layout/TopBar';
import { StatusBadge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { DayCard } from '@/components/campaign/DayCard';
import { AgentMonitor } from '@/components/campaign/AgentMonitor';
import { CostEstimate } from '@/components/campaign/CostEstimate';
import toast from 'react-hot-toast';

interface Task {
  id: string;
  index: number;
  status: string;
  costUsd: number;
  errorAgent?: string;
  errorMessage?: string;
  masterNode: Record<string, unknown>;
  assets: Array<{ kind: string; publicUrl: string }>;
}

interface Execution {
  id: string;
  status: string;
  estimatedCostUsd?: number;
  actualCostUsd: number;
  startedAt?: string;
  finishedAt?: string;
  tasks: Task[];
}

interface Campaign {
  id: string;
  name: string;
  pipelineType: string;
  status: string;
  masterJson?: Record<string, unknown>;
  executions: Execution[];
}

/**
 * Página de detalle de campaña — Secuencia 3.
 * Layout en 3 zonas:
 *   Zona 1: Header con acciones
 *   Zona 2: Grilla de días (DayCards)
 *   Zona 3: Monitor IA en vivo (SSE)
 */
export default function CampaignDetailPage() {
  const params = useParams();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [pausing, setPausing] = useState(false);

  const loadCampaign = useCallback(async () => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`);
      if (!res.ok) {
        toast.error('Campaña no encontrada');
        return;
      }
      const data = await res.json();
      setCampaign(data.campaign);
    } catch {
      toast.error('Error cargando campaña');
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    loadCampaign();
    // Refrescar cada 5s si está procesando
    const interval = setInterval(() => {
      if (campaign?.status === 'processing') loadCampaign();
    }, 5000);
    return () => clearInterval(interval);
  }, [loadCampaign, campaign?.status]);

  async function startProcessing() {
    setProcessing(true);
    try {
      const res = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Error iniciando ejecución');
        return;
      }
      toast.success('¡Pipeline iniciado!');
      await loadCampaign();
    } catch {
      toast.error('Error de red');
    } finally {
      setProcessing(false);
    }
  }

  async function retryTask(taskId: string) {
    try {
      const res = await fetch(`/api/retry/${taskId}`, { method: 'POST' });
      if (res.ok) {
        toast.success('Task re-encolada');
        await loadCampaign();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Error reintentando');
      }
    } catch {
      toast.error('Error de red');
    }
  }

  async function publishTask(taskId: string) {
    try {
      const res = await fetch('/api/webhook/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId }),
      });
      if (res.ok) {
        toast.success('Enviado a n8n para publicación');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Error publicando');
      }
    } catch {
      toast.error('Error de red');
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <div style={{ textAlign: 'center' }}>
          <Spinner size="lg" />
          <p style={{ color: 'var(--rai-muted)', marginTop: 16 }}>Cargando campaña...</p>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <p style={{ color: 'var(--rai-error)' }}>Campaña no encontrada</p>
        <Link href="/" className="btn btn-ghost" style={{ marginTop: 16, display: 'inline-flex' }}>
          <ArrowLeft size={14} /> Volver al dashboard
        </Link>
      </div>
    );
  }

  const latestExecution = campaign.executions?.[0];
  const tasks = latestExecution?.tasks || [];
  const doneTasks = tasks.filter((t) => t.status === 'done').length;
  const totalTasks = tasks.length;
  const progressPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const isRunning = campaign.status === 'processing' || latestExecution?.status === 'running';
  const isReady = campaign.status === 'ready';
  const masterJson = campaign.masterJson as Record<string, unknown> | undefined;

  return (
    <>
      {/* Header */}
      <TopBar
        title={campaign.name}
        subtitle={`Pipeline: ${campaign.pipelineType.toUpperCase()} · ${totalTasks} días`}
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Link href="/" className="btn btn-ghost btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <ArrowLeft size={13} /> Dashboard
            </Link>

            <StatusBadge status={campaign.status} />

            {/* Progreso */}
            {totalTasks > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 150 }}>
                <div className="progress-bar" style={{ width: 100 }}>
                  <div className="progress-fill" style={{ width: `${progressPct}%` }} />
                </div>
                <span style={{ fontSize: 12, color: 'var(--rai-muted)', whiteSpace: 'nowrap' }}>
                  {doneTasks}/{totalTasks}
                </span>
              </div>
            )}

            {/* Botón Procesar */}
            {(isReady || campaign.status === 'planning') && (
              <button
                onClick={startProcessing}
                disabled={processing}
                className="btn btn-primary"
              >
                {processing ? <Spinner size="sm" /> : <Play size={14} />}
                Procesar Batch
              </button>
            )}

            {/* Botón Pausar */}
            {isRunning && (
              <button
                onClick={() => setPausing(true)}
                disabled={pausing}
                className="btn btn-secondary"
              >
                <Pause size={14} />
                Pausar
              </button>
            )}
          </div>
        }
      />

      {/* Body en 2 columnas: Grilla + Monitor */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 320px',
          gap: 0,
          minHeight: 'calc(100vh - 73px)',
          overflow: 'auto',
        }}
      >
        {/* ═══ Zona Central — Grilla de Días ═══ */}
        <div style={{ overflowY: 'auto', padding: '24px 24px 24px 32px' }}>

          {/* Estimado de costos (si está en ready) */}
          {isReady && masterJson && (
            <div style={{ marginBottom: 24 }}>
              <CostEstimate
                items={(masterJson.items as unknown[])?.length || 7}
                pipelineType={campaign.pipelineType}
                imageProvider={
                  ((masterJson.modelConfig as Record<string, unknown>)
                    ?.visualAgent as Record<string, unknown>)
                    ?.imageProvider as string || 'gemini'
                }
              />
            </div>
          )}

          {/* Grilla vacía (planning sin execution) */}
          {tasks.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 32px',
                background: 'var(--rai-card)',
                borderRadius: 12,
                border: '1px solid var(--rai-border)',
              }}
            >
              <p style={{ color: 'var(--rai-muted)', fontSize: 15, marginBottom: 8 }}>
                {campaign.status === 'planning'
                  ? 'Finaliza el chat de planificación para generar el plan maestro.'
                  : 'Haz clic en "Procesar Batch" para iniciar la generación de contenido.'}
              </p>
              {campaign.status === 'planning' && (
                <Link href={`/campaign/new?id=${campaign.id}`} className="btn btn-primary" style={{ display: 'inline-flex', marginTop: 16 }}>
                  Continuar planificación
                </Link>
              )}
            </div>
          )}

          {/* Grilla de días */}
          {tasks.length > 0 && (
            <>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 16,
                }}
              >
                <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--rai-text)' }}>
                  Días de Contenido
                </h2>
                {latestExecution?.actualCostUsd > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <DollarSign size={12} color="var(--rai-gold)" />
                    <span style={{ fontSize: 12, color: 'var(--rai-muted)' }}>
                      Costo real: ${latestExecution.actualCostUsd.toFixed(4)} USD
                    </span>
                  </div>
                )}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                  gap: 10,
                }}
              >
                {tasks.map((task) => (
                  <DayCard
                    key={task.id}
                    task={task}
                    onRetry={retryTask}
                    onPublish={publishTask}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* ═══ Zona Derecha — Monitor IA ═══ */}
        <div
          style={{
            borderLeft: '1px solid var(--rai-border)',
            background: 'var(--rai-dark)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <AgentMonitor
            campaignId={campaignId}
            executionId={latestExecution?.id}
          />
        </div>
      </div>

      {/* Overlay de pausa */}
      {pausing && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(10,10,15,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
          }}
          onClick={() => setPausing(false)}
        >
          <div
            style={{
              background: 'var(--rai-dark)',
              border: '1px solid var(--rai-border)',
              borderRadius: 12,
              padding: 32,
              maxWidth: 400,
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
              Pausar ejecución
            </h3>
            <p style={{ color: 'var(--rai-muted)', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
              Las tasks en curso finalizarán antes de pausar. Podrás reanudar desde el panel de días.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button onClick={() => setPausing(false)} className="btn btn-ghost">
                Cancelar
              </button>
              <button
                onClick={() => {
                  toast('Las tasks activas terminarán antes de pausar', { icon: '⏸' });
                  setPausing(false);
                }}
                className="btn btn-secondary"
              >
                <Pause size={14} />
                Confirmar pausa
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
