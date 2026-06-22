'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, CheckCircle2, XCircle, RefreshCw, Eye, Ban, FileText,
  CreditCard, User, BedDouble, Building2, Activity, Trash2, Upload,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PaymentStatusBadge, formatMoney } from '@/components/hotel/StatusBadges';
import { HelpTip } from '@/components/ui/HelpTip';

interface PaymentDetail {
  id: string;
  reference: string;
  amountCents: number;
  currency: string;
  method: string;
  status: string;
  createdAt: string;
  paidAt: string | null;
  approvedAt: string | null;
  refundedAt: string | null;
  refundedAmountCents: number;
  proofUrl: string | null;
  transactionRef: string | null;
  notes: string | null;
  internalComments: string | null;
  guest: { id: string; firstName: string; lastName: string | null; email: string | null; phone: string | null } | null;
  booking: { id: string; reference: string; checkInDate: string; checkOutDate: string } | null;
  site: { id: string; name: string } | null;
  events: Array<{
    id: string; action: string; fromStatus: string | null; toStatus: string | null;
    meta: Record<string, unknown>; createdAt: string;
  }>;
}

const ACTIONS: Record<string, Array<{ id: 'approve' | 'reject' | 'cancel' | 'review' | 'refund'; label: string; icon: typeof CheckCircle2; intent: 'primary' | 'danger' | 'secondary' }>> = {
  pending: [
    { id: 'approve', label: 'Aprobar', icon: CheckCircle2, intent: 'primary' },
    { id: 'review', label: 'Marcar en revisión', icon: Eye, intent: 'secondary' },
    { id: 'reject', label: 'Rechazar', icon: XCircle, intent: 'danger' },
    { id: 'cancel', label: 'Cancelar', icon: Ban, intent: 'secondary' },
  ],
  under_review: [
    { id: 'approve', label: 'Aprobar', icon: CheckCircle2, intent: 'primary' },
    { id: 'reject', label: 'Rechazar', icon: XCircle, intent: 'danger' },
    { id: 'cancel', label: 'Cancelar', icon: Ban, intent: 'secondary' },
  ],
  paid: [
    { id: 'refund', label: 'Reembolsar', icon: RefreshCw, intent: 'danger' },
  ],
  failed: [
    { id: 'review', label: 'Revisar de nuevo', icon: Eye, intent: 'secondary' },
  ],
};

export default function PaymentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [payment, setPayment] = useState<PaymentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/payments/${params.id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPayment(data.payment);
    } catch { toast.error('No se pudo cargar el pago'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [params.id]);

  async function doAction(action: 'approve' | 'reject' | 'cancel' | 'review' | 'refund') {
    if (!payment) return;
    const labels: Record<typeof action, string> = {
      approve: '¿Aprobar este pago? Quedará registrado como cobrado.',
      reject: '¿Rechazar este pago? Pasará a estado fallido.',
      cancel: '¿Cancelar este pago? No se podrá usar.',
      review: 'Marcar este pago como "en revisión".',
      refund: `¿Reembolsar ${formatMoney(payment.amountCents, payment.currency)}? Esta acción es irreversible.`,
    };
    if (!confirm(labels[action])) return;
    setActing(action);
    try {
      const body: Record<string, unknown> = { action };
      if (action === 'refund') body.refundAmountCents = payment.amountCents;
      const res = await fetch(`/api/payments/${payment.id}/transition`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Acción aplicada');
      load();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Error'); }
    finally { setActing(null); }
  }

  async function handleDelete() {
    if (!payment) return;
    if (!confirm('¿Eliminar este pago? Solo se permite si no está aprobado.')) return;
    const res = await fetch(`/api/payments/${payment.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error || 'Error'); return; }
    toast.success('Pago eliminado');
    router.push('/pagos');
  }

  if (loading) return <div className="container"><div style={{ padding: 40, textAlign: 'center', color: 'var(--rai-muted)' }}>Cargando…</div></div>;
  if (!payment) return <div className="container"><div style={{ padding: 40 }}>Pago no encontrado.</div></div>;

  const actions = ACTIONS[payment.status] ?? [];
  const canDelete = payment.status !== 'paid' && payment.status !== 'refunded';

  return (
    <div className="container">
      <div className="row" style={{ gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <Link href="/pagos" className="ghost btn-icon" style={{ textDecoration: 'none' }}>
          <ArrowLeft size={16} />
        </Link>
        <span className="muted" style={{ fontSize: 13 }}>Pagos</span>
        <span className="muted" style={{ fontSize: 13 }}>/</span>
        <span style={{ fontSize: 13, color: 'var(--rai-text)', fontFamily: 'monospace' }}>{payment.reference}</span>
      </div>

      <div className="card mb-4" style={{ padding: 20 }}>
        <div className="row-between" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div className="row" style={{ gap: 10, alignItems: 'center' }}>
              <CreditCard size={20} color="var(--rai-gold)" />
              <h1 className="h1" style={{ margin: 0, fontFamily: 'monospace' }}>{payment.reference}</h1>
              <PaymentStatusBadge status={payment.status} size="md" />
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--rai-gold)', marginTop: 8 }}>
              {formatMoney(payment.amountCents, payment.currency)}
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 4, textTransform: 'capitalize' }}>
              Método: {payment.method}
              {payment.transactionRef && (<> · TX: <span style={{ fontFamily: 'monospace' }}>{payment.transactionRef}</span></>)}
            </div>
          </div>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {actions.map((a) => (
              <button
                key={a.id}
                className={a.intent}
                disabled={acting !== null}
                onClick={() => doAction(a.id)}
              >
                <a.icon size={14} /> {acting === a.id ? '…' : a.label}
              </button>
            ))}
            {canDelete && (
              <button className="ghost btn-icon" onClick={handleDelete} title="Eliminar pago" aria-label="Eliminar">
                <Trash2 size={16} color="var(--rai-error)" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ gap: 16 }}>
        <div className="card" style={{ padding: 16 }}>
          <div className="row" style={{ gap: 6, marginBottom: 12 }}>
            <User size={14} color="var(--rai-gold)" />
            <h3 style={{ margin: 0, fontSize: 14, color: 'var(--rai-gold)' }}>Relaciones</h3>
          </div>
          {payment.guest ? (
            <Field label="Huésped" value={
              <Link href={`/pasajeros/${payment.guest.id}`} style={{ color: 'var(--rai-text)', textDecoration: 'underline' }}>
                {payment.guest.firstName} {payment.guest.lastName ?? ''}
              </Link>
            } />
          ) : <Field label="Huésped" value={null} />}
          {payment.guest?.email && <Field label="Email huésped" value={payment.guest.email} />}
          {payment.guest?.phone && <Field label="Tel. huésped" value={payment.guest.phone} />}
          {payment.booking ? (
            <Field label="Reserva" value={
              <Link href={`/reservas/${payment.booking.id}`} style={{ color: 'var(--rai-text)', textDecoration: 'underline', fontFamily: 'monospace' }}>
                {payment.booking.reference}
              </Link>
            } />
          ) : <Field label="Reserva" value={null} />}
          {payment.booking && (
            <Field
              label="Estancia"
              value={`${new Date(payment.booking.checkInDate).toLocaleDateString('es-DO')} → ${new Date(payment.booking.checkOutDate).toLocaleDateString('es-DO')}`}
            />
          )}
          {payment.site ? (
            <Field label="Sitio" value={
              <Link href={`/sitios/${payment.site.id}`} style={{ color: 'var(--rai-text)', textDecoration: 'underline' }}>
                {payment.site.name}
              </Link>
            } />
          ) : <Field label="Sitio" value={null} />}
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div className="row" style={{ gap: 6, marginBottom: 12 }}>
            <FileText size={14} color="var(--rai-gold)" />
            <h3 style={{ margin: 0, fontSize: 14, color: 'var(--rai-gold)' }}>Detalles</h3>
          </div>
          <Field label="Fecha creación" value={new Date(payment.createdAt).toLocaleString('es-DO')} />
          {payment.paidAt && <Field label="Fecha cobro" value={new Date(payment.paidAt).toLocaleString('es-DO')} />}
          {payment.approvedAt && <Field label="Aprobado" value={new Date(payment.approvedAt).toLocaleString('es-DO')} />}
          {payment.refundedAt && (
            <>
              <Field label="Reembolsado" value={new Date(payment.refundedAt).toLocaleString('es-DO')} />
              <Field label="Monto reembolso" value={formatMoney(payment.refundedAmountCents, payment.currency)} />
            </>
          )}
          <Field label="Comprobante" value={
            payment.proofUrl ? (
              <a href={payment.proofUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--rai-gold)' }}>
                Ver documento
              </a>
            ) : (
              <button className="ghost btn-sm" onClick={() => toast('Upload de comprobante próximamente')}>
                <Upload size={12} /> Subir comprobante
              </button>
            )
          } />
          <Field label="Notas" value={payment.notes} />
          <Field label="Comentarios internos" value={payment.internalComments} />
        </div>
      </div>

      <div className="card mt-4" style={{ padding: 16 }}>
        <div className="row" style={{ gap: 6, marginBottom: 12 }}>
          <Activity size={14} color="var(--rai-gold)" />
          <h3 style={{ margin: 0, fontSize: 14, color: 'var(--rai-gold)' }}>Historial de cambios</h3>
          <HelpTip content="Registro de todas las acciones realizadas sobre este pago: creación, aprobación, rechazo, reembolso. Útil para auditoría." />
        </div>
        {payment.events.length === 0 ? (
          <div className="muted" style={{ fontSize: 13, padding: 12, textAlign: 'center' }}>Sin eventos registrados</div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {payment.events.map((ev) => (
              <li key={ev.id} className="row" style={{ gap: 12, padding: 10, borderLeft: '2px solid var(--rai-gold)', background: 'rgba(201,168,76,0.04)', borderRadius: 4 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, textTransform: 'capitalize' }}>{ev.action.replace(/_/g, ' ')}</div>
                  {ev.fromStatus && ev.toStatus && (
                    <div className="muted" style={{ fontSize: 11 }}>{ev.fromStatus} → {ev.toStatus}</div>
                  )}
                </div>
                <div className="muted" style={{ fontSize: 11 }}>
                  {new Date(ev.createdAt).toLocaleString('es-DO')}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 8, display: 'grid', gridTemplateColumns: '160px 1fr', gap: 8, fontSize: 13 }}>
      <span className="muted">{label}</span>
      <span style={{ color: 'var(--rai-text)' }}>{value || <span className="muted">—</span>}</span>
    </div>
  );
}
