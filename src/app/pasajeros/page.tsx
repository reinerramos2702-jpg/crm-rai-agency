'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  UserCheck, Plus, Search, Filter, Download, Users, BedDouble,
  Star, Ban, Clock, X, Mail, Phone, MapPin, ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { GuestStatusBadge, GUEST_STATUS_LABELS, formatMoney } from '@/components/hotel/StatusBadges';
import { HelpTip } from '@/components/ui/HelpTip';

interface Guest {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  documentType: string | null;
  documentNumber: string | null;
  nationality: string | null;
  status: string;
  tags: string[];
  totalStays: number;
  totalSpentCents: number;
  lastStayAt: string | null;
  updatedAt: string;
  _count?: { bookings: number; payments: number };
}

const STATUS_TABS = [
  { id: '', label: 'Todos', icon: Users },
  { id: 'active', label: 'Activos', icon: UserCheck },
  { id: 'staying', label: 'Hospedados', icon: BedDouble },
  { id: 'vip', label: 'VIP', icon: Star },
  { id: 'inactive', label: 'Inactivos', icon: Clock },
  { id: 'blacklisted', label: 'Bloqueados', icon: Ban },
] as const;

export default function PasajerosPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState<string>('');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [totalsByStatus, setTotalsByStatus] = useState<Record<string, number>>({});

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeStatus) params.set('status', activeStatus);
      if (search.trim()) params.set('q', search.trim());
      const res = await fetch(`/api/guests?${params.toString()}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setGuests(data.guests || []);
      setTotalsByStatus(data.totalsByStatus || {});
    } catch {
      toast.error('No se pudo cargar huéspedes');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [activeStatus]);

  useEffect(() => {
    const t = setTimeout(load, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const total = useMemo(() => Object.values(totalsByStatus).reduce((a, b) => a + b, 0), [totalsByStatus]);

  return (
    <div className="container">
      <div className="row-between mb-4" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="row" style={{ gap: 10, alignItems: 'center' }}>
            <UserCheck size={20} color="var(--rai-gold)" />
            <h1 className="h1" style={{ margin: 0 }}>Pasajeros / Huéspedes</h1>
            <span className="badge badge-gold">{total} total</span>
            <HelpTip content="Registro central de huéspedes del negocio. Conecta automáticamente con reservas, pagos y conversaciones del CRM." />
          </div>
          <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
            Gestiona perfiles de huéspedes con historial de estancias, pagos y mensajes.
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="secondary" onClick={() => toast('Exportación CSV próximamente')}>
            <Download size={14} /> Exportar
          </button>
          <button className="primary" onClick={() => setShowCreate(true)}>
            <Plus size={14} /> Nuevo huésped
          </button>
        </div>
      </div>

      <div
        className="row"
        style={{
          gap: 4,
          borderBottom: '1px solid var(--rai-border)',
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        {STATUS_TABS.map(({ id, label, icon: Icon }) => {
          const count = id ? (totalsByStatus[id] ?? 0) : total;
          const isActive = activeStatus === id;
          return (
            <button
              key={id || 'all'}
              onClick={() => setActiveStatus(id)}
              className="ghost"
              style={{
                padding: '10px 14px',
                borderBottom: isActive ? '2px solid var(--rai-gold)' : '2px solid transparent',
                color: isActive ? 'var(--rai-gold)' : 'var(--rai-muted)',
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                display: 'inline-flex',
                gap: 6,
                alignItems: 'center',
              }}
            >
              <Icon size={14} /> {label}
              <span
                style={{
                  background: isActive ? 'rgba(201,168,76,0.18)' : 'rgba(136,136,170,0.12)',
                  borderRadius: 4,
                  padding: '0 6px',
                  fontSize: 11,
                  minWidth: 18,
                  textAlign: 'center',
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="row-between mb-4" style={{ flexWrap: 'wrap', gap: 8 }}>
        <div className="row" style={{ gap: 8 }}>
          <button className="secondary btn-sm" onClick={() => toast('Filtros avanzados próximamente')}>
            <Filter size={14} /> Filtros avanzados
          </button>
        </div>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: 9, color: 'var(--rai-muted)' }} />
          <input
            className="input"
            placeholder="Buscar nombre, email, teléfono o documento"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 30, width: 320, height: 32 }}
          />
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--rai-muted)' }}>Cargando huéspedes…</div>
        ) : guests.length === 0 ? (
          <div style={{ padding: 64, textAlign: 'center' }}>
            <div
              style={{
                width: 64, height: 64, borderRadius: '50%', margin: '0 auto 16px',
                background: 'rgba(201,168,76,0.08)', border: '1px solid var(--rai-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <UserCheck size={28} color="var(--rai-gold)" />
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--rai-text)', marginBottom: 4 }}>
              Aún no tienes huéspedes
            </div>
            <div style={{ fontSize: 13, color: 'var(--rai-muted)', maxWidth: 380, margin: '0 auto 20px' }}>
              Crea el primer perfil para empezar a registrar reservas, pagos y conversaciones de huéspedes.
            </div>
            <button className="primary" onClick={() => setShowCreate(true)}>
              <Plus size={14} /> Crear primer huésped
            </button>
          </div>
        ) : (
          <table className="table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Huésped</th>
                <th>Contacto</th>
                <th>Documento</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Estancias</th>
                <th style={{ textAlign: 'right' }}>Total gastado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {guests.map((g) => (
                <tr key={g.id}>
                  <td>
                    <Link
                      href={`/pasajeros/${g.id}`}
                      style={{
                        color: 'var(--rai-text)',
                        textDecoration: 'none',
                        fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: 10,
                      }}
                    >
                      <div
                        style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: 'rgba(201,168,76,0.12)',
                          color: 'var(--rai-gold)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 700,
                        }}
                      >
                        {g.firstName[0]}{g.lastName?.[0] ?? ''}
                      </div>
                      <div>
                        <div>{g.firstName} {g.lastName ?? ''}</div>
                        {g.nationality && (
                          <div style={{ fontSize: 11, color: 'var(--rai-muted)', display: 'flex', gap: 4, alignItems: 'center' }}>
                            <MapPin size={10} /> {g.nationality}
                          </div>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {g.email && <span style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={11} color="var(--rai-muted)" /> {g.email}</span>}
                      {g.phone && <span style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={11} color="var(--rai-muted)" /> {g.phone}</span>}
                      {!g.email && !g.phone && <span className="muted" style={{ fontSize: 12 }}>Sin contacto</span>}
                    </div>
                  </td>
                  <td>
                    {g.documentNumber ? (
                      <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
                        {g.documentType?.toUpperCase() || 'ID'} {g.documentNumber}
                      </span>
                    ) : (
                      <span className="muted" style={{ fontSize: 12 }}>—</span>
                    )}
                  </td>
                  <td><GuestStatusBadge status={g.status} /></td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{g.totalStays}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--rai-gold)' }}>
                    {formatMoney(g.totalSpentCents)}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <Link href={`/pasajeros/${g.id}`} className="ghost btn-sm" style={{ textDecoration: 'none' }}>
                      Ver <ChevronRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && <CreateGuestModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />}
    </div>
  );
}

function CreateGuestModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    documentType: 'passport',
    documentNumber: '',
    nationality: '',
    status: 'active',
    notes: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
  });

  function set<K extends keyof typeof form>(k: K, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firstName.trim()) { toast.error('Nombre es obligatorio'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      toast.success('Huésped creado');
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 640, width: '100%' }} onClick={(e) => e.stopPropagation()}>
        <div className="row-between" style={{ padding: '16px 20px', borderBottom: '1px solid var(--rai-border)' }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Nuevo huésped</h3>
          <button className="ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={submit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="grid-2" style={{ gap: 12 }}>
            <div className="form-group">
              <label className="label">
                Nombre * <HelpTip content="Nombre por el cual el huésped se identifica. Obligatorio." />
              </label>
              <input className="input" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} autoFocus required />
            </div>
            <div className="form-group">
              <label className="label">Apellido</label>
              <input className="input" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">Email</label>
              <input className="input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">Teléfono</label>
              <input className="input" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+1 829 ..." />
            </div>
            <div className="form-group">
              <label className="label">
                Tipo documento <HelpTip content="Pasaporte para extranjeros, cédula nacional para locales. Se usa en registro de check-in legal." />
              </label>
              <select className="input" value={form.documentType} onChange={(e) => set('documentType', e.target.value)}>
                <option value="passport">Pasaporte</option>
                <option value="national_id">Cédula nacional</option>
                <option value="driver_license">Licencia conducir</option>
                <option value="other">Otro</option>
              </select>
            </div>
            <div className="form-group">
              <label className="label">Número documento</label>
              <input className="input" value={form.documentNumber} onChange={(e) => set('documentNumber', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">Nacionalidad</label>
              <input className="input" value={form.nationality} onChange={(e) => set('nationality', e.target.value)} placeholder="DO, US, ES…" maxLength={3} />
            </div>
            <div className="form-group">
              <label className="label">Estado inicial</label>
              <select className="input" value={form.status} onChange={(e) => set('status', e.target.value)}>
                {Object.entries(GUEST_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Contacto emergencia</label>
              <input className="input" value={form.emergencyContactName} onChange={(e) => set('emergencyContactName', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">Tel. emergencia</label>
              <input className="input" value={form.emergencyContactPhone} onChange={(e) => set('emergencyContactPhone', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="label">Notas internas</label>
            <textarea
              className="input"
              rows={3}
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Alergias, preferencias, observaciones…"
            />
          </div>
          <div className="row" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <button type="button" className="ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="primary" disabled={saving}>
              {saving ? 'Creando…' : 'Crear huésped'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
