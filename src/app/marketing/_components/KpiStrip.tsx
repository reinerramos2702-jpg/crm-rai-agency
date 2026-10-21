import React from 'react';
import Link from 'next/link';
import { ArrowUpRight, CalendarClock, FileText, Link2, Palette, type LucideIcon } from 'lucide-react';
import { marketingTabHref, type MarketingTabId } from '@/lib/marketing-tabs';
import { InlineError } from './ui';
import { KpiSkeletonGrid } from './skeletons';
import { loadErrorText, type MarketingSummary } from './shared';

type Tone = 'ok' | 'warn' | 'danger' | 'muted';
type SegmentTone = Tone | 'track';

interface Segment {
  tone: SegmentTone;
  value: number;
}

interface CardProps {
  tab: MarketingTabId;
  icon: LucideIcon;
  label: string;
  value: string;
  tone: Tone;
  toneLabel: string;
  hint: string;
  hintClass?: string;
  segments?: Segment[];
}

function Bar({ segments }: { segments: Segment[] }) {
  const shown = segments.filter((s) => s.value > 0);
  return (
    <span className="mkt-bar" aria-hidden="true">
      {shown.map((s, i) => <span key={i} className={`t-${s.tone}`} style={{ flex: `${s.value} 1 0` }} />)}
    </span>
  );
}

function KpiCard({ tab, icon: Icon, label, value, tone, toneLabel, hint, hintClass = '', segments }: CardProps) {
  return (
    <Link className={`mkt-kpi${value === '—' ? ' is-off' : ''}`} href={marketingTabHref(tab)} scroll={false}>
      <span className="mkt-kpi-top">
        <span className="mkt-kpi-ico" aria-hidden="true"><Icon size={14} /></span>
        <span className="mkt-kpi-label">{label}</span>
        <span className={`fx-dot${tone === 'muted' ? '' : ` fx-dot--${tone}`}`} role="img" aria-label={toneLabel} />
      </span>
      <strong className="mkt-kpi-value">{value}</strong>
      {segments ? <Bar segments={segments} /> : <span aria-hidden="true" />}
      <span className={`mkt-kpi-hint ${hintClass}`}>{hint}</span>
      <ArrowUpRight className="mkt-kpi-go" size={16} aria-hidden="true" />
    </Link>
  );
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

interface Props {
  summary: MarketingSummary | undefined;
  error: string | null;
  onRetry: () => void;
}

export function KpiStrip({ summary, error, onRetry }: Props) {
  if (!summary && error === null) return <div aria-busy="true"><KpiSkeletonGrid /></div>;

  const p = summary?.posts;
  const postsAvailable = p !== undefined && p.available;
  const postsTone: Tone = !postsAvailable ? 'muted' : p.failed > 0 ? 'danger' : p.upcoming === 0 ? 'warn' : 'ok';
  const postsToneLabel = { muted: 'Sin datos', danger: 'Hay publicaciones fallidas', warn: 'Sin publicaciones próximas', ok: 'Todo en orden' }[postsTone];
  let postsHint = 'Sin datos por ahora';
  let postsHintClass = '';
  if (summary && p) {
    if (!p.available) postsHint = summary.canManageContent ? 'Tabla de publicaciones pendiente' : 'Tu rol no administra contenido';
    else if (p.failed > 0) { postsHint = `${plural(p.failed, 'fallida', 'fallidas')} por revisar`; postsHintClass = 'is-danger'; }
    else if (p.upcoming === 0) { postsHint = 'Nada programado: agenda contenido'; postsHintClass = 'is-warn'; }
    else postsHint = `${plural(p.published30, 'publicada', 'publicadas')} en 30 días${summary.publishMode === 'simulated' ? ' · modo simulado' : ''}`;
  }

  const score = summary?.brandScore;
  const brandTone: Tone = score === undefined ? 'muted' : score >= 60 ? 'ok' : 'warn';
  const brandHint = score === undefined ? 'Sin datos por ahora' : score >= 100 ? 'Ficha completa' : score >= 60 ? 'Casi lista' : 'Completa tu ficha';

  return (
    <>
      <div className="mkt-kpis">
        <KpiCard
          tab="social" icon={CalendarClock} label="Publicaciones próximas" value={postsAvailable ? String(p.upcoming) : '—'}
          tone={postsTone} toneLabel={postsToneLabel} hint={postsHint} hintClass={postsHintClass}
          segments={postsAvailable ? [{ tone: 'ok', value: p.published30 }, { tone: 'warn', value: p.upcoming }, { tone: 'danger', value: p.failed }] : undefined}
        />
        <KpiCard
          tab="snippets" icon={FileText} label="Fragmentos" value={summary ? String(summary.snippets) : '—'}
          tone={summary ? (summary.snippets > 0 ? 'ok' : 'muted') : 'muted'} toneLabel={summary && summary.snippets > 0 ? 'Con contenido' : 'Sin fragmentos'}
          hint={summary ? (summary.snippets > 0 ? 'Textos listos para reutilizar' : 'Guarda tu primer texto reutilizable') : 'Sin datos por ahora'}
        />
        <KpiCard
          tab="links" icon={Link2} label="Enlaces de activación" value={summary ? String(summary.links.count) : '—'}
          tone={summary ? (summary.links.count > 0 ? 'ok' : 'muted') : 'muted'} toneLabel={summary && summary.links.count > 0 ? 'Con enlaces' : 'Sin enlaces'}
          hint={summary ? `${plural(summary.links.clicks, 'clic', 'clics')} en total` : 'Sin datos por ahora'}
        />
        <KpiCard
          tab="brand" icon={Palette} label="Ficha de marca" value={score === undefined ? '—' : `${score} %`}
          tone={brandTone} toneLabel={score === undefined ? 'Sin datos' : score >= 60 ? 'Ficha encaminada' : 'Ficha incompleta'}
          hint={brandHint} hintClass={score !== undefined && score < 60 ? 'is-warn' : ''}
          segments={score === undefined ? undefined : [{ tone: brandTone === 'ok' ? 'ok' : 'warn', value: score }, { tone: 'track', value: 100 - score }]}
        />
      </div>
      {!summary && error !== null && (
        <div className="mkt-kpi-note"><InlineError title="No se pudieron cargar los indicadores." detail={loadErrorText(error)} onRetry={onRetry} /></div>
      )}
    </>
  );
}
