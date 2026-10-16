'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, Instagram, Zap } from 'lucide-react';
import { SkeletonLine } from '@/components/ui/Skeleton';
import type { DashboardAutomation, DashboardInstagram } from '@/lib/dashboard-summary';

function fmtWhen(iso: string, tz: string): string {
  try {
    return new Intl.DateTimeFormat('es', { timeZone: tz, weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
  } catch {
    return iso.slice(0, 16).replace('T', ' ');
  }
}

function CardSkeleton() {
  return (
    <div className="dsh-card" aria-busy="true">
      <div className="dsh-card-head"><SkeletonLine width={36} height={36} /><SkeletonLine width="50%" height={14} /></div>
      <div className="dsh-nums"><SkeletonLine height={58} /><SkeletonLine height={58} /><SkeletonLine height={58} /></div>
      <SkeletonLine width="75%" height={12} />
    </div>
  );
}

const num = (label: string, value: number, color: string) => (
  <div style={{ '--sc': color } as React.CSSProperties}><strong>{value}</strong><span>{label}</span></div>
);

/** Instagram con los datos del resumen (sin petición propia): altura estable desde el primer pintado. */
export function InstagramCard({ data, loading }: { data: DashboardInstagram | null | undefined; loading: boolean }) {
  if (loading) return <CardSkeleton />;
  if (!data) return null;
  const hasAny = data.scheduled + data.published + data.failed > 0;
  return (
    <div className="dsh-card" data-tour="dash-ig">
      <div className="dsh-card-head">
        <span className="dash-pulse-ico"><Instagram size={17} /></span>
        <div>
          <h3 className="dsh-card-title">Instagram</h3>
          <p className="dsh-card-sub">{data.mode === 'simulated' ? 'Modo simulado: no toca tu cuenta real' : 'Publicación automática activa'}</p>
        </div>
        <Link href="/automatizacion" className="dash-link">Abrir <ArrowRight size={13} /></Link>
      </div>
      {!data.available || !hasAny ? (
        <div className="dsh-empty-inline">
          <p>{data.available ? 'Aún no has programado publicaciones. Planea 30 días con la IA y deja que el CRM publique solo.' : 'Programa tus publicaciones desde Contenido IG: el CRM las publica a su hora.'}</p>
          <Link href="/automatizacion" className="btn btn-secondary btn-sm"><CalendarClock size={14} /> Planear contenido</Link>
        </div>
      ) : (
        <>
          <div className="dsh-nums">
            {num('programadas', data.scheduled, 'var(--rai-gold)')}
            {num('publicadas', data.published, 'var(--rai-success)')}
            {num('fallidas', data.failed, data.failed ? 'var(--rai-error)' : 'var(--rai-muted)')}
          </div>
          {data.failed > 0 ? (
            <p className="dash-pulse-line is-warn"><AlertTriangle size={14} /> {data.failed} publicación{data.failed === 1 ? '' : 'es'} necesita{data.failed === 1 ? '' : 'n'} tu atención. Ábrelas para reintentar.</p>
          ) : data.next ? (
            <p className="dash-pulse-line"><CalendarClock size={14} /> Siguiente: día {data.next.dayNumber ?? '—'} · {fmtWhen(data.next.scheduledAt, data.next.timezone)}</p>
          ) : (
            <p className="dash-pulse-line is-ok"><CheckCircle2 size={14} /> Todo publicado. Programa otro lote cuando quieras.</p>
          )}
        </>
      )}
    </div>
  );
}

export function AutomationCard({ data, loading }: { data: DashboardAutomation | null | undefined; loading: boolean }) {
  if (loading) return <CardSkeleton />;
  if (!data) return null;
  const none = data.total === 0;
  return (
    <div className="dsh-card" data-tour="dash-auto">
      <div className="dsh-card-head">
        <span className="dash-pulse-ico"><Zap size={17} /></span>
        <div>
          <h3 className="dsh-card-title">Automatización</h3>
          <p className="dsh-card-sub">{none ? 'Sin flujos todavía' : 'Flujos que trabajan por ti'}</p>
        </div>
        <Link href="/automatizacion" className="dash-link">{none ? 'Configurar' : 'Ver'} <ArrowRight size={13} /></Link>
      </div>
      {none ? (
        <div className="dsh-empty-inline">
          <p>Activa el primer flujo desde una de las plantillas: recordatorios, seguimientos y bienvenidas.</p>
          <Link href="/automatizacion" className="btn btn-secondary btn-sm"><Zap size={14} /> Ver plantillas</Link>
        </div>
      ) : (
        <>
          <div className="dsh-nums">
            {num('activos', data.active, 'var(--rai-gold)')}
            {num('en total', data.total, 'var(--rai-muted)')}
            {num('ejecuciones', data.runs, 'var(--rai-purple)')}
          </div>
          <p className="dash-pulse-line">{data.active === 0 ? 'Ningún flujo activo: actívalos para que trabajen solos.' : 'Se ejecutan solos según su disparador.'}</p>
        </>
      )}
    </div>
  );
}
