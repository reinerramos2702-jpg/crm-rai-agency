'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Building2, BedDouble, MapPin, Plus, Edit2, Trash2,
  TrendingUp, Users as UsersIcon, X, Save,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  SiteStatusBadge, RoomStatusBadge, ROOM_STATUS_LABELS, SITE_STATUS_LABELS,
  formatMoney,
} from '@/components/hotel/StatusBadges';
import { HelpTip } from '@/components/ui/HelpTip';

interface Room {
  id: string;
  number: string;
  floor: string | null;
  status: string;
  notes: string | null;
  roomType: { id: string; name: string } | null;
}

interface SiteDetail {
  id: string;
  name: string;
  slug: string;
  type: string;
  address: string | null;
  city: string | null;
  country: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  capacity: number;
  status: string;
  notes: string | null;
  rooms: Room[];
  _count: { bookings: number; payments: number };
}

export default function SiteDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [site, setSite] = useState<SiteDetail | null>(null);
  const [metrics, setMetrics] = useState<{ activeBookings: number; monthRevenueCents: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRoom, setShowRoom] = useState(false);
  const [editing, setEditing] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/sites/${params.id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSite(data.site);
      setMetrics(data.metrics);
    } catch { toast.error('No se pudo cargar el sitio'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [params.id]);

  async function handleDelete() {
    if (!site) return;
    if (!confirm(`¿Eliminar "${site.name}"? Solo si no tiene habitaciones ni reservas.`)) return;
    const res = await fetch(`/api/sites/${site.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error || 'Error'); return; }
    toast.success('Sitio eliminado');
    router.push('/sitios');
  }

  if (loading) return <div className="container"><div style={{ padding: 40, textAlign: 'center', color: 'var(--rai-muted)' }}>Cargando…</div></div>;
  if (!site) return <div className="container"><div style={{ padding: 40 }}>Sitio no encontrado.</div></div>;

  return (
    <div className="container">
      <div className="row" style={{ gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <Link href="/sitios" className="ghost btn-icon" style={{ textDecoration: 'none' }}>
          <ArrowLeft size={16} />
        </Link>
        <span className="muted" style={{ fontSize: 13 }}>Sitios</span>
        <span className="muted" style={{ fontSize: 13 }}>/</span>
        <span style={{ fontSize: 13 }}>{site.name}</span>
      </div>

      <div className="card mb-4" style={{ padding: 20 }}>
        <div className="row-between" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div className="row" style={{ gap: 10, alignItems: 'center' }}>
              <Building2 size={22} color="var(--rai-gold)" />
              <h1 className="h1" style={{ margin: 0 }}>{site.name}</h1>
              <SiteStatusBadge status={site.status} size="md" />
            </div>
            {(site.address || site.city || site.country) && (
              <div className="muted" style={{ fontSize: 13, marginTop: 6, display: 'flex', gap: 4, alignItems: 'center' }}>
                <MapPin size={12} /> {[site.address, site.city, site.country].filter(Boolean).join(', ')}
              </div>
            )}
          </div>
          <div className="row" style={{ gap: 8 }}>
            {!editing && <button className="secondary" onClick={() => setEditing(true)}><Edit2 size={14} /> Editar</button>}
            <button className="danger" onClick={handleDelete}><Trash2 size={14} /> Eliminar</button>
          </div>
        </div>

        <div className="grid-4" style={{ gap: 12, marginTop: 20 }}>
          <KpiMini label="Habitaciones" value={site.rooms.length} hint="Total de habitaciones registradas en este sitio." />
          <KpiMini label="Reservas totales" value={site._count.bookings} hint="Histórico de reservas asociadas a este sitio." />
          <KpiMini label="Reservas activas" value={metrics?.activeBookings ?? 0} hint="Reservas en estado 'confirmada' o 'check-in'." />
          <KpiMini label="Ingresos del mes" value={formatMoney(metrics?.monthRevenueCents ?? 0)} hint="Suma de pagos cobrados en el mes actual asociados a este sitio." />
        </div>
      </div>

      {editing && <EditForm site={site} onCancel={() => setEditing(false)} onSaved={() => { setEditing(false); load(); }} />}

      <div className="row-between mb-4" style={{ marginTop: 20 }}>
        <h2 className="h2" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <BedDouble size={18} color="var(--rai-gold)" /> Habitaciones
          <span className="badge badge-gold">{site.rooms.length}</span>
          <HelpTip content="Inventario físico del sitio. Cada habitación se puede asignar a reservas y cambiar de estado (disponible, ocupada, limpieza, mantenimiento)." />
        </h2>
        <button className="primary btn-sm" onClick={() => setShowRoom(true)}>
          <Plus size={14} /> Añadir habitación
        </button>
      </div>

      {site.rooms.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <BedDouble size={32} color="var(--rai-gold)" style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 14, fontWeight: 600 }}>Aún no tienes habitaciones</div>
          <p className="muted" style={{ fontSize: 12, marginTop: 4, marginBottom: 12 }}>
            Añade tu inventario para empezar a registrar reservas.
          </p>
          <button className="primary btn-sm" onClick={() => setShowRoom(true)}>
            <Plus size={14} /> Crear primera habitación
          </button>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Número</th>
                <th>Piso</th>
                <th>Tipo</th>
                <th>Estado</th>
                <th>Notas</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {site.rooms.map((r) => (
                <RoomRow key={r.id} room={r} onChange={load} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showRoom && <CreateRoomModal siteId={site.id} onClose={() => setShowRoom(false)} onCreated={() => { setShowRoom(false); load(); }} />}
    </div>
  );
}

function KpiMini({ label, value, hint }: { label: string; value: React.ReactNode; hint: string }) {
  return (
    <div className="card" style={{ padding: 14, background: 'rgba(201,168,76,0.04)' }}>
      <div className="row" style={{ gap: 4, alignItems: 'center' }}>
        <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
        <HelpTip content={hint} size={11} />
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--rai-text)', marginTop: 4 }}>{value}</div>
    </div>
  );
}

function RoomRow({ room, onChange }: { room: Room; onChange: () => void }) {
  const [status, setStatus] = useState(room.status);
  async function setStatusServer(next: string) {
    setStatus(next);
    const res = await fetch(`/api/rooms/${room.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
    if (!res.ok) { toast.error('Error'); setStatus(room.status); return; }
    toast.success('Estado actualizado');
    onChange();
  }
  async function del() {
    if (!confirm(`¿Eliminar habitación ${room.number}?`)) return;
    const res = await fetch(`/api/rooms/${room.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error || 'Error'); return; }
    toast.success('Eliminada');
    onChange();
  }
  return (
    <tr>
      <td style={{ fontWeight: 600 }}>{room.number}</td>
      <td>{room.floor ?? <span className="muted">—</span>}</td>
      <td>{room.roomType?.name ?? <span className="muted">—</span>}</td>
      <td>
        <select className="input btn-sm" value={status} onChange={(e) => setStatusServer(e.target.value)} style={{ width: 160 }}>
          {Object.entries(ROOM_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </td>
      <td style={{ fontSize: 12, color: 'var(--rai-muted)' }}>{room.notes ?? '—'}</td>
      <td style={{ textAlign: 'right' }}>
        <button className="ghost btn-icon" onClick={del} aria-label="Eliminar"><Trash2 size={14} color="var(--rai-error)" /></button>
      </td>
    </tr>
  );
}

function CreateRoomModal({ siteId, onClose, onCreated }: { siteId: string; onClose: () => void; onCreated: () => void }) {
  const [saving, setSaving] = useState(false);
  const [roomTypes, setRoomTypes] = useState<Array<{ id: string; name: string }>>([]);
  const [form, setForm] = useState({ number: '', floor: '', roomTypeId: '', status: 'available', notes: '' });

  useEffect(() => {
    fetch('/api/room-types').then((r) => r.ok ? r.json() : { roomTypes: [] }).then((d) => setRoomTypes(d.roomTypes || []));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.number.trim()) { toast.error('Número obligatorio'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, ...form, roomTypeId: form.roomTypeId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Habitación creada');
      onCreated();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Error'); }
    finally { setSaving(false); }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div className="row-between" style={{ padding: '16px 20px', borderBottom: '1px solid var(--rai-border)' }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Nueva habitación</h3>
          <button className="ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={submit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="grid-2" style={{ gap: 12 }}>
            <div className="form-group">
              <label className="label">Número *</label>
              <input className="input" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} required autoFocus placeholder="101, A-203, Suite 5…" />
            </div>
            <div className="form-group">
              <label className="label">Piso</label>
              <input className="input" value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="label">Tipo</label>
              <select className="input" value={form.roomTypeId} onChange={(e) => setForm({ ...form, roomTypeId: e.target.value })}>
                <option value="">— Sin tipo —</option>
                {roomTypes.map((rt) => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="label">Estado inicial</label>
              <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {Object.entries(ROOM_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="label">Notas</label>
            <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" className="ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="primary" disabled={saving}>{saving ? 'Creando…' : 'Crear'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditForm({ site, onCancel, onSaved }: { site: SiteDetail; onCancel: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: site.name, type: site.type,
    address: site.address ?? '', city: site.city ?? '', country: site.country ?? '',
    contactName: site.contactName ?? '', contactPhone: site.contactPhone ?? '', contactEmail: site.contactEmail ?? '',
    capacity: String(site.capacity), status: site.status, notes: site.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      const res = await fetch(`/api/sites/${site.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, capacity: Number(form.capacity) || 0 }),
      });
      if (!res.ok) throw new Error();
      toast.success('Guardado'); onSaved();
    } catch { toast.error('Error'); } finally { setSaving(false); }
  }
  return (
    <form onSubmit={submit} className="card mb-4" style={{ padding: 20 }}>
      <div className="grid-2" style={{ gap: 12 }}>
        <div className="form-group"><label className="label">Nombre</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="form-group"><label className="label">Estado</label>
          <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            {Object.entries(SITE_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ gridColumn: 'span 2' }}><label className="label">Dirección</label><input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
        <div className="form-group"><label className="label">Ciudad</label><input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
        <div className="form-group"><label className="label">País</label><input className="input" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} maxLength={3} /></div>
        <div className="form-group"><label className="label">Contacto</label><input className="input" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} /></div>
        <div className="form-group"><label className="label">Tel. contacto</label><input className="input" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} /></div>
        <div className="form-group"><label className="label">Email contacto</label><input className="input" type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} /></div>
        <div className="form-group"><label className="label">Aforo</label><input className="input" type="number" min="0" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} /></div>
      </div>
      <div className="form-group" style={{ marginTop: 12 }}>
        <label className="label">Notas</label>
        <textarea className="input" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </div>
      <div className="row" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
        <button type="button" className="ghost" onClick={onCancel}><X size={14} /> Cancelar</button>
        <button type="submit" className="primary" disabled={saving}><Save size={14} /> {saving ? 'Guardando…' : 'Guardar'}</button>
      </div>
    </form>
  );
}
