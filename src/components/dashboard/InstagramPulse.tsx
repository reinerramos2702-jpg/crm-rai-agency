'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Instagram, CalendarClock, ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react';

interface PostLite {
  id: string;
  dayNumber: number | null;
  status: 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed' | 'cancelled';
  scheduledAt: string;
  timezone: string;
  simulated: boolean;
}

export interface PulseSummary {
  scheduled: number;
  published: number;
  failed: number;
  available: boolean;
}

function fmtWhen(iso: string, tz: string): string {
  try {
    return new Intl.DateTimeFormat('es', { timeZone: tz, weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
  } catch {
    return iso.slice(0, 16).replace('T', ' ');
  }
}

/** Pulso de Instagram: cuánto hay programado, publicado y cuándo sale lo siguiente. */
export function InstagramPulse({ onSummary }: { onSummary?: (s: PulseSummary) => void }) {
  const [posts, setPosts] = useState<PostLite[] | null>(null);
  const [mode, setMode] = useState<'simulated' | 'live'>('simulated');
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/content-planner/schedule', { cache: 'no-store' });
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { mode: 'simulated' | 'live'; posts: PostLite[] };
        if (!alive) return;
        setPosts(data.posts);
        setMode(data.mode);
        onSummary?.({
          scheduled: data.posts.filter((p) => p.status === 'scheduled').length,
          published: data.posts.filter((p) => p.status === 'published').length,
          failed: data.posts.filter((p) => p.status === 'failed').length,
          available: true,
        });
      } catch {
        if (!alive) return;
        setAvailable(false);
        setPosts([]);
        onSummary?.({ scheduled: 0, published: 0, failed: 0, available: false });
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (posts === null) {
    return (
      <div className="dash-pulse" aria-busy="true">
        <div className="skeleton" style={{ height: 14, width: 160, borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 38, width: '70%', borderRadius: 8, marginTop: 14 }} />
      </div>
    );
  }

  const scheduled = posts.filter((p) => p.status === 'scheduled');
  const published = posts.filter((p) => p.status === 'published');
  const failed = posts.filter((p) => p.status === 'failed');
  const next = [...scheduled].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))[0];
  const hasAny = posts.length > 0;

  return (
    <div className="dash-pulse" data-tour="dash-ig">
      <div className="dash-pulse-head">
        <span className="dash-pulse-ico"><Instagram size={17} /></span>
        <div>
          <h3>Instagram, hoy</h3>
          <p>{mode === 'simulated' ? 'Modo simulado: ciclo completo sin tocar tu cuenta real' : 'Publicación automática activa'}</p>
        </div>
        <Link href="/automatizacion" className="dash-link">Abrir <ArrowRight size={13} /></Link>
      </div>

      {!available || !hasAny ? (
        <div className="dash-pulse-empty">
          <p>{available ? 'Aún no has programado publicaciones. Planea 30 días con la IA y deja que el CRM publique solo.' : 'Programa tus publicaciones desde Contenido IG: el CRM las publica a su hora.'}</p>
          <Link href="/automatizacion" className="btn btn-secondary btn-sm"><CalendarClock size={14} /> Planear contenido</Link>
        </div>
      ) : (
        <>
          <div className="dash-pulse-nums">
            <div style={{ '--sc': 'var(--rai-gold)' } as React.CSSProperties}><strong>{scheduled.length}</strong><span>programadas</span></div>
            <div style={{ '--sc': 'var(--rai-success)' } as React.CSSProperties}><strong>{published.length}</strong><span>publicadas</span></div>
            <div style={{ '--sc': failed.length ? 'var(--rai-error)' : 'var(--rai-muted)' } as React.CSSProperties}><strong>{failed.length}</strong><span>fallidas</span></div>
          </div>
          {failed.length > 0 ? (
            <p className="dash-pulse-line is-warn"><AlertTriangle size={14} /> {failed.length} publicación{failed.length === 1 ? '' : 'es'} necesita{failed.length === 1 ? '' : 'n'} tu atención. Ábrelas para reintentar.</p>
          ) : next ? (
            <p className="dash-pulse-line"><CalendarClock size={14} /> Siguiente: día {next.dayNumber ?? '—'} · {fmtWhen(next.scheduledAt, next.timezone)}</p>
          ) : (
            <p className="dash-pulse-line is-ok"><CheckCircle2 size={14} /> Todo publicado. Programa otro lote cuando quieras.</p>
          )}
        </>
      )}
    </div>
  );
}
