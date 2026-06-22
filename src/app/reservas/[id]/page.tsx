'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, BedDouble, User, CreditCard, FileText, LogIn, LogOut,
  CheckCircle2, Ban, UserX, Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { BookingStatusBadge, PaymentStatusBadge, formatMoney } from '@/components/hotel/StatusBadges';
import { HelpTip } from '@/components/ui/HelpTip';

interface BookingDetail {
  id: string;
  reference: string;
  status: string;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children: number;
  source: string;
  totalAmountCents: number;
  paidAmountCents: number;
  currency: string;
  specialRequests: string | null;
  internalNotes: string | null;
  cancelledReason: string | null;
  actualCheckIn: string | null;
  actualCheckOut: string | null;
  createdAt: string;
  guest: {
    id: string; firstName: string; lastName: string | null;
    email: string | null; phone: string | null;
  };
  site: { id: string; name: string };
  room: { id: string; number: string; roomType: { name: string } | null } | null;
  payments: Array<{ id: string; reference: string; status: string; amountCents: number; currency: string; method: string; createdAt: string }>;
}

const TRANSITIONS: Record<string, Array<{ status: string; label: string; icon: typeof LogIn; intent: 'primary' | 'danger' | 'secondary' }>> = {
  pending: [
    { status: 'confirmed', label: 'Confirmar', icon: CheckCircle2, intent: 'primary' },
    { status: 'cancelled', label: 'Cancelar', icon: Ban, intent: 'danger' },
  ],
  confirmed: [
    { status: 'checked_in', label: 'Check-in', icon: LogIn, intent: 'primary' },
    { status: 'no_show', label: 'No-show', icon: UserX, intent: 'danger' },
    { status: 'cancelled', label: 'Cancelar', icon: Ban, intent: 'secondary' },
  ],
  checked_in: [
    { status: 'checked_out', label: 'Check-out', icon: LogOut, intent: 'primary' },
  ],
};

export default function BookingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${params.id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setBooking(data.booking);
    } catch { toast.error('No se pudo cargar la reserva'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [params.id]);

  async function transition(nextStatus: string) {
    if (!booking) return;
    if (!confirm(`Cambiar estado a "${nextStatus}"?`)) return;
    setActing(nextStatus);
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error();
      toast.success('Estado actualizado');
      load();
    } catch { toast.error('Error'); }
    finally { setActing(null); }
  }

  async function handleDelete() {
    if (!booking) return;
    if (!confirm('¿Eliminar reserva? Solo si no tiene pagos.')) return;
    const res = await fetch(`/api/bookings/${booking.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error || 'Error'); return; }
    toast.success('Eliminada');
    router.push('/reservas');
  }

  if (loading) return <div className="container"><div style={{ padding: 40, textAlign: 'center', color: 'var(--rai-muted)' }}>Cargando…</div></div>;
  if (!booking) return <div className="container"><div style={{ padding: 40 }}>Reserva no encontrada.</div></div>;

  const transitions = TRANSITIONS[booking.status] ?? [];
  const balance = booking.totalAmountCents - booking.paidAmountCents;
  const nights = Math.ceil((new Date(booking.checkOutDate).getTime() - new Date(booking.checkInDate).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="container">
      <div className="row" style={{ gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <Link href="/reservas" className="ghost btn-icon" style={{ textDecoration: 'none' }}>
          <ArrowLeft size={16} />
        </Link>
        <span className="muted" style={{ fontSize: 13 }}>Reservas</span>
        <span className="muted" style={{ fontSize: 13 }}>/</span>
        <span style={{ fontSize: 13, fontFamily: 'monospace' }}>{booking.reference}</span>
      </div>

      <div className="card mb-4" style={{ padding: 20 }}>
        <div className="row-between" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div className="row" style={{ gap: 10, alignItems: 'center' }}>
              <BedDouble size={22} color="var(--rai-gold)" />
              <h1 className="h1" style={{ margin: 0, fontFamily: 'monospace' }}>{booking.reference}</h1>
              <BookingStatusBadge status={booking.status} size="md" />
            </div>
            <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
              {new Date(booking.checkInDate).toLocaleDateString('es-DO', { dateStyle: 'medium' })} → {new Date(booking.checkOutDate).toLocaleDateString('es-DO', { dateStyle: 'medium' })}
              {' · '}{nights} noche{nights !== 1 ? 's' : ''}
            </div>
          </div>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {transitions.map((t) => (
              <button
                key={t.status}
                className={t.intent}
                disabled={acting !== null}
                onClick={() => transition(t.status)}
              >
                <t.icon size={14} /> {acting === t.status ? '…' : t.label}
              </button>
            ))}
            <button className="ghost btn-icon" onClick={handleDelete} title="Eliminar"><Trash2 size={16} color="var(--rai-error)" /></button>
          </div>
        </div>

        <div className="grid-4" style={{ gap: 12, marginTop: 20 }}>
          <KpiMini label="Personas" value={`${booking.adults}A ${booking.children > 0 ? `· ${booking.children}N` : ''}`} hint="Adultos / niños registrados." />
          <KpiMini label="Total" value={formatMoney(booking.totalAmountCents, booking.currency)} hint="Monto total de la reserva (sin impuestos extra)." />
          <KpiMini label="Pagado" value={formatMoney(booking.paidAmountCents, booking.currency)} hint="Suma de pagos aprobados aplicados a esta reserva." />
          <KpiMini
            label="Saldo"
            value={formatMoney(balance, booking.currency)}
            hint="Total − Pagado. Si es mayor que 0, el huésped debe."
            color={balance > 0 ? 'var(--rai-warning)' : 'var(--rai-success)'}
          />
        </div>
      </div>

      <div className="grid-2" style={{ gap: 16 }}>
        <div className="card" style={{ padding: 16 }}>
          <div className="row" style={{ gap: 6, marginBottom: 12 }}>
            <User size={14} color="var(--rai-gold)" />
            <h3 style={{ margin: 0, fontSize: 14, color: 'var(--rai-gold)' }}>Huésped y alojamiento</h3>
          </div>
          <Field label="Huésped" value={
            <Link href={`/pasajeros/${booking.guest.id}`} style={{ color: 'var(--rai-text)', textDecoration: 'underline' }}>
              {booking.guest.firstName} {booking.guest.lastName ?? ''}
            </Link>
          } />
          {booking.guest.email && <Field label="Email" value={booking.guest.email} />}
          {booking.guest.phone && <Field label="Teléfono" value={booking.guest.phone} />}
          <Field label="Sitio" value={
            <Link href={`/sitios/${booking.site.id}`} style={{ color: 'var(--rai-text)', textDecoration: 'underline' }}>
              {booking.site.name}
            </Link>
          } />
          <Field label="Habitación" value={
            booking.room ? <>Hab. {booking.room.number}{booking.room.roomType && ` · ${booking.room.roomType.name}`}</> : null
          } />
          <Field label="Origen" value={booking.source} />
          <Field label="Creada" value={new Date(booking.createdAt).toLocaleString('es-DO')} />
          {booking.actualCheckIn && <Field label="Check-in real" value={new Date(booking.actualCheckIn).toLocaleString('es-DO')} />}
          {booking.actualCheckOut && <Field label="Check-out real" value={new Date(booking.actualCheckOut).toLocaleString('es-DO')} />}
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div className="row" style={{ gap: 6, marginBottom: 12 }}>
            <FileText size={14} color="var(--rai-gold)" />
            <h3 style={{ margin: 0, fontSize: 14, color: 'var(--rai-gold)' }}>Notas</h3>
          </div>
          <Field label="Solicitudes especiales" value={booking.specialRequests} />
          <Field label="Notas internas" value={booking.internalNotes} />
          {booking.cancelledReason && <Field label="Razón cancelación" value={booking.cancelledReason} />}
        </div>
      </div>

      <div className="card mt-4" style={{ padding: 16 }}>
        <div className="row-between" style={{ marginBottom: 12 }}>
          <div className="row" style={{ gap: 6 }}>
            <CreditCard size={14} color="var(--rai-gold)" />
            <h3 style={{ margin: 0, fontSize: 14, color: 'var(--rai-gold)' }}>Pagos vinculados</h3>
            <HelpTip content="Pagos asociados a esta reserva. Al aprobar un pago, se suma al total pagado automáticamente." />
          </div>
          <Link href={`/pagos?bookingId=${booking.id}`} className="ghost btn-sm" style={{ textDecoration: 'none' }}>
            Ver todos
          </Link>
        </div>
        {booking.payments.length === 0 ? (
          <div className="muted" style={{ fontSize: 13, padding: 12, textAlign: 'center' }}>Sin pagos registrados</div>
        ) : (
          <table className="table" style={{ width: '100%' }}>
            <thead>
              <tr><th>Referencia</th><th>Fecha</th><th>Método</th><th>Estado</th><th style={{ textAlign: 'right' }}>Monto</th></tr>
            </thead>
            <tbody>
              {booking.payments.map((p) => (
                <tr key={p.id}>
                  <td><Link href={`/pagos/${p.id}`} style={{ color: 'var(--rai-gold)', fontFamily: 'monospace', textDecoration: 'none' }}>{p.reference}</Link></td>
                  <td style={{ fontSize: 12 }}>{new Date(p.createdAt).toLocaleDateString('es-DO')}</td>
                  <td style={{ fontSize: 12, textTransform: 'capitalize' }}>{p.method}</td>
                  <td><PaymentStatusBadge status={p.status} /></td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatMoney(p.amountCents, p.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function KpiMini({ label, value, hint, color }: { label: string; value: React.ReactNode; hint: string; color?: string }) {
  return (
    <div className="card" style={{ padding: 14, background: 'rgba(201,168,76,0.04)' }}>
      <div className="row" style={{ gap: 4, alignItems: 'center' }}>
        <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
        <HelpTip content={hint} size={11} />
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: color ?? 'var(--rai-text)', marginTop: 4 }}>{value}</div>
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
