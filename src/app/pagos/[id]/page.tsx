'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, CheckCircle2, XCircle, RefreshCw, Eye, Ban, CreditCard, Trash2, TriangleAlert, RotateCw,
  type LucideIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatMoney } from '@/components/hotel/StatusBadges';
import { EmptyState } from '@/components/ui/EmptyState';
import { invalidate } from '@/lib/swr-cache';
import { useCachedJson } from '@/lib/use-cached-json';
import { methodLabel, optimisticPatch, type PaymentAction } from '@/lib/payments-view';
import { DetailSkeleton } from '../PaymentsSkeleton';
import { StatusPill } from '../payment-meta';
import { PaymentDetailCards, type PaymentDetail } from '../PaymentDetailCards';
import {
  deletePayment, detailUrl, errorMessage, patchListCache, postTransition, removeFromListCache,
} from '../payments-client';

type Intent = 'primary' | 'danger' | 'secondary';
interface ActionDef { id: PaymentAction; label: string; icon: LucideIcon; intent: Intent }

const APPROVE: ActionDef = { id: 'approve', label: 'Aprobar', icon: CheckCircle2, intent: 'primary' };
const REJECT: ActionDef = { id: 'reject', label: 'Rechazar', icon: XCircle, intent: 'danger' };
const CANCEL: ActionDef = { id: 'cancel', label: 'Cancelar', icon: Ban, intent: 'secondary' };

const ACTIONS: Record<string, ActionDef[]> = {
  pending: [APPROVE, { id: 'review', label: 'Marcar en revisión', icon: Eye, intent: 'secondary' }, REJECT, CANCEL],
  under_review: [APPROVE, REJECT, CANCEL],
  paid: [{ id: 'refund', label: 'Reembolsar', icon: RefreshCw, intent: 'danger' }],
  failed: [{ id: 'review', label: 'Revisar de nuevo', icon: Eye, intent: 'secondary' }],
};

function confirmText(action: PaymentAction, amount: string): string {
  switch (action) {
    case 'approve': return '¿Aprobar este pago? Quedará registrado como cobrado.';
    case 'reject': return '¿Rechazar este pago? Pasará a estado fallido.';
    case 'cancel': return '¿Cancelar este pago? Ya no se podrá usar.';
    case 'review': return 'Marcar este pago como «en revisión».';
    case 'refund': return `¿Reembolsar ${amount}? Esta acción es irreversible.`;
  }
}

export default function PaymentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const url = detailUrl(id);
  const { data, error, loading, refresh, mutate } = useCachedJson<{ payment: PaymentDetail }>(url, { ttlMs: 10_000 });
  const [acting, setActing] = useState<PaymentAction | null>(null);
  const payment = data?.payment;

  async function doAction(action: PaymentAction) {
    if (!payment) return;
    const patch = optimisticPatch(payment, action, new Date().toISOString());
    if (!patch) return;
    if (!window.confirm(confirmText(action, formatMoney(payment.amountCents, payment.currency)))) return;
    const before = payment;
    setActing(action);
    const event = { id: `tmp-${Date.now()}`, action, fromStatus: before.status, toStatus: patch.status ?? null, meta: {}, createdAt: new Date().toISOString() };
    mutate({ payment: { ...before, ...patch, events: [event, ...before.events] } });
    patchListCache(before.id, patch);
    try {
      await postTransition(before.id, action, action === 'refund' ? before.amountCents : undefined);
      toast.success('Acción aplicada');
      void refresh();
    } catch (e) {
      mutate({ payment: before });
      patchListCache(before.id, { status: before.status, paidAt: before.paidAt });
      toast.error(errorMessage(e));
    } finally {
      setActing(null);
    }
  }

  async function handleDelete() {
    if (!payment || !window.confirm('¿Eliminar este pago? Solo se permite si no está aprobado.')) return;
    try {
      await deletePayment(payment.id);
      removeFromListCache(payment.id);
      invalidate(url);
      toast.success('Pago eliminado');
      router.push('/pagos');
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  if (loading) return <DetailSkeleton />;
  if (!payment) {
    const missing = error?.includes('404');
    return (
      <div className="container pg-page">
        <EmptyState
          icon={TriangleAlert}
          title={missing ? 'Pago no encontrado' : 'No se pudo cargar el pago'}
          text={missing ? 'Es posible que se haya eliminado o que no pertenezca a este espacio de trabajo.' : 'Revisa tu conexión e inténtalo de nuevo.'}
          action={missing
            ? <Link href="/pagos" className="btn secondary"><ArrowLeft size={14} /> Volver a pagos</Link>
            : <button type="button" className="primary" onClick={() => void refresh()}><RotateCw size={14} /> Reintentar</button>}
        />
      </div>
    );
  }

  const actions = ACTIONS[payment.status] ?? [];
  const canDelete = payment.status !== 'paid' && payment.status !== 'refunded';

  return (
    <div className="container pg-page">
      <nav className="pg-crumbs" aria-label="Ruta">
        <Link href="/pagos" className="pg-back" aria-label="Volver a pagos"><ArrowLeft size={16} /></Link>
        <Link href="/pagos" className="pg-crumb-link">Pagos</Link>
        <span aria-hidden="true">/</span>
        <span className="pg-crumb-now">{payment.reference}</span>
      </nav>

      <div className="card pg-detail-hero">
        <div className="pg-hero-main">
          <div className="pg-title">
            <CreditCard size={20} color="var(--rai-gold)" aria-hidden="true" />
            <h1 className="h1 pg-mono">{payment.reference}</h1>
            <StatusPill status={payment.status} />
          </div>
          <div className="pg-hero-amount">{formatMoney(payment.amountCents, payment.currency)}</div>
          <div className="pg-sub">
            Método: {methodLabel(payment.method)}
            {payment.transactionRef && <> · Transacción: <span className="pg-mono">{payment.transactionRef}</span></>}
          </div>
        </div>
        <div className="pg-hero-actions">
          {actions.map((a) => (
            <button key={a.id} type="button" className={a.intent} disabled={acting !== null} onClick={() => void doAction(a.id)}>
              <a.icon size={14} /> {acting === a.id ? 'Aplicando…' : a.label}
            </button>
          ))}
          {canDelete && (
            <button type="button" className="ghost btn-icon" onClick={() => void handleDelete()} title="Eliminar pago" aria-label="Eliminar pago">
              <Trash2 size={16} color="var(--rai-error)" />
            </button>
          )}
        </div>
      </div>

      <PaymentDetailCards payment={payment} />
    </div>
  );
}
