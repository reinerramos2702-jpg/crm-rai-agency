'use client';

import React, { useEffect, useState } from 'react';
import {
  Calendar as CalendarIcon,
  CalendarClock,
  Link2,
  Plus,
  Trash2,
  Pencil,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Users,
  Settings as SettingsIcon,
  Copy,
} from 'lucide-react';
import toast from 'react-hot-toast';

const TOP_TABS = [
  { id: 'calendarios', label: 'Calendarios', icon: CalendarIcon },
  { id: 'citas', label: 'Citas', icon: CalendarClock },
  { id: 'conexiones', label: 'Conexiones', icon: Link2 },
];

const CALENDAR_TYPES = [
  { id: 'personal', label: 'Personal' },
  { id: 'evento', label: 'Evento' },
  { id: 'colectivo', label: 'Colectivo' },
];

const TEMPLATES = [
  { id: 'neo', label: 'Neo' },
  { id: 'classic', label: 'Clásica' },
];

const APPOINTMENT_FILTERS = [
  { id: 'proximo', label: 'Próximo' },
  { id: 'cancelado', label: 'Cancelado' },
  { id: 'todos', label: 'Todos' },
];

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 06:00 - 23:00

interface CalendarGroupT {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  template: string;
  calendars: CalendarResourceT[];
}

interface AvailabilityWindow {
  start: string; // "HH:MM"
  end: string; // "HH:MM"
}

type Availability = Record<string, AvailabilityWindow[]>;

interface CalendarResourceT {
  id: string;
  name: string;
  description: string | null;
  type: string;
  durationMins: number;
  status: string;
  groupId: string | null;
  group?: { id: string; name: string } | null;
  bookingEnabled?: boolean;
  bookingSlug?: string | null;
  availability?: Availability | null;
  updatedAt: string;
}

// Días de la semana para el editor de disponibilidad (lunes primero)
const AVAILABILITY_DAYS = [
  { key: 'mon', label: 'Lunes' },
  { key: 'tue', label: 'Martes' },
  { key: 'wed', label: 'Miércoles' },
  { key: 'thu', label: 'Jueves' },
  { key: 'fri', label: 'Viernes' },
  { key: 'sat', label: 'Sábado' },
  { key: 'sun', label: 'Domingo' },
];

const DEFAULT_AVAILABILITY_FORM: Record<string, { enabled: boolean; start: string; end: string }> = {
  mon: { enabled: true, start: '09:00', end: '18:00' },
  tue: { enabled: true, start: '09:00', end: '18:00' },
  wed: { enabled: true, start: '09:00', end: '18:00' },
  thu: { enabled: true, start: '09:00', end: '18:00' },
  fri: { enabled: true, start: '09:00', end: '18:00' },
  sat: { enabled: false, start: '09:00', end: '18:00' },
  sun: { enabled: false, start: '09:00', end: '18:00' },
};

interface ContactT {
  id: string;
  name: string;
}

interface AppointmentT {
  id: string;
  title: string;
  notes: string | null;
  status: string;
  startTime: string;
  endTime: string;
  calendarId: string;
  calendar: { id: string; name: string };
  contact: ContactT | null;
}

interface SettingsT {
  calendarHideEventDetails: boolean;
}

const DAY_NAMES = ['lun', 'mar', 'mié', 'jué', 'vie', 'sáb', 'dom'];
const MONTH_NAMES = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // lunes = 0
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d;
}

function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function fmtTime(date: Date) {
  return date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function fmtDateTimeLocal(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fmtWeekRange(start: Date) {
  const end = addDays(start, 6);
  const sameMonth = start.getMonth() === end.getMonth();
  if (sameMonth) {
    return `${start.getDate()} – ${end.getDate()} ${MONTH_NAMES[end.getMonth()]} ${end.getFullYear()}`;
  }
  return `${start.getDate()} ${MONTH_NAMES[start.getMonth()]} – ${end.getDate()} ${MONTH_NAMES[end.getMonth()]} ${end.getFullYear()}`;
}

const STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  completed: 'Completada',
  no_show: 'No asistió',
};

const STATUS_BADGE: Record<string, string> = {
  confirmed: 'badge-success',
  cancelled: 'badge-error',
  completed: 'badge-gold',
  no_show: 'badge-muted',
};

export default function CalendariosPage() {
  const [topTab, setTopTab] = useState<'calendarios' | 'citas' | 'conexiones'>('calendarios');

  // ---- Calendarios / Grupos ----
  const [groups, setGroups] = useState<CalendarGroupT[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [calendars, setCalendars] = useState<CalendarResourceT[]>([]);
  const [calendarsLoading, setCalendarsLoading] = useState(true);
  const [groupFilter, setGroupFilter] = useState<string>('all');

  const [showGroupModal, setShowGroupModal] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', description: '', template: 'neo' });
  const [creatingGroup, setCreatingGroup] = useState(false);

  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [editingCalendar, setEditingCalendar] = useState<CalendarResourceT | null>(null);
  const [calendarForm, setCalendarForm] = useState({
    name: '',
    description: '',
    type: 'personal',
    durationMins: '30',
    groupId: '',
    bookingEnabled: false,
    availability: DEFAULT_AVAILABILITY_FORM,
  });
  const [savingCalendar, setSavingCalendar] = useState(false);

  // ---- Citas ----
  const [citasSubTab, setCitasSubTab] = useState<'lista' | 'calendario'>('lista');
  const [appointments, setAppointments] = useState<AppointmentT[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [appointmentFilter, setAppointmentFilter] = useState<'proximo' | 'cancelado' | 'todos'>('proximo');
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));

  const [contacts, setContacts] = useState<ContactT[]>([]);

  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<AppointmentT | null>(null);
  const [appointmentForm, setAppointmentForm] = useState({
    calendarId: '',
    contactId: '',
    title: '',
    notes: '',
    start: '',
    end: '',
    status: 'confirmed',
  });
  const [savingAppointment, setSavingAppointment] = useState(false);

  // ---- Conexiones ----
  const [settings, setSettings] = useState<SettingsT | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [savingPrivateMode, setSavingPrivateMode] = useState(false);

  // ============================================================
  // Carga de datos
  // ============================================================
  async function fetchGroups() {
    setGroupsLoading(true);
    try {
      const res = await fetch('/api/calendar-groups');
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups || []);
      }
    } catch {
      toast.error('Error de red al cargar los grupos.');
    } finally {
      setGroupsLoading(false);
    }
  }

  async function fetchCalendars() {
    setCalendarsLoading(true);
    try {
      const res = await fetch('/api/calendars');
      if (res.ok) {
        const data = await res.json();
        setCalendars(data.calendars || []);
      }
    } catch {
      toast.error('Error de red al cargar los calendarios.');
    } finally {
      setCalendarsLoading(false);
    }
  }

  async function fetchAppointments() {
    setAppointmentsLoading(true);
    try {
      const res = await fetch('/api/appointments');
      if (res.ok) {
        const data = await res.json();
        setAppointments(data.appointments || []);
      }
    } catch {
      toast.error('Error de red al cargar las citas.');
    } finally {
      setAppointmentsLoading(false);
    }
  }

  async function fetchContacts() {
    try {
      const res = await fetch('/api/contacts');
      if (res.ok) {
        const data = await res.json();
        setContacts((data.contacts || []).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
      }
    } catch {
      // silencioso: los contactos son opcionales en una cita
    }
  }

  async function fetchSettings() {
    setSettingsLoading(true);
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings({
          calendarHideEventDetails: data.settings?.calendarHideEventDetails ?? true,
        });
      }
    } catch {
      toast.error('Error de red al cargar la configuración.');
    } finally {
      setSettingsLoading(false);
    }
  }

  useEffect(() => {
    fetchGroups();
    fetchCalendars();
    fetchAppointments();
    fetchContacts();
    fetchSettings();
  }, []);

  // ============================================================
  // Grupos de calendarios
  // ============================================================
  async function createGroup() {
    if (!newGroup.name.trim()) {
      toast.error('El nombre del grupo es requerido.');
      return;
    }
    setCreatingGroup(true);
    try {
      const res = await fetch('/api/calendar-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGroup),
      });
      if (res.ok) {
        toast.success('Grupo creado.');
        setShowGroupModal(false);
        setNewGroup({ name: '', description: '', template: 'neo' });
        fetchGroups();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || `Error del servidor (${res.status})`);
      }
    } catch {
      toast.error('Error de red: no se pudo contactar al servidor.');
    } finally {
      setCreatingGroup(false);
    }
  }

  async function deleteGroup(id: string) {
    if (!confirm('¿Eliminar este grupo? Los calendarios quedarán sin agrupar.')) return;
    try {
      const res = await fetch(`/api/calendar-groups?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Grupo eliminado.');
        if (groupFilter === id) setGroupFilter('all');
        fetchGroups();
        fetchCalendars();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || `Error del servidor (${res.status})`);
      }
    } catch {
      toast.error('Error de red: no se pudo contactar al servidor.');
    }
  }

  // ============================================================
  // Calendarios individuales
  // ============================================================
  function openNewCalendarModal() {
    setEditingCalendar(null);
    setCalendarForm({
      name: '',
      description: '',
      type: 'personal',
      durationMins: '30',
      groupId: groupFilter !== 'all' ? groupFilter : '',
      bookingEnabled: false,
      availability: DEFAULT_AVAILABILITY_FORM,
    });
    setShowCalendarModal(true);
  }

  function openEditCalendarModal(c: CalendarResourceT) {
    setEditingCalendar(c);
    const availability: Record<string, { enabled: boolean; start: string; end: string }> = {};
    for (const day of AVAILABILITY_DAYS) {
      const windows = c.availability?.[day.key];
      if (windows && windows.length > 0) {
        availability[day.key] = { enabled: true, start: windows[0].start, end: windows[0].end };
      } else {
        availability[day.key] = { ...DEFAULT_AVAILABILITY_FORM[day.key], enabled: false };
      }
    }
    setCalendarForm({
      name: c.name,
      description: c.description || '',
      type: c.type,
      durationMins: String(c.durationMins),
      groupId: c.groupId || '',
      bookingEnabled: !!c.bookingEnabled,
      availability,
    });
    setShowCalendarModal(true);
  }

  async function saveCalendar() {
    if (!calendarForm.name.trim()) {
      toast.error('El nombre del calendario es requerido.');
      return;
    }
    setSavingCalendar(true);
    try {
      const availability: Availability = {};
      for (const day of AVAILABILITY_DAYS) {
        const w = calendarForm.availability[day.key];
        availability[day.key] = w?.enabled ? [{ start: w.start, end: w.end }] : [];
      }
      const payload: Record<string, unknown> = {
        name: calendarForm.name.trim(),
        description: calendarForm.description.trim() || null,
        type: calendarForm.type,
        durationMins: Number(calendarForm.durationMins) || 30,
        groupId: calendarForm.groupId || null,
        availability,
      };
      if (editingCalendar) {
        payload.bookingEnabled = calendarForm.bookingEnabled;
      }
      const url = editingCalendar ? `/api/calendars/${editingCalendar.id}` : '/api/calendars';
      const method = editingCalendar ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success(editingCalendar ? 'Calendario actualizado.' : 'Calendario creado.');
        setShowCalendarModal(false);
        fetchCalendars();
        fetchGroups();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || `Error del servidor (${res.status})`);
      }
    } catch {
      toast.error('Error de red: no se pudo contactar al servidor.');
    } finally {
      setSavingCalendar(false);
    }
  }

  async function toggleCalendarStatus(c: CalendarResourceT) {
    try {
      const res = await fetch(`/api/calendars/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: c.status === 'active' ? 'inactive' : 'active' }),
      });
      if (res.ok) {
        fetchCalendars();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || `Error del servidor (${res.status})`);
      }
    } catch {
      toast.error('Error de red: no se pudo contactar al servidor.');
    }
  }

  async function deleteCalendar(id: string) {
    if (!confirm('¿Eliminar este calendario? Se eliminarán también sus citas.')) return;
    try {
      const res = await fetch(`/api/calendars/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Calendario eliminado.');
        fetchCalendars();
        fetchGroups();
        fetchAppointments();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || `Error del servidor (${res.status})`);
      }
    } catch {
      toast.error('Error de red: no se pudo contactar al servidor.');
    }
  }

  // ============================================================
  // Citas
  // ============================================================
  function openNewAppointmentModal(prefill?: { calendarId?: string; start?: Date; end?: Date }) {
    if (calendars.length === 0) {
      toast.error('Primero crea al menos un calendario.');
      return;
    }
    setEditingAppointment(null);
    const start = prefill?.start || new Date();
    const end = prefill?.end || new Date(start.getTime() + 30 * 60 * 1000);
    setAppointmentForm({
      calendarId: prefill?.calendarId || calendars[0].id,
      contactId: '',
      title: '',
      notes: '',
      start: fmtDateTimeLocal(start),
      end: fmtDateTimeLocal(end),
      status: 'confirmed',
    });
    setShowAppointmentModal(true);
  }

  function openEditAppointmentModal(a: AppointmentT) {
    setEditingAppointment(a);
    setAppointmentForm({
      calendarId: a.calendarId,
      contactId: a.contact?.id || '',
      title: a.title,
      notes: a.notes || '',
      start: fmtDateTimeLocal(new Date(a.startTime)),
      end: fmtDateTimeLocal(new Date(a.endTime)),
      status: a.status,
    });
    setShowAppointmentModal(true);
  }

  async function saveAppointment() {
    if (!appointmentForm.title.trim()) {
      toast.error('El título de la cita es requerido.');
      return;
    }
    if (!appointmentForm.calendarId) {
      toast.error('Selecciona un calendario.');
      return;
    }
    const start = new Date(appointmentForm.start);
    const end = new Date(appointmentForm.end);
    if (end <= start) {
      toast.error('La hora de fin debe ser posterior a la hora de inicio.');
      return;
    }
    setSavingAppointment(true);
    try {
      const payload = {
        calendarId: appointmentForm.calendarId,
        contactId: appointmentForm.contactId || null,
        title: appointmentForm.title.trim(),
        notes: appointmentForm.notes.trim() || null,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        status: appointmentForm.status,
      };
      const url = editingAppointment ? `/api/appointments/${editingAppointment.id}` : '/api/appointments';
      const method = editingAppointment ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success(editingAppointment ? 'Cita actualizada.' : 'Cita creada.');
        setShowAppointmentModal(false);
        fetchAppointments();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || `Error del servidor (${res.status})`);
      }
    } catch {
      toast.error('Error de red: no se pudo contactar al servidor.');
    } finally {
      setSavingAppointment(false);
    }
  }

  async function cancelAppointment(a: AppointmentT) {
    try {
      const res = await fetch(`/api/appointments/${a.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      if (res.ok) {
        toast.success('Cita cancelada.');
        fetchAppointments();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || `Error del servidor (${res.status})`);
      }
    } catch {
      toast.error('Error de red: no se pudo contactar al servidor.');
    }
  }

  async function deleteAppointment(id: string) {
    if (!confirm('¿Eliminar esta cita permanentemente?')) return;
    try {
      const res = await fetch(`/api/appointments/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Cita eliminada.');
        fetchAppointments();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || `Error del servidor (${res.status})`);
      }
    } catch {
      toast.error('Error de red: no se pudo contactar al servidor.');
    }
  }

  // ============================================================
  // Conexiones / Configuración
  // ============================================================
  async function togglePrivateMode() {
    if (!settings) return;
    const next = !settings.calendarHideEventDetails;
    setSavingPrivateMode(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calendarHideEventDetails: next }),
      });
      if (res.ok) {
        setSettings({ calendarHideEventDetails: next });
        toast.success('Configuración guardada.');
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || `Error del servidor (${res.status})`);
      }
    } catch {
      toast.error('Error de red: no se pudo contactar al servidor.');
    } finally {
      setSavingPrivateMode(false);
    }
  }

  // ============================================================
  // Derivados
  // ============================================================
  const filteredCalendars = groupFilter === 'all' ? calendars : calendars.filter((c) => c.groupId === groupFilter);

  const now = new Date();
  const filteredAppointments = appointments.filter((a) => {
    if (appointmentFilter === 'todos') return true;
    if (appointmentFilter === 'cancelado') return a.status === 'cancelled';
    // 'proximo': no canceladas y aún no han terminado
    return a.status !== 'cancelled' && new Date(a.endTime) >= now;
  });

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekAppointments = appointments.filter((a) => {
    const start = new Date(a.startTime);
    return start >= weekStart && start < addDays(weekStart, 7) && a.status !== 'cancelled';
  });

  function appointmentsFor(day: Date, hour: number) {
    return weekAppointments.filter((a) => {
      const start = new Date(a.startTime);
      return (
        start.getFullYear() === day.getFullYear() &&
        start.getMonth() === day.getMonth() &&
        start.getDate() === day.getDate() &&
        start.getHours() === hour
      );
    });
  }

  const selectedGroup = groups.find((g) => g.id === groupFilter);

  // ============================================================
  // Render
  // ============================================================
  return (
    <div className="container">
      <div className="mb-6 row-between">
        <div>
          <h1 className="h1">Calendarios</h1>
          <p className="muted">Gestiona tus calendarios, citas y conexiones externas.</p>
        </div>
      </div>

      {/* Top tabs */}
      <div className="row mb-6" style={{ gap: 8, borderBottom: '1px solid var(--rai-border)', paddingBottom: 0 }}>
        {TOP_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = topTab === tab.id;
          return (
            <button
              key={tab.id}
              className="ghost"
              onClick={() => setTopTab(tab.id as 'calendarios' | 'citas' | 'conexiones')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 16px',
                borderRadius: '8px 8px 0 0',
                border: '1px solid var(--rai-border)',
                borderBottom: active ? '3px solid var(--rai-gold)' : '1px solid var(--rai-border)',
                color: active ? 'var(--rai-gold)' : 'var(--rai-muted)',
                fontWeight: active ? 600 : 400,
                background: active ? 'var(--rai-card)' : 'transparent',
              }}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ===================== TAB: CALENDARIOS ===================== */}
      {topTab === 'calendarios' && (
        <div className="grid" style={{ gridTemplateColumns: '260px 1fr', gap: 24, alignItems: 'start' }}>
          {/* Sidebar de grupos */}
          <div className="card">
            <div className="row-between mb-4">
              <span style={{ fontWeight: 600 }}>Grupos</span>
              <button className="btn-sm primary" onClick={() => setShowGroupModal(true)}>
                <Plus size={14} /> Nuevo
              </button>
            </div>
            {groupsLoading ? (
              <div className="row" style={{ justifyContent: 'center', padding: 20 }}>
                <Loader2 className="animate-spin" size={20} />
              </div>
            ) : (
              <div>
                <div
                  onClick={() => setGroupFilter('all')}
                  className="row-between"
                  style={{
                    padding: '8px 10px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    marginBottom: 4,
                    background: groupFilter === 'all' ? 'rgba(201,168,76,0.1)' : 'transparent',
                    color: groupFilter === 'all' ? 'var(--rai-gold)' : 'var(--rai-text)',
                    fontWeight: groupFilter === 'all' ? 600 : 400,
                  }}
                >
                  <span>Todos los calendarios</span>
                  <span className="muted">{calendars.length}</span>
                </div>
                {groups.length === 0 ? (
                  <p className="muted" style={{ fontSize: 13, padding: '8px 10px' }}>
                    Sin grupos aún. Crea uno para organizar tus calendarios.
                  </p>
                ) : (
                  groups.map((g) => (
                    <div
                      key={g.id}
                      onClick={() => setGroupFilter(g.id)}
                      className="row-between"
                      style={{
                        padding: '8px 10px',
                        borderRadius: 6,
                        cursor: 'pointer',
                        marginBottom: 4,
                        background: groupFilter === g.id ? 'rgba(201,168,76,0.1)' : 'transparent',
                        color: groupFilter === g.id ? 'var(--rai-gold)' : 'var(--rai-text)',
                        fontWeight: groupFilter === g.id ? 600 : 400,
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <Users size={13} /> {g.name}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="muted">{g.calendars?.length ?? 0}</span>
                        <Trash2
                          size={13}
                          style={{ cursor: 'pointer' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteGroup(g.id);
                          }}
                        />
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Lista de calendarios */}
          <div className="card">
            <div className="row-between mb-4">
              <span style={{ fontWeight: 600 }}>
                {groupFilter === 'all' ? 'Todos los calendarios' : selectedGroup?.name || 'Calendarios'}
              </span>
              <button className="btn-sm primary" onClick={openNewCalendarModal}>
                <Plus size={14} /> Nuevo calendario
              </button>
            </div>

            {calendarsLoading ? (
              <div className="row" style={{ justifyContent: 'center', padding: 20 }}>
                <Loader2 className="animate-spin" size={20} />
              </div>
            ) : filteredCalendars.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <CalendarIcon size={32} className="muted" style={{ marginBottom: 8 }} />
                <p className="muted">No hay calendarios en esta vista.</p>
                <button className="btn-sm primary" style={{ marginTop: 12 }} onClick={openNewCalendarModal}>
                  <Plus size={14} /> Crear el primero
                </button>
              </div>
            ) : (
              <table className="table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Tipo</th>
                    <th>Duración</th>
                    <th>Grupo</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCalendars.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{c.name}</div>
                        {c.description && <div className="muted" style={{ fontSize: 12 }}>{c.description}</div>}
                      </td>
                      <td>{CALENDAR_TYPES.find((t) => t.id === c.type)?.label || c.type}</td>
                      <td>{c.durationMins} min</td>
                      <td>{c.group?.name || <span className="muted">—</span>}</td>
                      <td>
                        <span
                          className={c.status === 'active' ? 'badge-success' : 'badge-muted'}
                          style={{ cursor: 'pointer' }}
                          onClick={() => toggleCalendarStatus(c)}
                        >
                          {c.status === 'active' ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>
                        <div className="row" style={{ gap: 8, justifyContent: 'flex-end' }}>
                          <Pencil size={14} style={{ cursor: 'pointer' }} onClick={() => openEditCalendarModal(c)} />
                          <Trash2 size={14} style={{ cursor: 'pointer' }} onClick={() => deleteCalendar(c.id)} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Modal: Nuevo grupo */}
      {showGroupModal && (
        <div className="modal-backdrop" onClick={() => setShowGroupModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="row-between mb-4">
              <h3 style={{ margin: 0 }}>Nuevo grupo</h3>
              <X size={18} style={{ cursor: 'pointer' }} onClick={() => setShowGroupModal(false)} />
            </div>
            <div className="mb-4">
              <label className="muted" style={{ fontSize: 12 }}>Nombre</label>
              <input
                className="input"
                value={newGroup.name}
                onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                placeholder="Ej. Equipo de ventas"
                style={{ width: '100%' }}
              />
            </div>
            <div className="mb-4">
              <label className="muted" style={{ fontSize: 12 }}>Descripción (opcional)</label>
              <textarea
                className="input"
                value={newGroup.description}
                onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                rows={2}
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>
            <div className="mb-6">
              <label className="muted" style={{ fontSize: 12 }}>Plantilla</label>
              <select
                className="input"
                value={newGroup.template}
                onChange={(e) => setNewGroup({ ...newGroup, template: e.target.value })}
                style={{ width: '100%' }}
              >
                {TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
              <button className="ghost" onClick={() => setShowGroupModal(false)}>Cancelar</button>
              <button className="primary" onClick={createGroup} disabled={creatingGroup}>
                {creatingGroup ? <Loader2 className="animate-spin" size={14} /> : 'Crear grupo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Nuevo / editar calendario */}
      {showCalendarModal && (
        <div className="modal-backdrop" onClick={() => setShowCalendarModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="row-between mb-4">
              <h3 style={{ margin: 0 }}>{editingCalendar ? 'Editar calendario' : 'Nuevo calendario'}</h3>
              <X size={18} style={{ cursor: 'pointer' }} onClick={() => setShowCalendarModal(false)} />
            </div>
            <div className="mb-4">
              <label className="muted" style={{ fontSize: 12 }}>Nombre</label>
              <input
                className="input"
                value={calendarForm.name}
                onChange={(e) => setCalendarForm({ ...calendarForm, name: e.target.value })}
                placeholder="Ej. Reunión de descubrimiento"
                style={{ width: '100%' }}
              />
            </div>
            <div className="mb-4">
              <label className="muted" style={{ fontSize: 12 }}>Descripción (opcional)</label>
              <textarea
                className="input"
                value={calendarForm.description}
                onChange={(e) => setCalendarForm({ ...calendarForm, description: e.target.value })}
                rows={2}
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>
            <div className="grid-2 mb-4" style={{ gap: 12 }}>
              <div>
                <label className="muted" style={{ fontSize: 12 }}>Tipo</label>
                <select
                  className="input"
                  value={calendarForm.type}
                  onChange={(e) => setCalendarForm({ ...calendarForm, type: e.target.value })}
                  style={{ width: '100%' }}
                >
                  {CALENDAR_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="muted" style={{ fontSize: 12 }}>Duración (min)</label>
                <input
                  className="input"
                  type="number"
                  min={5}
                  step={5}
                  value={calendarForm.durationMins}
                  onChange={(e) => setCalendarForm({ ...calendarForm, durationMins: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
            <div className="mb-6">
              <label className="muted" style={{ fontSize: 12 }}>Grupo (opcional)</label>
              <select
                className="input"
                value={calendarForm.groupId}
                onChange={(e) => setCalendarForm({ ...calendarForm, groupId: e.target.value })}
                style={{ width: '100%' }}
              >
                <option value="">Sin grupo</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>

            {/* Disponibilidad semanal */}
            <div className="mb-4">
              <label className="muted" style={{ fontSize: 12 }}>Disponibilidad semanal</label>
              <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {AVAILABILITY_DAYS.map((day) => {
                  const w = calendarForm.availability[day.key];
                  return (
                    <div key={day.key} className="row" style={{ gap: 8 }}>
                      <label className="row" style={{ gap: 6, width: 110, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={w.enabled}
                          onChange={(e) =>
                            setCalendarForm({
                              ...calendarForm,
                              availability: {
                                ...calendarForm.availability,
                                [day.key]: { ...w, enabled: e.target.checked },
                              },
                            })
                          }
                        />
                        <span style={{ fontSize: 13 }}>{day.label}</span>
                      </label>
                      <input
                        type="time"
                        value={w.start}
                        disabled={!w.enabled}
                        onChange={(e) =>
                          setCalendarForm({
                            ...calendarForm,
                            availability: {
                              ...calendarForm.availability,
                              [day.key]: { ...w, start: e.target.value },
                            },
                          })
                        }
                        style={{ width: 110, opacity: w.enabled ? 1 : 0.4 }}
                      />
                      <span className="muted">–</span>
                      <input
                        type="time"
                        value={w.end}
                        disabled={!w.enabled}
                        onChange={(e) =>
                          setCalendarForm({
                            ...calendarForm,
                            availability: {
                              ...calendarForm.availability,
                              [day.key]: { ...w, end: e.target.value },
                            },
                          })
                        }
                        style={{ width: 110, opacity: w.enabled ? 1 : 0.4 }}
                      />
                    </div>
                  );
                })}
              </div>
              <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                Define los días y horarios en que este calendario acepta citas. Las citas creadas manualmente no se ven afectadas por esta configuración.
              </p>
            </div>

            {/* Reservas online */}
            {editingCalendar && (
              <div className="card mb-6" style={{ background: 'rgba(136,136,170,0.05)' }}>
                <div className="row-between">
                  <div>
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Link2 size={14} /> Aceptar reservas online
                    </div>
                    <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                      Genera un enlace público donde los contactos pueden agendar citas según la disponibilidad de arriba.
                    </p>
                  </div>
                  <button
                    className={calendarForm.bookingEnabled ? 'primary' : 'ghost'}
                    onClick={() => setCalendarForm({ ...calendarForm, bookingEnabled: !calendarForm.bookingEnabled })}
                  >
                    {calendarForm.bookingEnabled ? 'Activado' : 'Desactivado'}
                  </button>
                </div>
                {calendarForm.bookingEnabled && editingCalendar.bookingSlug && (
                  <div className="row" style={{ gap: 8, marginTop: 12 }}>
                    <input
                      readOnly
                      value={`${typeof window !== 'undefined' ? window.location.origin : ''}/book/${editingCalendar.bookingSlug}`}
                      style={{ flex: 1, fontSize: 12 }}
                    />
                    <button
                      className="btn-sm ghost"
                      onClick={() => {
                        const link = `${window.location.origin}/book/${editingCalendar.bookingSlug}`;
                        navigator.clipboard.writeText(link);
                        toast.success('Enlace copiado.');
                      }}
                    >
                      <Copy size={14} /> Copiar
                    </button>
                  </div>
                )}
                {calendarForm.bookingEnabled && !editingCalendar.bookingSlug && (
                  <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                    El enlace se generará al guardar.
                  </p>
                )}
              </div>
            )}

            <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
              <button className="ghost" onClick={() => setShowCalendarModal(false)}>Cancelar</button>
              <button className="primary" onClick={saveCalendar} disabled={savingCalendar}>
                {savingCalendar ? <Loader2 className="animate-spin" size={14} /> : editingCalendar ? 'Guardar cambios' : 'Crear calendario'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB: CITAS ===================== */}
      {topTab === 'citas' && (
        <div>
          <div className="row mb-6" style={{ gap: 8 }}>
            <button
              className={citasSubTab === 'lista' ? 'primary' : 'ghost'}
              onClick={() => setCitasSubTab('lista')}
            >
              Vista de lista
            </button>
            <button
              className={citasSubTab === 'calendario' ? 'primary' : 'ghost'}
              onClick={() => setCitasSubTab('calendario')}
            >
              Vista de calendario
            </button>
            <div style={{ flex: 1 }} />
            <button className="primary" onClick={() => openNewAppointmentModal()}>
              <Plus size={14} /> Nueva cita
            </button>
          </div>

          {citasSubTab === 'lista' && (
            <div className="card">
              <div className="row mb-4" style={{ gap: 8 }}>
                {APPOINTMENT_FILTERS.map((f) => (
                  <button
                    key={f.id}
                    className={appointmentFilter === f.id ? 'primary' : 'ghost'}
                    onClick={() => setAppointmentFilter(f.id as 'proximo' | 'cancelado' | 'todos')}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {appointmentsLoading ? (
                <div className="row" style={{ justifyContent: 'center', padding: 20 }}>
                  <Loader2 className="animate-spin" size={20} />
                </div>
              ) : filteredAppointments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <CalendarClock size={32} className="muted" style={{ marginBottom: 8 }} />
                  <p className="muted">No hay citas en esta vista.</p>
                </div>
              ) : (
                <table className="table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Cita</th>
                      <th>Calendario</th>
                      <th>Contacto</th>
                      <th>Fecha</th>
                      <th>Hora</th>
                      <th>Estado</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAppointments.map((a) => {
                      const start = new Date(a.startTime);
                      const end = new Date(a.endTime);
                      return (
                        <tr key={a.id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{a.title}</div>
                            {a.notes && <div className="muted" style={{ fontSize: 12 }}>{a.notes}</div>}
                          </td>
                          <td>{a.calendar?.name || '—'}</td>
                          <td>{a.contact?.name || <span className="muted">Sin contacto</span>}</td>
                          <td>{start.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                          <td>{fmtTime(start)} – {fmtTime(end)}</td>
                          <td>
                            <span className={STATUS_BADGE[a.status] || 'badge-muted'}>
                              {STATUS_LABELS[a.status] || a.status}
                            </span>
                          </td>
                          <td>
                            <div className="row" style={{ gap: 8, justifyContent: 'flex-end' }}>
                              <Pencil size={14} style={{ cursor: 'pointer' }} onClick={() => openEditAppointmentModal(a)} />
                              {a.status !== 'cancelled' && (
                                <X size={14} style={{ cursor: 'pointer' }} onClick={() => cancelAppointment(a)} />
                              )}
                              <Trash2 size={14} style={{ cursor: 'pointer' }} onClick={() => deleteAppointment(a.id)} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {citasSubTab === 'calendario' && (
            <div className="card">
              <div className="row-between mb-4">
                <div className="row" style={{ gap: 8 }}>
                  <button className="btn-sm ghost" onClick={() => setWeekStart(addDays(weekStart, -7))}>
                    <ChevronLeft size={14} />
                  </button>
                  <button className="btn-sm ghost" onClick={() => setWeekStart(startOfWeek(new Date()))}>
                    Hoy
                  </button>
                  <button className="btn-sm ghost" onClick={() => setWeekStart(addDays(weekStart, 7))}>
                    <ChevronRight size={14} />
                  </button>
                </div>
                <span style={{ fontWeight: 600 }}>{fmtWeekRange(weekStart)}</span>
              </div>

              {appointmentsLoading ? (
                <div className="row" style={{ justifyContent: 'center', padding: 20 }}>
                  <Loader2 className="animate-spin" size={20} />
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', minWidth: 800 }}>
                    {/* Header row */}
                    <div></div>
                    {weekDays.map((d, i) => (
                      <div key={d.toISOString()} style={{ textAlign: 'center', padding: '8px 4px', borderBottom: '1px solid var(--rai-border)' }}>
                        <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase' }}>{DAY_NAMES[i]}</div>
                        <div style={{ fontWeight: 600 }}>{d.getDate()}</div>
                      </div>
                    ))}

                    {/* Hour rows */}
                    {HOURS.map((hour) => (
                      <React.Fragment key={hour}>
                        <div className="muted" style={{ fontSize: 11, padding: '6px 4px', borderTop: '1px solid var(--rai-border)', textAlign: 'right' }}>
                          {String(hour).padStart(2, '0')}:00
                        </div>
                        {weekDays.map((d) => {
                          const items = appointmentsFor(d, hour);
                          return (
                            <div
                              key={d.toISOString() + hour}
                              style={{
                                borderTop: '1px solid var(--rai-border)',
                                borderLeft: '1px solid var(--rai-border)',
                                minHeight: 36,
                                padding: 2,
                                cursor: 'pointer',
                              }}
                              onClick={() => {
                                if (items.length === 0) {
                                  const start = new Date(d);
                                  start.setHours(hour, 0, 0, 0);
                                  const end = new Date(start.getTime() + 30 * 60 * 1000);
                                  openNewAppointmentModal({ start, end });
                                }
                              }}
                            >
                              {items.map((a) => (
                                <div
                                  key={a.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditAppointmentModal(a);
                                  }}
                                  className="badge-gold"
                                  style={{
                                    fontSize: 11,
                                    padding: '2px 6px',
                                    borderRadius: 4,
                                    marginBottom: 2,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    cursor: 'pointer',
                                  }}
                                  title={`${a.title} (${fmtTime(new Date(a.startTime))} - ${fmtTime(new Date(a.endTime))})`}
                                >
                                  {fmtTime(new Date(a.startTime))} {a.title}
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal: Nueva / editar cita */}
      {showAppointmentModal && (
        <div className="modal-backdrop" onClick={() => setShowAppointmentModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="row-between mb-4">
              <h3 style={{ margin: 0 }}>{editingAppointment ? 'Editar cita' : 'Nueva cita'}</h3>
              <X size={18} style={{ cursor: 'pointer' }} onClick={() => setShowAppointmentModal(false)} />
            </div>
            <div className="mb-4">
              <label className="muted" style={{ fontSize: 12 }}>Título</label>
              <input
                className="input"
                value={appointmentForm.title}
                onChange={(e) => setAppointmentForm({ ...appointmentForm, title: e.target.value })}
                placeholder="Ej. Llamada de seguimiento"
                style={{ width: '100%' }}
              />
            </div>
            <div className="grid-2 mb-4" style={{ gap: 12 }}>
              <div>
                <label className="muted" style={{ fontSize: 12 }}>Calendario</label>
                <select
                  className="input"
                  value={appointmentForm.calendarId}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, calendarId: e.target.value })}
                  style={{ width: '100%' }}
                >
                  {calendars.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="muted" style={{ fontSize: 12 }}>Contacto (opcional)</label>
                <select
                  className="input"
                  value={appointmentForm.contactId}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, contactId: e.target.value })}
                  style={{ width: '100%' }}
                >
                  <option value="">Sin contacto</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid-2 mb-4" style={{ gap: 12 }}>
              <div>
                <label className="muted" style={{ fontSize: 12 }}>Inicio</label>
                <input
                  className="input"
                  type="datetime-local"
                  value={appointmentForm.start}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, start: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label className="muted" style={{ fontSize: 12 }}>Fin</label>
                <input
                  className="input"
                  type="datetime-local"
                  value={appointmentForm.end}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, end: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="muted" style={{ fontSize: 12 }}>Notas (opcional)</label>
              <textarea
                className="input"
                value={appointmentForm.notes}
                onChange={(e) => setAppointmentForm({ ...appointmentForm, notes: e.target.value })}
                rows={2}
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>
            {editingAppointment && (
              <div className="mb-6">
                <label className="muted" style={{ fontSize: 12 }}>Estado</label>
                <select
                  className="input"
                  value={appointmentForm.status}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, status: e.target.value })}
                  style={{ width: '100%' }}
                >
                  {Object.keys(STATUS_LABELS).map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="row-between">
              {editingAppointment ? (
                <button className="ghost" onClick={() => deleteAppointment(editingAppointment.id)}>
                  <Trash2 size={14} /> Eliminar
                </button>
              ) : <div />}
              <div className="row" style={{ gap: 8 }}>
                <button className="ghost" onClick={() => setShowAppointmentModal(false)}>Cancelar</button>
                <button className="primary" onClick={saveAppointment} disabled={savingAppointment}>
                  {savingAppointment ? <Loader2 className="animate-spin" size={14} /> : editingAppointment ? 'Guardar cambios' : 'Crear cita'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB: CONEXIONES ===================== */}
      {topTab === 'conexiones' && (
        <div className="grid" style={{ gap: 24 }}>
          <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <Link2 size={32} className="muted" style={{ marginBottom: 12 }} />
            <h3 style={{ margin: '0 0 4px' }}>No se han encontrado conexiones</h3>
            <p className="muted mb-6">Conecta Google Calendar u Outlook para sincronizar tus eventos automáticamente.</p>
            <button className="primary" onClick={() => toast('Conexión con calendarios externos: próximamente.', { icon: '🔧' })}>
              <Plus size={14} /> Añadir nuevo
            </button>
          </div>

          <div className="card">
            <div className="row-between">
              <div>
                <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <SettingsIcon size={15} /> Modo privado
                </div>
                <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                  Oculta los detalles de los eventos sincronizados desde calendarios externos (solo se mostrará "Ocupado").
                </p>
              </div>
              <div>
                {settingsLoading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <button
                    className={settings?.calendarHideEventDetails ? 'primary' : 'ghost'}
                    onClick={togglePrivateMode}
                    disabled={savingPrivateMode}
                  >
                    {savingPrivateMode ? (
                      <Loader2 className="animate-spin" size={14} />
                    ) : settings?.calendarHideEventDetails ? (
                      'Activado'
                    ) : (
                      'Desactivado'
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
