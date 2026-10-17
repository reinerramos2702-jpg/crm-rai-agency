'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CalendarPlus, ExternalLink, Image as ImageIcon, RotateCcw, XCircle } from 'lucide-react';
import { SkeletonLine } from '@/components/ui/Skeleton';
import { PLAN_CONTENT_HREF, longDayLabel, postVisualStatus, timeLabel, type PlannerPost } from '@/lib/marketing-calendar';
import { errorText, refreshSummary, sendJson, useCopy, type Msg } from './shared';
import { CopyButton, StatusMsg } from './ui';

interface DetailProps {
  dayKey: string;
  posts: PlannerPost[];
  isGap: boolean;
  loading: boolean;
  tz: string;
  canWrite: boolean;
  onChanged: () => void;
}

const BADGE: Record<string, string> = { ok: 'success', danger: 'error', warn: 'warning', info: 'purple', muted: 'muted' };

/** Detalle del día seleccionado, con las acciones que ya ofrece el API (cancelar / reintentar). */
export function PlannerDetail({ dayKey, posts, isGap, loading, tz, canWrite, onChanged }: DetailProps) {
  const { copied, copy } = useCopy();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<Msg | null>(null);

  async function act(id: string, action: 'cancel' | 'retry') {
    setBusy(id);
    setMsg(null);
    try {
      await sendJson(`/api/content-planner/schedule/${encodeURIComponent(id)}`, 'POST', { action });
      setMsg({ kind: 'ok', text: action === 'cancel' ? 'Publicación cancelada.' : 'Reprogramada: se publicará en el próximo ciclo.' });
      onChanged();
      refreshSummary();
    } catch (e) {
      setMsg({ kind: 'error', text: errorText(e, 'No se pudo completar la acción.') });
    } finally {
      setBusy(null);
    }
  }

  const active = posts.filter((p) => p.status !== 'cancelled').length;

  return (
    <section className="card mkt-detail" aria-labelledby="pl-detail" aria-busy={loading}>
      <div className="mkt-detail-head">
        <h2 id="pl-detail">{longDayLabel(dayKey)}</h2>
        <p>{loading ? 'Cargando publicaciones…' : posts.length === 0 ? 'Sin publicaciones' : `${posts.length} ${posts.length === 1 ? 'publicación' : 'publicaciones'} · ${active} ${active === 1 ? 'activa' : 'activas'}`}</p>
      </div>
      {loading && (
        <div className="mkt-skel-lines" aria-hidden="true">
          <SkeletonLine height={64} />
          <SkeletonLine width="70%" height={12} />
        </div>
      )}
      {!loading && posts.length === 0 && (
        <div className="mkt-empty">
          <CalendarPlus size={24} aria-hidden="true" />
          <strong>{isGap ? 'Día sin contenido' : 'Nada publicado este día'}</strong>
          <span>{isGap ? 'No hay ninguna publicación programada. Planea contenido para no dejar huecos.' : 'No hubo publicaciones en esta fecha.'}</span>
          {isGap && <Link className="mkt-btn" href={PLAN_CONTENT_HREF} style={{ marginTop: 8 }}>Planear contenido</Link>}
        </div>
      )}
      <StatusMsg msg={msg} />
      {posts.map((p) => {
        const st = postVisualStatus(p);
        return (
          <article key={p.id} className={`mkt-post t-${st.tone}`}>
            {p.mediaUrls[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="mkt-post-thumb" src={p.mediaUrls[0]} alt="" loading="lazy" width={64} height={64} />
            ) : (
              <span className="mkt-post-ph" aria-hidden="true"><ImageIcon size={20} /></span>
            )}
            <div>
              <div className="mkt-post-head">
                <span className={`badge badge-${BADGE[st.tone] ?? 'muted'}`}>{st.label}</span>
                <span>{timeLabel(p.scheduledAt, tz)}</span>
                {p.dayNumber != null && <span>Día {p.dayNumber}</span>}
                <span>{p.mediaType === 'carousel' ? 'Carrusel' : 'Imagen'}{p.mediaUrls.length > 1 ? ` · ${p.mediaUrls.length}` : ''}</span>
                {p.simulated && <span>No se envió a Instagram</span>}
              </div>
              <p className="mkt-post-cap">{p.caption}</p>
              {p.status === 'failed' && p.lastError && <p className="mkt-error" style={{ marginBottom: 8 }}>Error: {p.lastError} ({p.attempts} {p.attempts === 1 ? 'intento' : 'intentos'})</p>}
              <div className="mkt-actions">
                <CopyButton id={`p-${p.id}`} text={p.caption} copied={copied} onCopy={copy} label="Copiar texto" />
                {p.permalink && <a className="mkt-btn" href={p.permalink} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} aria-hidden="true" />Ver en Instagram</a>}
                {canWrite && p.status === 'scheduled' && <button type="button" className="mkt-btn is-danger" disabled={busy === p.id} onClick={() => void act(p.id, 'cancel')}><XCircle size={14} aria-hidden="true" />Cancelar</button>}
                {canWrite && (p.status === 'failed' || p.status === 'cancelled') && <button type="button" className="mkt-btn" disabled={busy === p.id} onClick={() => void act(p.id, 'retry')}><RotateCcw size={14} aria-hidden="true" />Reprogramar ahora</button>}
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
