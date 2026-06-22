'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Globe, Plus, Search, Building2, MapPin, Users as UsersIcon, Phone,
  BedDouble, X, ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { SiteStatusBadge, SITE_STATUS_LABELS } from '@/components/hotel/StatusBadges';
import { HelpTip } from '@/components/ui/HelpTip';

interface Site {
  id: string;
  name: string;
  slug: string;
  type: string;
  city: string | null;
  country: string | null;
  address: string | null;
  capacity: number;
  status: string;
  contactName: string | null;
  contactPhone: string | null;
  _count: { rooms: number; bookings: number; payments: number };
}

const TYPE_LABELS: Record<string, string> = {
  hotel: 'Hotel',
  restaurant: 'Restaurante',
  office: 'Oficina',
  venue: 'Local',
  other: 'Otro',
};

export default function SitiosPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (search.trim()) p.set('q', search.trim());
      if (status) p.set('status', status);
      const res = await fetch(`/api/sites?${p.toString()}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSites(data.sites || []);
    } catch { toast.error('No se pudieron cargar los sitios'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status]);
  useEffect(() => { const t = setTimeout(load, 350); return () => clearTimeout(t); /* eslint-disable-next-line */ }, [search]);

  return (
    <div className="container">
      <div className="row-between mb-4" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="row" style={{ gap: 10, alignItems: 'center' }}>
            <Globe size={20} color="var(--rai-gold)" />
            <h1 className="h1" style={{ margin: 0 }}>Sitios / Sucursales</h1>
            <span className="badge badge-gold">{sites.length}</span>
            <HelpTip content="Locaciones físicas del negocio: hoteles, restaurantes, oficinas. Cada sitio tiene su propio inventario de habitaciones, reservas y pagos asociados." />
          </div>
          <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
            Gestiona las locaciones físicas del negocio con su inventario y métricas operativas.
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="primary" onClick={() => setShowCreate(true)}>
            <Plus size={14} /> Nuevo sitio
          </button>
        </div>
      </div>

      <div className="row mb-4" style={{ gap: 8 }}>
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)} style={{ height: 32, width: 180 }}>
          <option value="">Todos los estados</option>
          {Object.entries(SITE_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: 9, color: 'var(--rai-muted)' }} />
          <input
            className="input"
            placeholder="Nombre, ciudad o dirección"
            value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 30, height: 32, width: '100%' }}
          />
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--rai-muted)' }}>Cargando…</div>
      ) : sites.length === 0 ? (
        <div className="card" style={{ padding: 64, textAlign: 'center' }}>
          <Building2 size={36} color="var(--rai-gold)" style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 16, fontWeight: 600 }}>Aún no tienes sitios registrados</div>
          <div style={{ fontSize: 13, color: 'var(--rai-muted)', maxWidth: 380, margin: '8px auto 20px' }}>
            Crea tu primera locación (hotel, sucursal, restaurante) para empezar a vincular habitaciones, reservas y pagos.
          </div>
          <button className="primary" onClick={() => setShowCreate(true)}>
            <Plus size={14} /> Crear primer sitio
          </button>
        </div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
          {sites.map((s) => (
            <Link
              key={s.id}
              href={`/sitios/${s.id}`}
              className="card"
              style={{
                padding: 16, textDecoration: 'none', color: 'inherit',
                display: 'flex', flexDirection: 'column', gap: 10, position: 'relative', overflow: 'hidden',
                transition: 'transform 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, var(--rai-gold), var(--rai-gold-br))' }} />
              <div className="row-between" style={{ alignItems: 'flex-start' }}>
                <div>
                  <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                    <Building2 size={16} color="var(--rai-gold)" />
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{s.name}</h3>
                  </div>
                  <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                    {TYPE_LABELS[s.type] ?? s.type}
                  </div>
                </div>
                <SiteStatusBadge status={s.status} />
              </div>

              {(s.city || s.country || s.address) && (
                <div className="muted" style={{ fontSize: 12, display: 'flex', gap: 4, alignItems: 'flex-start' }}>
                  <MapPin size={11} style={{ marginTop: 2, flexShrink: 0 }} />
                  <span>{[s.address, s.city, s.country].filter(Boolean).join(', ')}</span>
                </div>
              )}

              <div className="row" style={{ gap: 12, marginTop: 4 }}>
                <Stat icon={BedDouble} label="Habitaciones" value={s._count.rooms} />
                <Stat icon={UsersIcon} label="Reservas" value={s._count.bookings} />
                {s.capacity > 0 && <Stat icon={UsersIcon} label="Aforo" value={s.capacity} />}
              </div>

              {s.contactName && (
                <div className="muted" style={{ fontSize: 11, display: 'flex', gap: 6, alignItems: 'center', borderTop: '1px solid var(--rai-border)', paddingTop: 10 }}>
                  <Phone size={11} /> {s.contactName}
                  {s.contactPhone && ` · ${s.contactPhone}`}
                </div>
              )}

              <div className="row" style={{ marginTop: 'auto', gap: 4, color: 'var(--rai-gold)', fontSize: 12, justifyContent: 'flex-end' }}>
                Ver detalles <ChevronRight size={12} />
              </div>
            </Link>
          ))}
        </div>
      )}

      {showCreate && <CreateSiteModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />}
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof BedDouble; label: string; value: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div className="row" style={{ gap: 4, color: 'var(--rai-muted)', fontSize: 10 }}>
        <Icon size={10} /> {label}
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--rai-text)' }}>{value}</div>
    </div>
  );
}

function CreateSiteModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', type: 'hotel',
    address: '', city: '', country: '', postalCode: '',
    contactName: '', contactPhone: '', contactEmail: '',
    capacity: '0', status: 'active', notes: '',
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Nombre obligatorio'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/sites', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, capacity: Number(form.capacity) || 0 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Sitio creado');
      onCreated();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Error'); }
    finally { setSaving(false); }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 640, width: '100%' }} onClick={(e) => e.stopPropagation()}>
        <div className="row-between" style={{ padding: '16px 20px', borderBottom: '1px solid var(--rai-border)' }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Nuevo sitio</h3>
          <button className="ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={submit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="grid-2" style={{ gap: 12 }}>
            <div className="form-group">
              <label className="label">Nombre *</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
            </div>
            <div className="form-group">
              <label className="label">Tipo</label>
              <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="label">Dirección</label>
              <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Calle, número" />
            </div>
            <div className="form-group">
              <label className="label">Ciudad</label>
              <input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="label">País</label>
              <input className="input" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="DO, US, MX…" maxLength={3} />
            </div>
            <div className="form-group">
              <label className="label">
                Aforo / Capacidad <HelpTip content="Cantidad máxima de huéspedes que admite el sitio. Cero = sin límite definido." />
              </label>
              <input className="input" type="number" min="0" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="label">Estado</label>
              <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {Object.entries(SITE_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Contacto (nombre)</label>
              <input className="input" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="label">Tel. contacto</label>
              <input className="input" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="label">Notas</label>
            <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" className="ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="primary" disabled={saving}>{saving ? 'Creando…' : 'Crear sitio'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
