'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CreditCard, Plus, Search, Filter, Download, Wallet, Clock, CheckCircle2,
  XCircle, RefreshCw, Eye, X, TrendingUp, TrendingDown, Ban,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  PaymentStatusBadge, PAYMENT_STATUS_LABELS,
  formatMoney,
} from '@/components/hotel/StatusBadges';
import { HelpTip } from '@/components/ui/HelpTip';

interface Payment {
  id: string;
  reference: string;
  amountCents: number;
  currency: string;
  method: string;
  status: string;
  createdAt: string;
  paidAt: string | null;
  transactionRef: string | null;
  guest: { id: string; firstName: string; lastName: string | null } | null;
  booking: { id: string; reference: string } | null;
  site: { id: string; name: string } | null;
}

interface Summary {
  paidCents: number;
  pendingCents: number;
  refundedCents: number;
  statusCounts: Record<string, number>;
}

const STATUS_TABS = [
  { id: '', label: 'Todos', icon: Wallet },
  { id: 'pending', label: 'Pendientes', icon: Clock },
  { id: 'paid', label: 'Pagados', icon: CheckCircle2 },
  { id: 'under_review', label: 'En revisión', icon: Eye },
  { id: 'failed', label: 'Fallidos', icon: XCircle },
  { id: 'refunded', label: 'Reembolsados', icon: RefreshCw },
  { id: 'cancelled', label: 'Cancelados', icon: Ban },
] as const;

const METHODS = [
  { id: 'cash', label: 'Efectivo' },
  { id: 'card', label: 'Tarjeta' },
  { id: 'transfer', label: 'Transferencia' },
  { id: 'paypal', label: 'PayPal' },
  { id: 'stripe', label: 'Stripe' },
  { id: 'mercadopago', label: 'Mercado Pago' },
  { id: 'crypto', label: 'Crypto' },
  { id: 'check', label: 'Cheque' },
  { id: 'other', label: 'Otro' },
];

export default function PagosPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<Summary>({ paidCents: 0, pendingCents: 0, refundedCents: 0, statusCounts: {} });
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [method, setMethod] = useState('');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (method) params.set('method', method);
      if (search.trim()) params.set('q', search.trim());
      const res = await fetch(`/api/payments?${params.toString()}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPayments(data.payments || []);
      setSummary(data.summary || { paidCents: 0, pendingCents: 0, refundedCents: 0, statusCounts: {} });
    } catch { toast.error('No se pudieron cargar los pagos'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status, method]);
  useEffect(() => { const t = setTimeout(load, 350); return () => clearTimeout(t); /* eslint-disable-next-line */ }, [search]);

  const total = useMemo(() => Object.values(summary.statusCounts).reduce((a, b) => a + b, 0), [summary.statusCounts]);

  return (
    <div className="container">
      <div className="row-between mb-4" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="row" style={{ gap: 10, alignItems: 'center' }}>
            <CreditCard size={20} color="var(--rai-gold)" />
            <h1 className="h1" style={{ margin: 0 }}>Pagos</h1>
            <span className="badge badge-gold">{total} total</span>
            <HelpTip content="Centro de control financiero del negocio. Gestiona el ciclo completo: crear → aprobar → cobrar → reembolsar. Vincula pagos con huéspedes, reservas y sitios." />
          </div>
          <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
            Estado de cobros, conciliación y comprobantes de pago.
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="secondary" onClick={() => toast('Exportación CSV próximamente')}>
            <Download size={14} /> Exportar
          </button>
          <button className="primary" onClick={() => setShowCreate(true)}>
            <Plus size={14} /> Nuevo pago
          </button>
        </div>
      </div>

      <div className="grid-3 mb-4" style={{ gap: 12 }}>
        <SummaryCard
          icon={CheckCircle2} color="#2EC4B6"
          label="Cobrado" value={formatMoney(summary.paidCents)}
          hint="Suma de pagos en estado 'pagado'. Incluye todos los métodos." trend="up"
        />
        <SummaryCard
          icon={Clock} color="#FF9F1C"
          label="Por cobrar" value={formatMoney(summary.pendingCents)}
          hint="Pagos pendientes o en revisión que aún no han ingresado."
        />
        <SummaryCard
          icon={RefreshCw} color="#7B5EA7"
          label="Reembolsado" value={formatMoney(summary.refundedCents)}
          hint="Monto total devuelto a clientes." trend="down"
        />
      </div>

      <div className="row" style={{ gap: 4, borderBottom: '1px solid var(--rai-border)', marginBottom: 16, flexWrap: 'wrap' }}>
        {STATUS_TABS.map(({ id, label, icon: Icon }) => {
          const count = id ? (summary.statusCounts[id] ?? 0) : total;
          const isActive = status === id;
          return (
            <button
              key={id || 'all'}
              onClick={() => setStatus(id)}
              className="ghost"
              style={{
                padding: '10px 14px',
                borderBottom: isActive ? '2px solid var(--rai-gold)' : '2px solid transparent',
                color: isActive ? 'var(--rai-gold)' : 'var(--rai-muted)',
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                display: 'inline-flex', gap: 6, alignItems: 'center',
              }}
            >
              <Icon size={14} /> {label}
              <span style={{
                background: isActive ? 'rgba(201,168,76,0.18)' : 'rgba(136,136,170,0.12)',
                borderRadius: 4, padding: '0 6px', fontSize: 11, minWidth: 18, textAlign: 'center',
              }}>{count}</span>
            </button>
          );
        })}
      </div>

      <div className="row-between mb-4" style={{ flexWrap: 'wrap', gap: 8 }}>
        <div className="row" style={{ gap: 8 }}>
          <select className="input" value={method} onChange={(e) => setMethod(e.target.value)} style={{ height: 32, width: 180 }}>
            <option value="">Todos los métodos</option>
            {METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
          <button className="secondary btn-sm" onClick={() => toast('Filtros por fecha próximamente')}>
            <Filter size={14} /> Filtros avanzados
          </button>
        </div>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: 9, color: 'var(--rai-muted)' }} />
          <input
            className="input"
            placeholder="Referencia, transacción, notas…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 30, width: 320, height: 32 }}
          />
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--rai-muted)' }}>Cargando…</div>
        ) : payments.length === 0 ? (
          <div style={{ padding: 64, textAlign: 'center' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', margin: '0 auto 16px',
              background: 'rgba(201,168,76,0.08)', border: '1px solid var(--rai-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CreditCard size={28} color="var(--rai-gold)" />
            </div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Aún no hay pagos registrados</div>
            <div style={{ fontSize: 13, color: 'var(--rai-muted)', maxWidth: 380, margin: '8px auto 20px' }}>
              Crea el primer pago para empezar a llevar control de cobros y conciliación.
            </div>
            <button className="primary" onClick={() => setShowCreate(true)}>
              <Plus size={14} /> Registrar primer pago
            </button>
          </div>
        ) : (
          <table className="table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Referencia</th>
                <th>Huésped</th>
                <th>Reserva</th>
                <th>Método</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Monto</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/pagos/${p.id}`} style={{ color: 'var(--rai-gold)', fontFamily: 'monospace', textDecoration: 'none', fontWeight: 600 }}>
                      {p.reference}
                    </Link>
                  </td>
                  <td>
                    {p.guest ? (
                      <Link href={`/pasajeros/${p.guest.id}`} style={{ color: 'var(--rai-text)', textDecoration: 'none' }}>
                        {p.guest.firstName} {p.guest.lastName ?? ''}
                      </Link>
                    ) : <span className="muted">—</span>}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                    {p.booking ? <Link href={`/reservas/${p.booking.id}`} style={{ color: 'var(--rai-muted)', textDecoration: 'none' }}>{p.booking.reference}</Link> : <span className="muted">—</span>}
                  </td>
                  <td style={{ fontSize: 12, textTransform: 'capitalize' }}>{p.method}</td>
                  <td style={{ fontSize: 12 }}>{new Date(p.paidAt ?? p.createdAt).toLocaleDateString('es-DO')}</td>
                  <td><PaymentStatusBadge status={p.status} /></td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: p.status === 'paid' ? 'var(--rai-success)' : 'var(--rai-text)' }}>
                    {formatMoney(p.amountCents, p.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && <CreatePaymentModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />}
    </div>
  );
}

function SummaryCard({
  icon: Icon, color, label, value, hint, trend,
}: { icon: typeof CheckCircle2; color: string; label: string; value: string; hint: string; trend?: 'up' | 'down' }) {
  return (
    <div className="card" style={{ padding: 16, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: color, opacity: 0.5 }} />
      <div className="row" style={{ gap: 10, marginBottom: 6, alignItems: 'center' }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: `${color}20`, color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={16} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
        </div>
        <HelpTip content={hint} size={12} />
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--rai-text)' }}>
        {value}
        {trend === 'up' && <TrendingUp size={14} style={{ marginLeft: 6, color: 'var(--rai-success)' }} />}
        {trend === 'down' && <TrendingDown size={14} style={{ marginLeft: 6, color: 'var(--rai-error)' }} />}
      </div>
    </div>
  );
}

function CreatePaymentModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [saving, setSaving] = useState(false);
  const [guests, setGuests] = useState<Array<{ id: string; firstName: string; lastName: string | null }>>([]);
  const [bookings, setBookings] = useState<Array<{ id: string; reference: string }>>([]);
  const [form, setForm] = useState({
    guestId: '', bookingId: '',
    amount: '', currency: 'USD',
    method: 'cash', status: 'pending',
    transactionRef: '', notes: '',
  });

  useEffect(() => {
    fetch('/api/guests').then((r) => r.ok ? r.json() : { guests: [] }).then((d) => setGuests(d.guests || []));
    fetch('/api/bookings').then((r) => r.ok ? r.json() : { bookings: [] }).then((d) => setBookings(d.bookings || []));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) { toast.error('Monto inválido'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          amountCents: Math.round(amount * 100),
          guestId: form.guestId || undefined,
          bookingId: form.bookingId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Pago creado');
      onCreated();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Error'); }
    finally { setSaving(false); }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 600, width: '100%' }} onClick={(e) => e.stopPropagation()}>
        <div className="row-between" style={{ padding: '16px 20px', borderBottom: '1px solid var(--rai-border)' }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Nuevo pago</h3>
          <button className="ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={submit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="grid-2" style={{ gap: 12 }}>
            <div className="form-group">
              <label className="label">Monto *</label>
              <input className="input" type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required autoFocus />
            </div>
            <div className="form-group">
              <label className="label">Moneda</label>
              <select className="input" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                <option value="USD">USD</option>
                <option value="DOP">DOP</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            <div className="form-group">
              <label className="label">Método</label>
              <select className="input" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                {METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">
                Estado inicial <HelpTip content="'Pendiente' espera aprobación. 'Pagado' marca el pago como cobrado de inmediato." />
              </label>
              <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Huésped (opcional)</label>
              <select className="input" value={form.guestId} onChange={(e) => setForm({ ...form, guestId: e.target.value })}>
                <option value="">— Sin huésped —</option>
                {guests.map((g) => <option key={g.id} value={g.id}>{g.firstName} {g.lastName ?? ''}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Reserva (opcional)</label>
              <select className="input" value={form.bookingId} onChange={(e) => setForm({ ...form, bookingId: e.target.value })}>
                <option value="">— Sin reserva —</option>
                {bookings.map((b) => <option key={b.id} value={b.id}>{b.reference}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="label">
                Referencia de transacción <HelpTip content="ID externo: Stripe charge_id, número de transferencia, voucher, etc." />
              </label>
              <input className="input" value={form.transactionRef} onChange={(e) => setForm({ ...form, transactionRef: e.target.value })} placeholder="ch_3OxN... / TX-2024-001" />
            </div>
          </div>
          <div className="form-group">
            <label className="label">Notas</label>
            <textarea className="input" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="row" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <button type="button" className="ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="primary" disabled={saving}>{saving ? 'Creando…' : 'Registrar pago'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
