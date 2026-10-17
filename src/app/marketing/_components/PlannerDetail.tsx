'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Image as ImageIcon, RotateCcw, XCircle } from 'lucide-react';
import { PLAN_CONTENT_HREF, longDayLabel, postVisualStatus, timeLabel, type PlannerPost } from '@/lib/marketing-calendar';
import { CopyButton, refreshSummary, sendJson, useCopy } from './shared';

interface DetailProps {
  dayKey: string;
  posts: PlannerPost[];
  isGap: boolean;
  tz: string;
  canWrite: boolean;
  onChanged: () => void;
}

/** Detalle del día seleccionado, con las acciones que ya ofrece el API (cancelar / reintentar). */
export function PlannerDetail({ dayKey, posts, isGap, tz, canWrite, onChanged }: DetailProps) {
  const { copied, copy } = useCopy();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(id: string, action: 'cancel' | 'retry') {
    setBusy(id);
    setError(null);
    try {
      await sendJson(`/api/content-planner/schedule/${encodeURIComponent(id)}`, 'POST', { action });
      onChanged();
      refreshSummary();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo completar la acción.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="card mkt-detail" aria-labelledby="pl-detail" aria-live="polite">
      <h2 id="pl-detail" className="mkt-card-title" style={{ textTransform: 'capitalize', marginBottom: 0 }}>{longDayLabel(dayKey)}</h2>
      {posts.length === 0 && (
        <div className="mkt-note is-info">
          <span>{isGap ? 'Este día no tiene ninguna publicación programada.' : 'No hubo publicaciones este día.'}</span>
          {isGap && <Link className="mkt-btn" href={PLAN_CONTENT_HREF}>Planear contenido</Link>}
        </div>
      )}
      {error && <p className="mkt-error" role="alert">{error}</p>}
      {posts.map((p) => {
        const st = postVisualStatus(p);
        return (
          <article key={p.id} className="mkt-post">
            {p.mediaUrls[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="mkt-post-thumb" src={p.mediaUrls[0]} alt="" loading="lazy" width={64} height={64} />
            ) : (
              <span className="mkt-post-ph" aria-hidden="true"><ImageIcon size={20} /></span>
            )}
            <div>
              <div className="mkt-post-head">
                <span className={`badge badge-${st.tone === 'ok' ? 'success' : st.tone === 'danger' ? 'error' : st.tone === 'warn' ? 'warning' : st.tone === 'info' ? 'purple' : 'muted'}`}>{st.label}</span>
                <span>{timeLabel(p.scheduledAt, tz)}</span>
                {p.dayNumber != null && <span>Día {p.dayNumber}</span>}
                <span>{p.mediaType === 'carousel' ? 'Carrusel' : 'Imagen'}{p.mediaUrls.length > 1 ? ` · ${p.mediaUrls.length}` : ''}</span>
                {p.simulated && <span>No se envió a Instagram</span>}
              </div>
              <p className="mkt-post-cap">{p.caption}</p>
              {p.status === 'failed' && p.lastError && <p className="mkt-error">Error: {p.lastError} ({p.attempts} {p.attempts === 1 ? 'intento' : 'intentos'})</p>}
              <div className="mkt-actions">
                <CopyButton id={`p-${p.id}`} text={p.caption} copied={copied} onCopy={copy} label="Copiar texto" />
                {p.permalink && <a className="mkt-btn" href={p.permalink} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} />Ver en Instagram</a>}
                {canWrite && p.status === 'scheduled' && <button type="button" className="mkt-btn is-danger" disabled={busy === p.id} onClick={() => act(p.id, 'cancel')}><XCircle size={14} />Cancelar</button>}
                {canWrite && (p.status === 'failed' || p.status === 'cancelled') && <button type="button" className="mkt-btn" disabled={busy === p.id} onClick={() => act(p.id, 'retry')}><RotateCcw size={14} />Reprogramar ahora</button>}
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
