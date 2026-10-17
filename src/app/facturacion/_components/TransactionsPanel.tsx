'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowUpRight, RotateCw, TriangleAlert } from 'lucide-react';
import { useCachedJson } from '@/lib/use-cached-json';
import { formatMoney } from '@/lib/dashboard-summary';
import {
  guestName,
  methodLabel,
  paymentDate,
  sortPayments,
  statusLabel,
  type PaymentRow,
  type PaymentsResponse,
} from '@/lib/payments-view';
import { paymentTone, shortDate, singleCurrency, totalPayments } from './billing-model';
import { tabById } from './billing-tabs';
import { EmptyPreview } from './EmptyPreview';
import { PanelSkeleton } from './BillingSkeleton';

const URL_PAYMENTS = '/api/payments?limit=100';
const RECENT = 5;

function Kpi({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="card bl-kpi">
      <span className="bl-kpi-label">{label}</span>
      <strong className="bl-kpi-value">{value}</strong>
      <span className="bl-kpi-hint">{hint}</span>
    </div>
  );
}

function RecentRow({ p }: { p: PaymentRow }) {
  const who = guestName(p) || p.site?.name || p.booking?.reference || 'Sin vincular';
  return (
    <li className="bl-row">
      <div className="bl-row-main">
        <strong>{p.reference}</strong>
        <span>{who}</span>
      </div>
      <span className="bl-row-method">{methodLabel(p.method)}</span>
      <span className="bl-row-amount">{formatMoney(p.amountCents, p.currency)}</span>
      <span className={`badge badge-${paymentTone(p.status)}`}>{statusLabel(p.status)}</span>
      <time className="bl-row-date" dateTime={paymentDate(p)}>
        {shortDate(paymentDate(p))}
      </time>
    </li>
  );
}

/** Pestaña «Transacciones»: única con datos reales (lectura de /api/payments, sin escribir nada). */
export function TransactionsPanel() {
  const { data, error, loading, refresh, revalidating } = useCachedJson<PaymentsResponse>(URL_PAYMENTS);
  const tab = tabById('transactions');

  if (loading) return <PanelSkeleton />;

  if (error && !data) {
    return (
      <div className="card bl-error" role="alert">
        <TriangleAlert size={18} aria-hidden="true" />
        <div>
          <strong>No pudimos cargar las transacciones</strong>
          <p>
            {error === 'HTTP 403' ? 'Tu rol no tiene permiso para ver los pagos.' : 'Revisa tu conexión e inténtalo de nuevo.'}
          </p>
        </div>
        <button type="button" className="secondary btn-sm" onClick={() => void refresh()} disabled={revalidating}>
          <RotateCw size={14} aria-hidden="true" /> Reintentar
        </button>
      </div>
    );
  }

  const payments = data?.payments ?? [];
  const summary = data?.summary;
  const total = summary ? totalPayments(summary.statusCounts) : payments.length;

  const goPagos = (
    <Link href="/pagos" className="btn btn-primary">
      Ir a Pagos <ArrowUpRight size={14} aria-hidden="true" />
    </Link>
  );

  if (!summary || total === 0) return <EmptyPreview tab={tab} action={goPagos} />;

  const currency = singleCurrency(payments);
  const money = (cents: number) => (currency ? formatMoney(cents, currency) : '—');
  const counts = summary.statusCounts;
  const mixed = currency === null;
  const recent = sortPayments(payments).slice(0, RECENT);

  return (
    <div className="bl-live">
      <div className="bl-kpis">
        <Kpi label="Cobrado" value={money(summary.paidCents)} hint={`${counts.paid ?? 0} pagos cobrados`} />
        <Kpi label="Por cobrar" value={money(summary.pendingCents)} hint={`${(counts.pending ?? 0) + (counts.under_review ?? 0)} pendientes o en revisión`} />
        <Kpi label="Reembolsado" value={money(summary.refundedCents)} hint={`${counts.refunded ?? 0} reembolsos`} />
      </div>
      {mixed && (
        <p className="bl-hint">Hay pagos en varias monedas, por eso no se muestran totales sumados. Detalle por moneda en Pagos.</p>
      )}

      <section className="card bl-recent" aria-labelledby="bl-recent-title">
        <div className="bl-recent-head">
          <h3 id="bl-recent-title">Últimos movimientos</h3>
          <Link href="/pagos" className="bl-link">
            Ver todos en Pagos <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        </div>
        <ul className="bl-rows">
          {recent.map((p) => (
            <RecentRow key={p.id} p={p} />
          ))}
        </ul>
        <p className="bl-recent-foot">
          {total} {total === 1 ? 'pago registrado' : 'pagos registrados'} en el CRM. Los registra tu equipo; aún no se sincronizan solos con PayPal, Stripe o Mercado Pago.
        </p>
      </section>
    </div>
  );
}
