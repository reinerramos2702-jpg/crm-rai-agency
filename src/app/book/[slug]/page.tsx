'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Calendar as CalendarIcon, Clock, Loader2, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';

interface AvailabilityWindow {
  start: string; // "HH:MM"
  end: string; // "HH:MM"
}

type Availability = Record<string, AvailabilityWindow[]>;

interface CalendarInfo {
  id: string;
  name: string;
  description: string | null;
  durationMins: number;
  availability: Availability | null;
}

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DAY_LABELS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTH_NAMES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fmtTime(d: Date) {
  return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Página pública de reserva de citas: /book/[slug]
 * No requiere autenticación. Permite a un contacto elegir un horario
 * disponible (según la disponibilidad configurada del calendario) y
 * agendar una cita directamente.
 */
export default function PublicBookingPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [calendar, setCalendar] = useState<CalendarInfo | null>(null);

  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [busy, setBusy] = useState<{ startTime: string; endTime: string }[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<{ start: Date; end: Date } | null>(null);

  // Cargar info del calendario una vez
  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        const res = await fetch(`/api/public/booking/${slug}`);
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const data = await res.json();
        setCalendar(data.calendar);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  // Cargar horarios ocupados del día seleccionado
  useEffect(() => {
    if (!slug || !calendar) return;
    setSlotsLoading(true);
    setSelectedSlot(null);
    const from = new Date(selectedDate);
    from.setHours(0, 0, 0, 0);
    const to = new Date(selectedDate);
    to.setHours(23, 59, 59, 999);
    (async () => {
      try {
        const res = await fetch(`/api/public/booking/${slug}?from=${from.toISOString()}&to=${to.toISOString()}`);
        if (res.ok) {
          const data = await res.json();
          setBusy(data.busy || []);
        }
      } finally {
        setSlotsLoading(false);
      }
    })();
  }, [slug, calendar, selectedDate]);

  const slots = useMemo(() => {
    if (!calendar) return [] as Date[];
    const dayKey = DAY_KEYS[selectedDate.getDay()];
    const windows = calendar.availability?.[dayKey] || [];
    const duration = calendar.durationMins || 30;
    const result: Date[] = [];
    const now = new Date();

    for (const w of windows) {
      const startMin = timeToMinutes(w.start);
      const endMin = timeToMinutes(w.end);
      for (let m = startMin; m + duration <= endMin; m += duration) {
        const slotStart = new Date(selectedDate);
        slotStart.setHours(0, m, 0, 0);
        const slotEnd = new Date(slotStart.getTime() + duration * 60 * 1000);

        if (slotStart < now) continue; // no permitir horarios pasados

        const overlaps = busy.some((b) => {
          const bStart = new Date(b.startTime);
          const bEnd = new Date(b.endTime);
          return slotStart < bEnd && slotEnd > bStart;
        });
        if (overlaps) continue;

        result.push(slotStart);
      }
    }
    return result;
  }, [calendar, selectedDate, busy]);

  function changeDay(delta: number) {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    d.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (d < today) return; // no ir al pasado
    setSelectedDate(d);
  }

  async function submitBooking() {
    if (!selectedSlot || !calendar) return;
    if (!form.name.trim()) {
      setError('El nombre es requerido.');
      return;
    }
    if (!form.email.trim() && !form.phone.trim()) {
      setError('Indica un email o teléfono de contacto.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const endTime = new Date(selectedSlot.getTime() + calendar.durationMins * 60 * 1000);
      const res = await fetch(`/api/public/booking/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime: selectedSlot.toISOString(),
          endTime: endTime.toISOString(),
          name: form.name.trim(),
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          notes: form.notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setConfirmed({ start: selectedSlot, end: endTime });
      } else {
        setError(data.error || 'No se pudo completar la reserva. Intenta con otro horario.');
        // Refrescar horarios ocupados por si hubo conflicto
        const from = new Date(selectedDate);
        from.setHours(0, 0, 0, 0);
        const to = new Date(selectedDate);
        to.setHours(23, 59, 59, 999);
        const r2 = await fetch(`/api/public/booking/${slug}?from=${from.toISOString()}&to=${to.toISOString()}`);
        if (r2.ok) {
          const d2 = await r2.json();
          setBusy(d2.busy || []);
        }
        setSelectedSlot(null);
      }
    } catch {
      setError('Error de red: no se pudo contactar al servidor.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'var(--rai-dark)',
        overflowY: 'auto',
        display: 'flex',
        justifyContent: 'center',
        padding: '40px 16px',
      }}
    >
      <div style={{ width: '100%', maxWidth: 560 }}>
        {loading ? (
          <div className="card" style={{ textAlign: 'center', padding: 48 }}>
            <Loader2 className="animate-spin" size={28} />
          </div>
        ) : notFound || !calendar ? (
          <div className="card" style={{ textAlign: 'center', padding: 48 }}>
            <CalendarIcon size={32} className="muted" style={{ marginBottom: 12 }} />
            <h2 style={{ margin: '0 0 8px' }}>Enlace no disponible</h2>
            <p className="muted">Este enlace de reserva no existe o ya no está activo.</p>
          </div>
        ) : confirmed ? (
          <div className="card" style={{ textAlign: 'center', padding: 48 }}>
            <CheckCircle2 size={36} color="var(--rai-success)" style={{ marginBottom: 12 }} />
            <h2 style={{ margin: '0 0 8px' }}>¡Cita confirmada!</h2>
            <p className="muted" style={{ marginBottom: 16 }}>
              Tu cita en <strong>{calendar.name}</strong> quedó agendada para:
            </p>
            <p style={{ fontSize: 18, fontWeight: 600 }}>
              {DAY_LABELS[confirmed.start.getDay()]} {confirmed.start.getDate()} de {MONTH_NAMES[confirmed.start.getMonth()]}
              <br />
              {fmtTime(confirmed.start)} – {fmtTime(confirmed.end)}
            </p>
            <p className="muted" style={{ marginTop: 16, fontSize: 13 }}>
              Recibirás la confirmación por el medio de contacto que indicaste.
            </p>
          </div>
        ) : (
          <>
            <div className="card mb-6">
              <h1 className="h1" style={{ marginBottom: 4 }}>{calendar.name}</h1>
              {calendar.description && <p className="muted">{calendar.description}</p>}
              <div className="row" style={{ gap: 6, marginTop: 8 }}>
                <Clock size={14} className="muted" />
                <span className="muted" style={{ fontSize: 13 }}>Duración: {calendar.durationMins} min</span>
              </div>
            </div>

            <div className="card mb-6">
              <div className="row-between mb-4">
                <button className="btn-sm ghost" onClick={() => changeDay(-1)}>
                  <ChevronLeft size={14} />
                </button>
                <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                  {DAY_LABELS[selectedDate.getDay()]} {selectedDate.getDate()} de {MONTH_NAMES[selectedDate.getMonth()]}
                </span>
                <button className="btn-sm ghost" onClick={() => changeDay(1)}>
                  <ChevronRight size={14} />
                </button>
              </div>

              {slotsLoading ? (
                <div className="row" style={{ justifyContent: 'center', padding: 20 }}>
                  <Loader2 className="animate-spin" size={20} />
                </div>
              ) : slots.length === 0 ? (
                <p className="muted" style={{ textAlign: 'center', padding: '12px 0' }}>
                  No hay horarios disponibles este día. Prueba otra fecha.
                </p>
              ) : (
                <div className="grid-auto" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 8 }}>
                  {slots.map((s) => (
                    <button
                      key={s.toISOString()}
                      className={selectedSlot?.getTime() === s.getTime() ? 'primary' : 'ghost'}
                      onClick={() => setSelectedSlot(s)}
                    >
                      {fmtTime(s)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedSlot && (
              <div className="card">
                <h3 style={{ marginTop: 0 }}>Tus datos</h3>
                <div className="mb-4">
                  <label className="muted" style={{ fontSize: 12 }}>Nombre</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Tu nombre completo"
                    style={{ width: '100%' }}
                  />
                </div>
                <div className="grid-2 mb-4" style={{ gap: 12 }}>
                  <div>
                    <label className="muted" style={{ fontSize: 12 }}>Email</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="tu@email.com"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label className="muted" style={{ fontSize: 12 }}>Teléfono</label>
                    <input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="Opcional si das tu email"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="muted" style={{ fontSize: 12 }}>Notas (opcional)</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={2}
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                </div>
                {error && <p style={{ color: 'var(--rai-error)', fontSize: 13, marginBottom: 12 }}>{error}</p>}
                <div className="row-between">
                  <span className="muted" style={{ fontSize: 13 }}>
                    {fmtTime(selectedSlot)} – {fmtTime(new Date(selectedSlot.getTime() + calendar.durationMins * 60 * 1000))}
                  </span>
                  <button className="primary" onClick={submitBooking} disabled={submitting}>
                    {submitting ? <Loader2 className="animate-spin" size={14} /> : 'Confirmar cita'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
