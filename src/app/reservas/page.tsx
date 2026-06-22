'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BedDouble, Plus, Search, Filter, Calendar as CalendarIcon, LogIn, LogOut,
  Clock, CheckCircle2, Ban, UserX, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { BookingStatusBadge, BOOKING_STATUS_LABELS, formatMoney } from '@/components/hotel/StatusBadges';
import { HelpTip } from '@/components/ui/HelpTip';

interface Booking {
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
  guest: { id: string; firstName: string; lastName: string | null; email: string | null; phone: string | null };
  site: { id: string; name: string };
  room: { id: string; number: string } | null;
}

const STATUS_TABS = [
  { id: '', label: 'Todas', icon: BedDouble },
  { id: 'pending', label: 'Pendientes', icon: Clock },
  { id: 'confirmed', label: 'Confirmadas', icon: CheckCircle2 },
  { id: 'checked_in', label: 'Check-in', icon: LogIn },
  { id: 'checked_out', label: 'Check-out', icon: LogOut },
  { id: 'cancelled', label: 'Canceladas', icon: Ban },
  { id: 'no_show', label: 'No-show', icon: UserX },
] as const;

export default function ReservasPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [byStatus, setByStatus] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (status) p.set('status', status);
      if (search.trim()) p.set('q', search.trim());
      const res = await fetch(`/api/bookings?${p.toString()}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setBookings(data.bookings || []);
      setByStatus(data.byStatus || {});
    } catch { toast.error('No se pudieron cargar reservas'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status]);
  useEffect(() => { const t = setTimeout(load, 350); return () => clearTimeout(t); /* eslint-disable-next-line */ }, [search]);

  const total = Object.values(byStatus).reduce((a, b) => a + b, 0);

  return (
    <div className="container">
      <div className="row-between mb-4" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="row" style={{ gap: 10, alignItems: 'center' }}>
            <BedDouble size={20} color="var(--rai-gold)" />
            <h1 className="h1" style={{ margin: 0 }}>Reservas</h1>
            <span className="badge badge-gold">{total} total</span>
            <HelpTip content="Gestión hotelera completa: huésped + sitio + habitación + fechas + pagos. El ciclo Confirmada → Check-in → Check-out actualiza automáticamente el inventario y métricas del huésped." />
          </div>
          <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
            Control de reservas hoteleras con check-in/out y pagos vinculados.
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="primary" onClick={() => setShowCreate(true)}>
            <Plus size={14} /> Nueva reserva
          </button>
        </div>
      </div>

      <div className="row" style={{ gap: 4, borderBottom: '1px solid var(--rai-border)', marginBottom: 16, flexWrap: 'wrap' }}>
        {STATUS_TABS.map(({ id, label, icon: Icon }) => {
          const count = id ? (byStatus[id] ?? 0) : total;
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
                fontSize: 13, fontWeight: isActive ? 600 : 500,
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

      <div className="row-between mb-4" style={{ gap: 8 }}>
        <button className="secondary btn-sm" onClick={() => toast('Filtros por fecha próximamente')}>
          <Filter size={14} /> Por fechas
        </button>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: 9, color: 'var(--rai-muted)' }} />
          <input
            className="input"
            placeholder="Referencia, huésped, email…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 30, width: 320, height: 32 }}
          />
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--rai-muted)' }}>Cargando…</div>
      ) : bookings.length === 0 ? (
        <div className="card" style={{ padding: 64, textAlign: 'center' }}>
          <BedDouble size={36} color="var(--rai-gold)" style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 16, fontWeight: 600 }}>Aún no hay reservas</div>
          <div style={{ fontSize: 13, color: 'var(--rai-muted)', maxWidth: 380, margin: '8px auto 20px' }}>
            Crea tu primera reserva. Para que funcione necesitas al menos un huésped y un sitio creados.
          </div>
          <button className="primary" onClick={() => setShowCreate(true)}>
            <Plus size={14} /> Crear primera reserva
          </button>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Referencia</th>
                <th>Huésped</th>
                <th>Sitio / Habitación</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Personas</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Pagado / Total</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td>
                    <Link href={`/reservas/${b.id}`} style={{ color: 'var(--rai-gold)', fontFamily: 'monospace', fontWeight: 600, textDecoration: 'none' }}>
                      {b.reference}
                    </Link>
                  </td>
                  <td>
                    <Link href={`/pasajeros/${b.guest.id}`} style={{ color: 'var(--rai-text)', textDecoration: 'none' }}>
                      {b.guest.firstName} {b.guest.lastName ?? ''}
                    </Link>
                  </td>
                  <td style={{ fontSize: 12 }}>
                    {b.site.name}
                    {b.room && <> · <span className="muted">Hab. {b.room.number}</span></>}
                  </td>
                  <td style={{ fontSize: 12 }}>{new Date(b.checkInDate).toLocaleDateString('es-DO')}</td>
                  <td style={{ fontSize: 12 }}>{new Date(b.checkOutDate).toLocaleDateString('es-DO')}</td>
                  <td style={{ fontSize: 12 }}>{b.adults}A {b.children > 0 ? `· ${b.children}N` : ''}</td>
                  <td><BookingStatusBadge status={b.status} /></td>
                  <td style={{ textAlign: 'right', fontSize: 12 }}>
                    <span style={{ color: 'var(--rai-success)', fontWeight: 600 }}>{formatMoney(b.paidAmountCents, b.currency)}</span>
                    <span className="muted"> / {formatMoney(b.totalAmountCents, b.currency)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && <CreateBookingModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />}
    </div>
  );
}

function CreateBookingModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [saving, setSaving] = useState(false);
  const [guests, setGuests] = useState<Array<{ id: string; firstName: string; lastName: string | null }>>([]);
  const [sites, setSites] = useState<Array<{ id: string; name: string }>>([]);
  const [rooms, setRooms] = useState<Array<{ id: string; number: string; status: string }>>([]);
  const [form, setForm] = useState({
    guestId: '', siteId: '', roomId: '',
    checkInDate: '', checkOutDate: '',
    adults: '1', children: '0',
    source: 'direct',
    totalAmount: '0', currency: 'USD',
    specialRequests: '', internalNotes: '',
  });

  useEffect(() => {
    fetch('/api/guests').then((r) => r.ok ? r.json() : { guests: [] }).then((d) => setGuests(d.guests || []));
    fetch('/api/sites').then((r) => r.ok ? r.json() : { sites: [] }).then((d) => setSites(d.sites || []));
  }, []);

  useEffect(() => {
    if (!form.siteId) { setRooms([]); return; }
    fetch(`/api/rooms?siteId=${form.siteId}`).then((r) => r.ok ? r.json() : { rooms: [] }).then((d) => setRooms(d.rooms || []));
  }, [form.siteId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.guestId || !form.siteId || !form.checkInDate || !form.checkOutDate) {
      toast.error('Huésped, sitio y fechas son obligatorios'); return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          adults: Number(form.adults) || 1,
          children: Number(form.children) || 0,
          totalAmountCents: Math.round(parseFloat(form.totalAmount) * 100) || 0,
          roomId: form.roomId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Reserva creada');
      onCreated();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Error'); }
    finally { setSaving(false); }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 680, width: '100%' }} onClick={(e) => e.stopPropagation()}>
        <div className="row-between" style={{ padding: '16px 20px', borderBottom: '1px solid var(--rai-border)' }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Nueva reserva</h3>
          <button className="ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={submit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="grid-2" style={{ gap: 12 }}>
            <div className="form-group">
              <label className="label">Huésped *</label>
              <select className="input" value={form.guestId} onChange={(e) => setForm({ ...form, guestId: e.target.value })} required>
                <option value="">— Selecciona —</option>
                {guests.map((g) => <option key={g.id} value={g.id}>{g.firstName} {g.lastName ?? ''}</option>)}
              </select>
              {guests.length === 0 && <div style={{ fontSize: 11, color: 'var(--rai-warning)', marginTop: 4 }}>
                ⚠ Crea huéspedes primero en <Link href="/pasajeros" style={{ color: 'var(--rai-gold)' }}>Pasajeros</Link>
              </div>}
            </div>
            <div className="form-group">
              <label className="label">Sitio *</label>
              <select className="input" value={form.siteId} onChange={(e) => setForm({ ...form, siteId: e.target.value, roomId: '' })} required>
                <option value="">— Selecciona —</option>
                {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Habitación (opcional)</label>
              <select className="input" value={form.roomId} onChange={(e) => setForm({ ...form, roomId: e.target.value })} disabled={!form.siteId}>
                <option value="">— Sin asignar —</option>
                {rooms.map((r) => <option key={r.id} value={r.id} disabled={r.status !== 'available'}>
                  Hab. {r.number} {r.status !== 'available' ? `(${r.status})` : ''}
                </option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">
                Origen <HelpTip content="Canal por donde llegó la reserva. Sirve para reportes de ventas por fuente." />
              </label>
              <select className="input" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
                <option value="direct">Directo</option>
                <option value="booking_com">Booking.com</option>
                <option value="airbnb">Airbnb</option>
                <option value="expedia">Expedia</option>
                <option value="walkin">Walk-in</option>
                <option value="phone">Teléfono</option>
                <option value="other">Otro</option>
              </select>
            </div>
            <div className="form-group">
              <label className="label">Check-in *</label>
              <input className="input" type="date" value={form.checkInDate} onChange={(e) => setForm({ ...form, checkInDate: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="label">Check-out *</label>
              <input className="input" type="date" value={form.checkOutDate} onChange={(e) => setForm({ ...form, checkOutDate: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="label">Adultos</label>
              <input className="input" type="number" min="1" value={form.adults} onChange={(e) => setForm({ ...form, adults: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="label">Niños</label>
              <input className="input" type="number" min="0" value={form.children} onChange={(e) => setForm({ ...form, children: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="label">Monto total</label>
              <input className="input" type="number" step="0.01" min="0" value={form.totalAmount} onChange={(e) => setForm({ ...form, totalAmount: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="label">Moneda</label>
              <select className="input" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                <option value="USD">USD</option>
                <option value="DOP">DOP</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="label">
              Solicitudes especiales <HelpTip content="Lo que pide el huésped: cuna, cama extra, vista al mar, alergias. Visible para staff de recepción." />
            </label>
            <textarea className="input" rows={2} value={form.specialRequests} onChange={(e) => setForm({ ...form, specialRequests: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="label">Notas internas</label>
            <textarea className="input" rows={2} value={form.internalNotes} onChange={(e) => setForm({ ...form, internalNotes: e.target.value })} />
          </div>
          <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" className="ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="primary" disabled={saving}>{saving ? 'Creando…' : 'Crear reserva'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
