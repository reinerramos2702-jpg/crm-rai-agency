'use client';

import React from 'react';
import { RefreshCw, SendHorizonal, CheckCircle2, AlertCircle, Loader2, Clock, Pause } from 'lucide-react';
import { StatusBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';

interface Task {
  id: string;
  index: number;
  status: string;
  errorAgent?: string;
  errorMessage?: string;
  costUsd?: number;
  masterNode: {
    dayNumber?: number;
    angle?: string;
    pipelineType?: string;
    publicationMode?: string;
    caption?: string;
  };
  assets?: Array<{ kind: string; publicUrl: string }>;
}

interface DayCardProps {
  task: Task;
  onRetry?: (taskId: string) => void;
  onPublish?: (taskId: string) => void;
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  queued:   <Clock size={14} color="var(--rai-muted)" />,
  running:  <Loader2 size={14} color="var(--rai-purple)" style={{ animation: 'spin 1s linear infinite' }} />,
  done:     <CheckCircle2 size={14} color="var(--rai-success)" />,
  failed:   <AlertCircle size={14} color="var(--rai-error)" />,
  paused:   <Pause size={14} color="var(--rai-warning)" />,
};

/**
 * Tarjeta de día individual en la grilla de ejecución.
 * Muestra estado, thumbnails de assets y acciones de retry/publicar.
 */
export function DayCard({ task, onRetry, onPublish }: DayCardProps) {
  const [showModal, setShowModal] = React.useState(false);

  const dayNumber = task.masterNode?.dayNumber ?? task.index + 1;
  const isRunning = task.status === 'running';
  const isFailed = task.status === 'failed' || task.status === 'paused';
  const isDone = task.status === 'done';
  const publicationMode = task.masterNode?.publicationMode;

  // Colores de borde por status
  const borderColors: Record<string, string> = {
    done: 'rgba(46,196,182,0.3)',
    running: 'rgba(123,94,167,0.4)',
    failed: 'rgba(230,57,70,0.3)',
    paused: 'rgba(255,159,28,0.3)',
    queued: 'var(--rai-border)',
  };

  const borderColor = borderColors[task.status] || 'var(--rai-border)';

  const imageAsset = task.assets?.find((a) => a.kind === 'image');
  const videoAsset = task.assets?.find((a) => a.kind === 'video');

  return (
    <>
      <div
        onClick={() => setShowModal(true)}
        style={{
          background: 'var(--rai-card)',
          border: `1px solid ${borderColor}`,
          borderRadius: 10,
          padding: '12px',
          cursor: 'pointer',
          transition: 'var(--transition)',
          position: 'relative',
          overflow: 'hidden',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {/* Pulso animado si está running */}
        {isRunning && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 2,
              background: 'linear-gradient(90deg, var(--rai-purple), transparent)',
              animation: 'shimmer 1.5s ease-in-out infinite',
            }}
          />
        )}

        {/* Número de día + status */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: isDone ? 'var(--rai-success)' : isRunning ? 'var(--rai-purple)' : isFailed ? 'var(--rai-warning)' : 'var(--rai-text)',
            }}
          >
            Día {dayNumber}
          </span>
          {STATUS_ICONS[task.status] || <Clock size={14} color="var(--rai-muted)" />}
        </div>

        {/* Ángulo */}
        <p
          style={{
            fontSize: 11,
            color: 'var(--rai-muted)',
            marginBottom: 8,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: 1.4,
          }}
          title={task.masterNode?.angle}
        >
          {task.masterNode?.angle || '—'}
        </p>

        {/* Thumbnail si está done */}
        {isDone && imageAsset && (
          <div
            style={{
              width: '100%',
              height: 48,
              borderRadius: 6,
              background: 'var(--rai-dark)',
              overflow: 'hidden',
              marginBottom: 8,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageAsset.publicUrl}
              alt={`Día ${dayNumber}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        )}

        {/* Modo de publicación */}
        {publicationMode && (
          <div style={{ fontSize: 10, color: 'var(--rai-muted)', marginBottom: 6 }}>
            {publicationMode === 'auto_instagram' ? '📲 Auto' : '👤 Manual'}
          </div>
        )}

        {/* Botones de acción */}
        {isFailed && onRetry && (
          <button
            onClick={(e) => { e.stopPropagation(); onRetry(task.id); }}
            className="btn btn-ghost btn-sm"
            style={{ width: '100%', fontSize: 11, padding: '4px 8px', gap: 4 }}
          >
            <RefreshCw size={11} />
            Reintentar
          </button>
        )}

        {isDone && publicationMode === 'manual_push' && onPublish && (
          <button
            onClick={(e) => { e.stopPropagation(); onPublish(task.id); }}
            className="btn btn-secondary btn-sm"
            style={{ width: '100%', fontSize: 11, padding: '4px 8px', gap: 4 }}
          >
            <SendHorizonal size={11} />
            Publicar
          </button>
        )}

        {isDone && publicationMode === 'auto_instagram' && (
          <div style={{ fontSize: 10, color: 'var(--rai-success)', textAlign: 'center', marginTop: 4 }}>
            ✓ Publicado en Instagram
          </div>
        )}
      </div>

      {/* Modal de detalle del día */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={`Día ${dayNumber} — ${task.masterNode?.angle || ''}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <StatusBadge status={task.status} />
            {task.costUsd ? (
              <span style={{ fontSize: 12, color: 'var(--rai-muted)' }}>
                Costo: ${task.costUsd.toFixed(4)} USD
              </span>
            ) : null}
          </div>

          {task.masterNode?.angle && (
            <div>
              <p className="label" style={{ marginBottom: 4 }}>Ángulo</p>
              <p style={{ fontSize: 14, color: 'var(--rai-text)' }}>{task.masterNode.angle}</p>
            </div>
          )}

          {task.masterNode?.caption && (
            <div>
              <p className="label" style={{ marginBottom: 4 }}>Caption</p>
              <p style={{ fontSize: 13, color: 'var(--rai-muted)', lineHeight: 1.6 }}>{task.masterNode.caption}</p>
            </div>
          )}

          {task.assets && task.assets.length > 0 && (
            <div>
              <p className="label" style={{ marginBottom: 8 }}>Assets Generados</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {task.assets.map((asset, i) => (
                  <a
                    key={i}
                    href={asset.publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '6px 12px',
                      background: 'var(--rai-dark)',
                      border: '1px solid var(--rai-border)',
                      borderRadius: 6,
                      fontSize: 12,
                      color: 'var(--rai-gold)',
                      textDecoration: 'none',
                    }}
                  >
                    {asset.kind} ↗
                  </a>
                ))}
              </div>
            </div>
          )}

          {task.errorMessage && (
            <div
              style={{
                background: 'rgba(230,57,70,0.1)',
                border: '1px solid rgba(230,57,70,0.3)',
                borderRadius: 8,
                padding: 12,
              }}
            >
              <p style={{ fontSize: 12, color: 'var(--rai-error)', fontWeight: 600, marginBottom: 4 }}>
                Error en: {task.errorAgent}
              </p>
              <p style={{ fontSize: 12, color: 'var(--rai-muted)' }}>{task.errorMessage}</p>
            </div>
          )}

          {/* Acciones del modal */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            {isFailed && onRetry && (
              <button
                onClick={() => { onRetry(task.id); setShowModal(false); }}
                className="btn btn-primary btn-sm"
              >
                <RefreshCw size={13} />
                Reintentar
              </button>
            )}
            {isDone && onPublish && (
              <button
                onClick={() => { onPublish(task.id); setShowModal(false); }}
                className="btn btn-primary btn-sm"
              >
                <SendHorizonal size={13} />
                Publicar en Instagram
              </button>
            )}
          </div>
        </div>
      </Modal>

      <style jsx global>{`
        @keyframes shimmer {
          0% { opacity: 0.3; }
          50% { opacity: 1; }
          100% { opacity: 0.3; }
        }
      `}</style>
    </>
  );
}
