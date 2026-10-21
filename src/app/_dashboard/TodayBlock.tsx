'use client';

import React from 'react';
import Link from 'next/link';
import { CalendarClock, CheckCircle2, CreditCard, Instagram, ListChecks, MessageSquareWarning, type LucideIcon } from 'lucide-react';
import { SkeletonLine } from '@/components/ui/Skeleton';
import {
  CHANNEL_LABELS,
  countLabel,
  formatClock,
  formatMoney,
  type DashboardToday,
  type TodayList,
} from '@/lib/dashboard-summary';

type Tone = 'gold' | 'purple' | 'teal' | 'warn';

interface Row { key: string; k: string; text: string; sub?: string }

interface Tile {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  tone: Tone;
  /** Resalta el número cuando hay algo que atender. */
  attention: boolean;
  list: TodayList<unknown>;
  rows: Row[];
  empty: string;
}

const ROWS = 3;

function buildTiles(t: DashboardToday): Tile[] {
  const tiles: Tile[] = [];
  if (t.appointments) {
    tiles.push({
      id: 'appointments', label: 'Citas de hoy', icon: CalendarClock, href: '/calendarios', tone: 'teal', attention: false,
      list: t.appointments, empty: 'Sin citas para hoy',
      rows: t.appointments.items.map((a) => ({ key: a.id, k: formatClock(a.startTime, t.tz), text: a.title, sub: a.contactName ?? undefined })),
    });
  }
  if (t.tasks) {
    tiles.push({
      id: 'tasks', label: 'Tareas de contacto', icon: ListChecks, href: '/conversaciones', tone: 'gold', attention: t.tasks.overdue > 0,
      list: t.tasks, empty: 'Sin tareas pendientes',
      rows: t.tasks.items.map((x) => ({
        key: x.id, k: x.overdue ? 'Vencida' : x.dueAt ? formatClock(x.dueAt, t.tz) : '—', text: x.title, sub: x.contactName,
      })),
    });
  }
  if (t.unanswered) {
    tiles.push({
      id: 'unanswered', label: 'Sin responder', icon: MessageSquareWarning, href: '/conversaciones', tone: 'warn', attention: t.unanswered.count > 0,
      list: t.unanswered, empty: 'Bandeja al día',
      rows: t.unanswered.items.map((c) => ({ key: c.id, k: `${c.unread} nuevo${c.unread === 1 ? '' : 's'}`, text: c.contactName, sub: CHANNEL_LABELS[c.channel] ?? c.channel })),
    });
  }
  if (t.payments) {
    tiles.push({
      id: 'payments', label: 'Pagos por revisar', icon: CreditCard, href: '/pagos', tone: 'warn', attention: t.payments.count > 0,
      list: t.payments, empty: 'Sin comprobantes pendientes',
      rows: t.payments.items.map((p) => ({ key: p.id, k: formatMoney(p.amountCents, p.currency), text: p.reference })),
    });
  }
  if (t.posts) {
    tiles.push({
      id: 'posts', label: 'Instagram por salir', icon: Instagram, href: '/automatizacion', tone: 'purple', attention: false,
      list: t.posts, empty: 'Nada programado para hoy',
      rows: t.posts.items.map((p) => ({ key: p.id, k: formatClock(p.scheduledAt, t.tz), text: p.dayNumber ? `Publicación del día ${p.dayNumber}` : 'Publicación programada' })),
    });
  }
  return tiles;
}

function TileSkeleton() {
  return (
    <div className="dsh-tile" aria-hidden="true">
      <div className="dsh-tile-head">
        <SkeletonLine width={32} height={32} />
        <SkeletonLine width="55%" height={12} />
        <SkeletonLine width={28} height={24} />
      </div>
      <ul className="dsh-tile-rows">
        {Array.from({ length: ROWS }, (_, i) => (
          <li key={i} className="dsh-row"><SkeletonLine width={i === 1 ? '70%' : '88%'} height={10} /></li>
        ))}
      </ul>
    </div>
  );
}

/** Bloque «Hoy»: lo accionable del día, con tarjetas de altura fija (sin saltos de diseño). */
export function TodayBlock({ today }: { today: DashboardToday | undefined }) {
  const tiles = today ? buildTiles(today) : [];
  const busy = today === undefined;

  return (
    <section className="dsh-section" data-tour="dash-today" aria-labelledby="dsh-today-title" aria-busy={busy}>
      <div className="dsh-sec-head">
        <h2 id="dsh-today-title">Hoy</h2>
        <small>Lo que pide tu atención ahora</small>
      </div>
      <div className="dsh-today">
        {busy && Array.from({ length: 5 }, (_, i) => <TileSkeleton key={i} />)}
        {tiles.map((tile) => {
          const Icon = tile.icon;
          const empty = tile.list.count === 0;
          return (
            <Link key={tile.id} href={tile.href} className={`dsh-tile is-${tile.tone}${tile.attention ? ' is-attn' : ''}`}>
              <div className="dsh-tile-head">
                <span className="dsh-tile-ico"><Icon size={16} /></span>
                <span className="dsh-tile-label">{tile.label}</span>
                <strong className="dsh-tile-count">{countLabel(tile.list.count, tile.list.more)}</strong>
              </div>
              <ul className="dsh-tile-rows">
                {empty ? (
                  <li className="dsh-row is-empty"><CheckCircle2 size={13} aria-hidden="true" /> <span className="dsh-row-t">{tile.empty}</span></li>
                ) : (
                  tile.rows.map((r) => (
                    <li key={r.key} className="dsh-row">
                      <span className="dsh-row-k">{r.k}</span>
                      <span className="dsh-row-t">{r.text}{r.sub ? <em>{r.sub}</em> : null}</span>
                    </li>
                  ))
                )}
              </ul>
            </Link>
          );
        })}
        {!busy && tiles.length === 0 && <p className="dsh-muted">Tu rol no tiene módulos operativos para resumir aquí.</p>}
      </div>
    </section>
  );
}
