'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, User, BedDouble, CreditCard, MessageSquare, FileText, Edit2,
  Trash2, Save, X, Calendar as CalendarIcon, Mail, Phone, FileCheck, MapPin,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  GuestStatusBadge, GUEST_STATUS_LABELS,
  BookingStatusBadge, PaymentStatusBadge,
  formatMoney,
} from '@/components/hotel/StatusBadges';
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
  dateOfBirth: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  status: string;
  preferredLanguage: string | null;
  tags: string[];
  notes: string | null;
  totalStays: number;
  totalSpentCents: number;
  lastStayAt: string | null;
  createdAt: string;
  contact?: { id: string; name: string } | null;
  bookings: Array<{
    id: string; reference: string; status: string;
    checkInDate: string; checkOutDate: string;
    totalAmountCents: number; paidAmountCents: number; currency: string;
    site: { id: string; name: string };
    room: { id: string; number: string } | null;
  }>;
  payments: Array<{
    id: string; reference: string; status: string;
    amountCents: number; currency: string; method: string;
    createdAt: string; paidAt: string | null;
  }>;
}

const TABS = [
  { id: 'profile', label: 'Perfil', icon: User },
  { id: 'bookings', label: 'Reservas', icon: BedDouble },
  { id: 'payments', label: 'Pagos', icon: CreditCard },
  { id: 'messages', label: 'Mensajes', icon: MessageSquare },
  { id: 'notes', label: 'Notas', icon: FileText },
] as const;

export default function GuestDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [guest, setGuest] = useState<Guest | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('profile');
  const [editing, setEditing] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/guests/${params.id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setGuest(data.guest);
    } catch {
      toast.error('No se pudo cargar el huésped');
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [params.id]);

  async function handleDelete() {
    if (!guest) return;
    if (!confirm(`¿Eliminar a ${guest.firstName}? Esta acción no se puede deshacer.`)) return;
    const res = await fetch(`/api/guests/${guest.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error || 'Error'); return; }
    toast.success('Huésped eliminado');
    router.push('/pasajeros');
  }

  if (loading) return <div className="container"><div style={{ padding: 40, textAlign: 'center', color: 'var(--rai-muted)' }}>Cargando…</div></div>;
  if (!guest) return <div className="container"><div style={{ padding: 40 }}>Huésped no encontrado.</div></div>;

  const fullName = `${guest.firstName} ${guest.lastName ?? ''}`.trim();
  const initials = (guest.firstName[0] || '?') + (guest.lastName?.[0] || '');

  return (
    <div className="container">
      <div className="row" style={{ gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <Link href="/pasajeros" className="ghost btn-icon" style={{ textDecoration: 'none' }}>
          <ArrowLeft size={16} />
        </Link>
        <span className="muted" style={{ fontSize: 13 }}>Pasajeros</span>
        <span className="muted" style={{ fontSize: 13 }}>/</span>
        <span style={{ fontSize: 13, color: 'var(--rai-text)' }}>{fullName}</span>
      </div>

      <div className="card mb-4" style={{ padding: 20 }}>
        <div className="row-between" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div className="row" style={{ gap: 16, alignItems: 'center' }}>
            <div
              style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(201,168,76,0.15)',
                color: 'var(--rai-gold)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, fontWeight: 700,
              }}
            >
              {initials.toUpperCase()}
            </div>
            <div>
              <div className="row" style={{ gap: 10, alignItems: 'center' }}>
                <h1 className="h1" style={{ margin: 0 }}>{fullName}</h1>
                <GuestStatusBadge status={guest.status} size="md" />
              </div>
              <div className="row muted" style={{ gap: 14, marginTop: 6, fontSize: 13, flexWrap: 'wrap' }}>
                {guest.email && <span><Mail size={12} /> {guest.email}</span>}
                {guest.phone && <span><Phone size={12} /> {guest.phone}</span>}
                {guest.documentNumber && <span><FileCheck size={12} /> {guest.documentNumber}</span>}
                {guest.nationality && <span><MapPin size={12} /> {guest.nationality}</span>}
              </div>
            </div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            {!editing && <button className="secondary" onClick={() => setEditing(true)}><Edit2 size={14} /> Editar</button>}
            <button className="danger" onClick={handleDelete}><Trash2 size={14} /> Eliminar</button>
          </div>
        </div>

        <div className="grid-3" style={{ gap: 12, marginTop: 20 }}>
          <KpiMini label="Estancias" value={guest.totalStays} hint="Reservas con check-out completado" />
          <KpiMini label="Total gastado" value={formatMoney(guest.totalSpentCents)} hint="Suma de pagos aprobados de este huésped" />
          <KpiMini
            label="Última estancia"
            value={guest.lastStayAt ? new Date(guest.lastStayAt).toLocaleDateString('es-DO') : '—'}
            hint="Fecha del último check-out"
          />
        </div>
      </div>

      <div className="row" style={{ gap: 4, borderBottom: '1px solid var(--rai-border)', marginBottom: 16, flexWrap: 'wrap' }}>
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="ghost"
              style={{
                padding: '12px 16px',
                borderBottom: isActive ? '2px solid var(--rai-gold)' : '2px solid transparent',
                color: isActive ? 'var(--rai-gold)' : 'var(--rai-muted)',
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                display: 'inline-flex', gap: 6, alignItems: 'center',
              }}
            >
              <Icon size={14} /> {label}
            </button>
          );
        })}
      </div>

      {tab === 'profile' && (editing ? <EditForm guest={guest} onCancel={() => setEditing(false)} onSaved={() => { setEditing(false); load(); }} /> : <ProfileView guest={guest} />)}
      {tab === 'bookings' && <BookingsTab guest={guest} onChange={load} />}
      {tab === 'payments' && <PaymentsTab guest={guest} />}
      {tab === 'messages' && <MessagesTab guestId={guest.id} contactId={guest.contact?.id ?? null} />}
      {tab === 'notes' && <NotesTab guest={guest} onSaved={load} />}
    </div>
  );
}

function KpiMini({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="card" style={{ padding: 14, background: 'rgba(201,168,76,0.04)' }}>
      <div className="row" style={{ gap: 4, alignItems: 'center' }}>
        <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
        {hint && <HelpTip content={hint} size={11} />}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--rai-text)', marginTop: 4 }}>{value}</div>
    </div>
  );
}

function ProfileView({ guest }: { guest: Guest }) {
  return (
    <div className="grid-2" style={{ gap: 16 }}>
      <div className="card" style={{ padding: 16 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--rai-gold)' }}>Identidad</h3>
        <Field label="Nombre" value={guest.firstName} />
        <Field label="Apellido" value={guest.lastName} />
        <Field label="Email" value={guest.email} />
        <Field label="Teléfono" value={guest.phone} />
        <Field label="Fecha nacimiento" value={guest.dateOfBirth ? new Date(guest.dateOfBirth).toLocaleDateString('es-DO') : null} />
        <Field label="Nacionalidad" value={guest.nationality} />
        <Field label="Idioma preferido" value={guest.preferredLanguage} />
      </div>
      <div className="card" style={{ padding: 16 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--rai-gold)' }}>Documento e identificación</h3>
        <Field label="Tipo documento" value={guest.documentType} />
        <Field label="Número documento" value={guest.documentNumber} />
        <Field label="Estado" value={GUEST_STATUS_LABELS[guest.status] ?? guest.status} />
        <Field label="Contacto emergencia" value={guest.emergencyContactName} />
        <Field label="Tel. emergencia" value={guest.emergencyContactPhone} />
        <Field label="Tags" value={guest.tags.join(', ') || null} />
        <Field label="Registrado" value={new Date(guest.createdAt).toLocaleString('es-DO')} />
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

function EditForm({ guest, onCancel, onSaved }: { guest: Guest; onCancel: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    firstName: guest.firstName,
    lastName: guest.lastName ?? '',
    email: guest.email ?? '',
    phone: guest.phone ?? '',
    documentType: guest.documentType ?? 'passport',
    documentNumber: guest.documentNumber ?? '',
    nationality: guest.nationality ?? '',
    status: guest.status,
    preferredLanguage: guest.preferredLanguage ?? '',
    emergencyContactName: guest.emergencyContactName ?? '',
    emergencyContactPhone: guest.emergencyContactPhone ?? '',
    notes: guest.notes ?? '',
  });
  const [saving, setSaving] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/guests/${guest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success('Cambios guardados');
      onSaved();
    } catch { toast.error('Error al guardar'); }
    finally { setSaving(false); }
  }

  return (
    <form onSubmit={submit} className="card" style={{ padding: 20 }}>
      <div className="grid-2" style={{ gap: 12 }}>
        {(
          [
            ['firstName', 'Nombre *'], ['lastName', 'Apellido'],
            ['email', 'Email'], ['phone', 'Teléfono'],
            ['documentNumber', 'Número documento'], ['nationality', 'Nacionalidad'],
            ['preferredLanguage', 'Idioma preferido'],
            ['emergencyContactName', 'Contacto emergencia'], ['emergencyContactPhone', 'Tel. emergencia'],
          ] as Array<[keyof typeof form, string]>
        ).map(([key, label]) => (
          <div className="form-group" key={key as string}>
            <label className="label">{label}</label>
            <input className="input" value={form[key] as string} onChange={(e) => set(key, e.target.value)} />
          </div>
        ))}
        <div className="form-group">
          <label className="label">Tipo documento</label>
          <select className="input" value={form.documentType} onChange={(e) => set('documentType', e.target.value)}>
            <option value="passport">Pasaporte</option>
            <option value="national_id">Cédula nacional</option>
            <option value="driver_license">Licencia conducir</option>
            <option value="other">Otro</option>
          </select>
        </div>
        <div className="form-group">
          <label className="label">Estado</label>
          <select className="input" value={form.status} onChange={(e) => set('status', e.target.value)}>
            {Object.entries(GUEST_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>
      <div className="form-group" style={{ marginTop: 12 }}>
        <label className="label">Notas internas</label>
        <textarea className="input" rows={4} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
      </div>
      <div className="row" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
        <button type="button" className="ghost" onClick={onCancel}><X size={14} /> Cancelar</button>
        <button type="submit" className="primary" disabled={saving}><Save size={14} /> {saving ? 'Guardando…' : 'Guardar cambios'}</button>
      </div>
    </form>
  );
}

function BookingsTab({ guest, onChange }: { guest: Guest; onChange: () => void }) {
  if (guest.bookings.length === 0) {
    return (
      <div className="card" style={{ padding: 40, textAlign: 'center' }}>
        <BedDouble size={32} color="var(--rai-gold)" style={{ marginBottom: 12 }} />
        <div style={{ fontSize: 14, fontWeight: 600 }}>Sin reservas aún</div>
        <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
          Crea una reserva nueva para este huésped desde el módulo Reservas.
        </p>
        <Link href="/reservas" className="primary btn-sm" style={{ marginTop: 12, textDecoration: 'none', display: 'inline-flex' }}>
          Ir a Reservas
        </Link>
      </div>
    );
  }
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <table className="table" style={{ width: '100%' }}>
        <thead>
          <tr>
            <th>Referencia</th>
            <th>Sitio</th>
            <th>Habitación</th>
            <th>Check-in</th>
            <th>Check-out</th>
            <th>Estado</th>
            <th style={{ textAlign: 'right' }}>Pagado / Total</th>
          </tr>
        </thead>
        <tbody>
          {guest.bookings.map((b) => (
            <tr key={b.id}>
              <td><Link href={`/reservas/${b.id}`} style={{ color: 'var(--rai-gold)', fontFamily: 'monospace', textDecoration: 'none' }}>{b.reference}</Link></td>
              <td>{b.site.name}</td>
              <td>{b.room?.number ?? <span className="muted">—</span>}</td>
              <td style={{ fontSize: 12 }}>{new Date(b.checkInDate).toLocaleDateString('es-DO')}</td>
              <td style={{ fontSize: 12 }}>{new Date(b.checkOutDate).toLocaleDateString('es-DO')}</td>
              <td><BookingStatusBadge status={b.status} /></td>
              <td style={{ textAlign: 'right', fontSize: 12 }}>
                <span style={{ color: 'var(--rai-success)' }}>{formatMoney(b.paidAmountCents, b.currency)}</span>
                {' / '}
                <span style={{ color: 'var(--rai-muted)' }}>{formatMoney(b.totalAmountCents, b.currency)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PaymentsTab({ guest }: { guest: Guest }) {
  if (guest.payments.length === 0) {
    return (
      <div className="card" style={{ padding: 40, textAlign: 'center' }}>
        <CreditCard size={32} color="var(--rai-gold)" style={{ marginBottom: 12 }} />
        <div style={{ fontSize: 14, fontWeight: 600 }}>Sin pagos aún</div>
        <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
          Los pagos asociados aparecerán aquí automáticamente.
        </p>
      </div>
    );
  }
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <table className="table" style={{ width: '100%' }}>
        <thead>
          <tr>
            <th>Referencia</th>
            <th>Fecha</th>
            <th>Método</th>
            <th>Estado</th>
            <th style={{ textAlign: 'right' }}>Monto</th>
          </tr>
        </thead>
        <tbody>
          {guest.payments.map((p) => (
            <tr key={p.id}>
              <td><Link href={`/pagos/${p.id}`} style={{ color: 'var(--rai-gold)', fontFamily: 'monospace', textDecoration: 'none' }}>{p.reference}</Link></td>
              <td style={{ fontSize: 12 }}>{new Date(p.paidAt ?? p.createdAt).toLocaleDateString('es-DO')}</td>
              <td style={{ fontSize: 12, textTransform: 'capitalize' }}>{p.method}</td>
              <td><PaymentStatusBadge status={p.status} /></td>
              <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatMoney(p.amountCents, p.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MessagesTab({ guestId, contactId }: { guestId: string; contactId: string | null }) {
  return (
    <div className="card" style={{ padding: 40, textAlign: 'center' }}>
      <MessageSquare size={32} color="var(--rai-gold)" style={{ marginBottom: 12 }} />
      <div style={{ fontSize: 14, fontWeight: 600 }}>
        {contactId ? 'Mensajes vinculados al contacto del CRM' : 'Aún no hay contacto vinculado'}
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 4, marginBottom: 12 }}>
        {contactId
          ? 'Las conversaciones con este huésped aparecen en el inbox central.'
          : 'Vincula este huésped con un contacto del CRM para empezar a recibir mensajes (WhatsApp, Instagram, email).'}
      </p>
      <Link href="/conversaciones" className="primary btn-sm" style={{ display: 'inline-flex', textDecoration: 'none' }}>
        {contactId ? 'Ir al inbox' : 'Ver contactos'}
      </Link>
      <input type="hidden" value={guestId} />
    </div>
  );
}

function NotesTab({ guest, onSaved }: { guest: Guest; onSaved: () => void }) {
  const [notes, setNotes] = useState(guest.notes ?? '');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/guests/${guest.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error();
      toast.success('Notas guardadas');
      onSaved();
    } catch { toast.error('Error al guardar'); }
    finally { setSaving(false); }
  }

  return (
    <div className="card" style={{ padding: 20 }}>
      <div className="row" style={{ gap: 6, marginBottom: 8 }}>
        <FileText size={14} color="var(--rai-gold)" />
        <span style={{ fontSize: 13, fontWeight: 600 }}>Notas internas del huésped</span>
        <HelpTip content="Información visible solo para el equipo: alergias, preferencias, observaciones, historial sensible. No se comparte con el huésped." />
      </div>
      <textarea
        className="input"
        rows={8}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Ej: prefiere habitación silenciosa, alérgico al gluten, repite cada año en octubre…"
      />
      <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
        <button className="primary" onClick={save} disabled={saving}>
          <Save size={14} /> {saving ? 'Guardando…' : 'Guardar notas'}
        </button>
      </div>
    </div>
  );
}
