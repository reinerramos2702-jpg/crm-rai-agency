'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  MessageSquare,
  Zap,
  FileText,
  Link2,
  BarChart3,
  Settings,
  Search,
  Star,
  Paperclip,
  CreditCard,
  StickyNote,
  CheckSquare,
  Target,
  Building2,
  Activity,
  Bot,
  Send,
  Plus,
  ExternalLink,
  Trash2,
  Copy,
  UserPlus,
  X,
  Loader2,
  RefreshCcw,
  ChevronDown,
  Info,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { COUNTRY_CODES, flagUrl } from '@/lib/countries';

const TOP_TABS = [
  { id: 'chat', label: 'Conversaciones', icon: MessageSquare },
  { id: 'manual', label: 'Acciones Manuales', icon: Zap },
  { id: 'snippets', label: 'Fragmentos', icon: FileText },
  { id: 'links', label: 'Enlaces de Activación', icon: Link2 },
  { id: 'analytics', label: 'Analítica', icon: BarChart3 },
  { id: 'settings', label: 'Configuración', icon: Settings },
];

const SIDE_PANELS = [
  { id: 'docs', label: 'Documentos', icon: FileText, empty: 'Todavía no hay documentos. Sube o envía documentos para verlos aquí.' },
  { id: 'pagos', label: 'Pagos', icon: CreditCard, empty: 'Aún no hay transacciones. Crea un nuevo pago ahora.' },
  { id: 'notas', label: 'Notas', icon: StickyNote, empty: 'Todavía no hay notas. Mantén un registro de detalles importantes.' },
  { id: 'tareas', label: 'Tareas', icon: CheckSquare, empty: 'Todavía no hay tareas. Mantén la organización creando tu primera tarea.' },
  { id: 'leads', label: 'Clientes Potenciales', icon: Target, empty: 'Todavía no hay clientes potenciales. Crea o vincula una oportunidad.' },
  { id: 'companies', label: 'Asociaciones', icon: Building2, empty: 'No hay empresas asociadas a este contacto.' },
  { id: 'activity', label: 'Actividad', icon: Activity, empty: 'Aún no hay actividades. Visitas, formularios y citas aparecerán aquí.' },
  { id: 'agent', label: 'Agent Logs', icon: Bot, empty: 'No se encontraron registros de agente IA.' },
];

interface Message {
  id: string;
  body: string;
  direction: 'in' | 'out';
  sender: 'contact' | 'agent' | 'ai';
  createdAt: string;
}

interface Conversation {
  id: string;
  channel: string;
  status: string;
  unreadCount: number;
  lastMessageAt: string | null;
  messages: Message[];
}

interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  conversations: Conversation[];
}

interface Note {
  id: string;
  body: string;
  createdAt: string;
}

interface ContactTask {
  id: string;
  title: string;
  done: boolean;
  dueAt: string | null;
  createdAt: string;
}

interface ContactDetail extends Contact {
  notes: Note[];
  contactTasks: ContactTask[];
}

interface Snippet {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

interface ActivationLink {
  id: string;
  label: string;
  slug: string;
  destination: string;
  clicks: number;
  createdAt: string;
}

interface SettingsState {
  slaFirstResponseMins: string;
  slaOverdueMins: string;
  aiCountsAsResponse: boolean;
}

function timeAgo(iso: string | null) {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function formatClock(iso: string) {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

export default function ConversacionesPage() {
  const [topTab, setTopTab] = useState('chat');

  // ---------- Contactos / Chat ----------
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ContactDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const chatLogRef = useRef<HTMLDivElement>(null);

  const [showNewContact, setShowNewContact] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', email: '' });
  const [phoneLocal, setPhoneLocal] = useState('');
  const [countryIdx, setCountryIdx] = useState(0); // default: Venezuela (+58)
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [creatingContact, setCreatingContact] = useState(false);

  // ---------- Side panels ----------
  const [sidePanel, setSidePanel] = useState('notas');
  const [noteInput, setNoteInput] = useState('');
  const [taskInput, setTaskInput] = useState('');

  // ---------- Fragmentos ----------
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [snippetsLoading, setSnippetsLoading] = useState(false);
  const [newSnippet, setNewSnippet] = useState({ title: '', body: '' });

  // ---------- Enlaces de activación ----------
  const [links, setLinks] = useState<ActivationLink[]>([]);
  const [linksLoading, setLinksLoading] = useState(false);
  const [newLink, setNewLink] = useState({ label: '', destination: '' });

  // ---------- Configuración (SLA) ----------
  const [settingsForm, setSettingsForm] = useState<SettingsState>({
    slaFirstResponseMins: '',
    slaOverdueMins: '',
    aiCountsAsResponse: false,
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  // ============================================================
  // Carga inicial
  // ============================================================
  useEffect(() => {
    loadContacts();
  }, []);

  useEffect(() => {
    if (topTab === 'snippets' && snippets.length === 0) loadSnippets();
    if (topTab === 'links' && links.length === 0) loadLinks();
    if (topTab === 'settings') loadSettings();
  }, [topTab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeContactId) loadContactDetail(activeContactId);
    else setDetail(null);
  }, [activeContactId]);

  useEffect(() => {
    chatLogRef.current?.scrollTo({ top: chatLogRef.current.scrollHeight, behavior: 'smooth' });
  }, [detail?.conversations[0]?.messages.length]);

  async function loadContacts() {
    setContactsLoading(true);
    try {
      const res = await fetch('/api/contacts');
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts || []);
        if (!activeContactId && data.contacts?.[0]) setActiveContactId(data.contacts[0].id);
      } else {
        toast.error('Error cargando contactos');
      }
    } catch {
      toast.error('Error de red al cargar contactos');
    } finally {
      setContactsLoading(false);
    }
  }

  async function loadContactDetail(id: string) {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/contacts/${id}`);
      if (res.ok) {
        const data = await res.json();
        setDetail(data.contact);
        const conv = data.contact?.conversations?.[0];
        if (conv && conv.unreadCount > 0) {
          await fetch(`/api/conversations/${conv.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ unreadCount: 0 }),
          });
          setContacts((prev) =>
            prev.map((c) => (c.id === id ? { ...c, conversations: c.conversations.map((cv) => ({ ...cv, unreadCount: 0 })) } : c))
          );
        }
      } else {
        toast.error('Error cargando la conversación');
      }
    } catch {
      toast.error('Error de red');
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleCreateContact() {
    if (!newContact.name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    setCreatingContact(true);
    try {
      const country = COUNTRY_CODES[countryIdx];
      const phone = phoneLocal.trim() ? `${country.dial} ${phoneLocal.trim()}` : '';

      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newContact, phone }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success('Contacto creado');
        setShowNewContact(false);
        setNewContact({ name: '', email: '' });
        setPhoneLocal('');
        await loadContacts();
        setActiveContactId(data.contact.id);
      } else {
        // El servidor respondió con error: puede ser JSON ({error: '...'})
        // o una página HTML de error 500 (p. ej. si falta `npx prisma generate`
        // / `npx prisma migrate dev` tras agregar los modelos de Conversaciones).
        let msg = `Error del servidor (${res.status})`;
        try {
          const err = await res.json();
          msg = err.error || msg;
        } catch {
          msg = `Error del servidor (${res.status}). Si acabas de actualizar el código, corre "npx prisma generate" y "npx prisma migrate dev" y reinicia "npm run dev".`;
        }
        toast.error(msg, { duration: 6000 });
      }
    } catch {
      toast.error('Error de red: no se pudo contactar al servidor. ¿Está corriendo "npm run dev"?');
    } finally {
      setCreatingContact(false);
    }
  }

  async function handleSendMessage(sender: 'agent' | 'contact' = 'agent', overrideBody?: string) {
    const body = (overrideBody ?? messageInput).trim();
    const conv = detail?.conversations[0];
    if (!body || !conv) return;
    setSending(true);
    try {
      const res = await fetch(`/api/conversations/${conv.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body, sender }),
      });
      if (res.ok) {
        const data = await res.json();
        setDetail((prev) =>
          prev
            ? {
                ...prev,
                conversations: prev.conversations.map((c, i) =>
                  i === 0 ? { ...c, messages: [...c.messages, data.message], lastMessageAt: data.message.createdAt, unreadCount: 0 } : c
                ),
              }
            : prev
        );
        if (!overrideBody) setMessageInput('');
        loadContacts();
      } else {
        toast.error('Error enviando mensaje');
      }
    } catch {
      toast.error('Error de red');
    } finally {
      setSending(false);
    }
  }

  // ============================================================
  // Notas / Tareas (panel lateral)
  // ============================================================
  async function addNote() {
    if (!noteInput.trim() || !detail) return;
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId: detail.id, body: noteInput.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setDetail((prev) => (prev ? { ...prev, notes: [data.note, ...prev.notes] } : prev));
        setNoteInput('');
      } else {
        toast.error('Error guardando nota');
      }
    } catch {
      toast.error('Error de red');
    }
  }

  async function deleteNote(id: string) {
    try {
      const res = await fetch(`/api/notes?id=${id}`, { method: 'DELETE' });
      if (res.ok) setDetail((prev) => (prev ? { ...prev, notes: prev.notes.filter((n) => n.id !== id) } : prev));
    } catch {
      toast.error('Error de red');
    }
  }

  async function addTask() {
    if (!taskInput.trim() || !detail) return;
    try {
      const res = await fetch('/api/contact-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId: detail.id, title: taskInput.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setDetail((prev) => (prev ? { ...prev, contactTasks: [data.task, ...prev.contactTasks] } : prev));
        setTaskInput('');
      } else {
        toast.error('Error creando tarea');
      }
    } catch {
      toast.error('Error de red');
    }
  }

  async function toggleTask(task: ContactTask) {
    try {
      const res = await fetch('/api/contact-tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: task.id, done: !task.done }),
      });
      if (res.ok) {
        setDetail((prev) =>
          prev ? { ...prev, contactTasks: prev.contactTasks.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t)) } : prev
        );
      }
    } catch {
      toast.error('Error de red');
    }
  }

  async function deleteTask(id: string) {
    try {
      const res = await fetch(`/api/contact-tasks?id=${id}`, { method: 'DELETE' });
      if (res.ok) setDetail((prev) => (prev ? { ...prev, contactTasks: prev.contactTasks.filter((t) => t.id !== id) } : prev));
    } catch {
      toast.error('Error de red');
    }
  }

  // ============================================================
  // Fragmentos
  // ============================================================
  async function loadSnippets() {
    setSnippetsLoading(true);
    try {
      const res = await fetch('/api/snippets');
      if (res.ok) setSnippets((await res.json()).snippets || []);
    } catch {
      toast.error('Error de red');
    } finally {
      setSnippetsLoading(false);
    }
  }

  async function addSnippet() {
    if (!newSnippet.title.trim() || !newSnippet.body.trim()) {
      toast.error('Completa título y contenido');
      return;
    }
    try {
      const res = await fetch('/api/snippets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSnippet),
      });
      if (res.ok) {
        const data = await res.json();
        setSnippets((prev) => [data.snippet, ...prev]);
        setNewSnippet({ title: '', body: '' });
        toast.success('Fragmento guardado');
      } else {
        toast.error('Error guardando fragmento');
      }
    } catch {
      toast.error('Error de red');
    }
  }

  async function deleteSnippet(id: string) {
    try {
      const res = await fetch(`/api/snippets?id=${id}`, { method: 'DELETE' });
      if (res.ok) setSnippets((prev) => prev.filter((s) => s.id !== id));
    } catch {
      toast.error('Error de red');
    }
  }

  function useSnippet(body: string) {
    setTopTab('chat');
    setMessageInput((prev) => (prev ? `${prev} ${body}` : body));
    toast.success('Fragmento insertado en el mensaje');
  }

  // ============================================================
  // Enlaces de activación
  // ============================================================
  async function loadLinks() {
    setLinksLoading(true);
    try {
      const res = await fetch('/api/activation-links');
      if (res.ok) setLinks((await res.json()).links || []);
    } catch {
      toast.error('Error de red');
    } finally {
      setLinksLoading(false);
    }
  }

  async function addLink() {
    if (!newLink.label.trim() || !newLink.destination.trim()) {
      toast.error('Completa nombre y destino');
      return;
    }
    try {
      const res = await fetch('/api/activation-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLink),
      });
      if (res.ok) {
        const data = await res.json();
        setLinks((prev) => [data.link, ...prev]);
        setNewLink({ label: '', destination: '' });
        toast.success('Enlace creado');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Error creando enlace');
      }
    } catch {
      toast.error('Error de red');
    }
  }

  async function deleteLink(id: string) {
    try {
      const res = await fetch(`/api/activation-links?id=${id}`, { method: 'DELETE' });
      if (res.ok) setLinks((prev) => prev.filter((l) => l.id !== id));
    } catch {
      toast.error('Error de red');
    }
  }

  function copyLink(slug: string) {
    const url = `${window.location.origin}/go/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Enlace copiado');
  }

  // ============================================================
  // Configuración (SLA)
  // ============================================================
  async function loadSettings() {
    setSettingsLoading(true);
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        const s = data.settings;
        setSettingsForm({
          slaFirstResponseMins: s?.slaFirstResponseMins != null ? String(s.slaFirstResponseMins) : '',
          slaOverdueMins: s?.slaOverdueMins != null ? String(s.slaOverdueMins) : '',
          aiCountsAsResponse: !!s?.aiCountsAsResponse,
        });
      }
    } catch {
      toast.error('Error cargando configuración');
    } finally {
      setSettingsLoading(false);
    }
  }

  async function saveSettings() {
    setSettingsSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slaFirstResponseMins: settingsForm.slaFirstResponseMins ? Number(settingsForm.slaFirstResponseMins) : null,
          slaOverdueMins: settingsForm.slaOverdueMins ? Number(settingsForm.slaOverdueMins) : null,
          aiCountsAsResponse: settingsForm.aiCountsAsResponse,
        }),
      });
      if (res.ok) toast.success('Configuración guardada');
      else toast.error('Error guardando configuración');
    } catch {
      toast.error('Error de red');
    } finally {
      setSettingsSaving(false);
    }
  }

  // ============================================================
  // Derivados
  // ============================================================
  const filteredContacts = contacts.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
  const activeConversation = detail?.conversations[0];
  const panel = SIDE_PANELS.find((p) => p.id === sidePanel) ?? SIDE_PANELS[0];

  const totalContactos = contacts.length;
  const conversacionesAbiertas = contacts.filter((c) => c.conversations[0]?.status === 'open').length;
  const conversacionesResueltas = contacts.filter((c) => c.conversations[0]?.status === 'closed').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div
        className="row"
        style={{ gap: 8, flexWrap: 'wrap', padding: '20px 32px 16px', borderBottom: '1px solid var(--rai-border)' }}
      >
        <h1 className="h1" style={{ marginRight: 16 }}>Conversaciones</h1>
        {TOP_TABS.map(({ id, label, icon: Icon }) => {
          const isActive = id === topTab;
          return (
            <button key={id} className={isActive ? 'primary' : 'ghost'} onClick={() => setTopTab(id)} style={{ fontSize: 13 }}>
              <Icon size={14} />
              {label}
            </button>
          );
        })}
      </div>

      {topTab === 'chat' ? (
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* ---------- Lista de contactos ---------- */}
          <div style={{ width: 280, borderRight: '1px solid var(--rai-border)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: 16, borderBottom: '1px solid var(--rai-border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="row-between">
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={14} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--rai-muted)' }} />
                  <input
                    placeholder="Buscar conversaciones..."
                    style={{ paddingLeft: 36, width: '100%' }}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
              <button className="primary btn-sm" onClick={() => setShowNewContact(true)} style={{ justifyContent: 'center' }}>
                <UserPlus size={14} /> Nuevo contacto
              </button>
            </div>
            <div className="chat-log" style={{ gap: 0 }}>
              {contactsLoading && (
                <div className="muted" style={{ fontSize: 13, textAlign: 'center', padding: '24px 12px', display: 'flex', justifyContent: 'center' }}>
                  <Loader2 size={16} className="animate-spin" />
                </div>
              )}
              {!contactsLoading && filteredContacts.length === 0 && (
                <div className="muted" style={{ fontSize: 13, textAlign: 'center', padding: '24px 12px' }}>
                  Todavía no hay conversaciones. Crea un contacto para empezar.
                </div>
              )}
              {filteredContacts.map((c) => {
                const isActive = c.id === activeContactId;
                const conv = c.conversations[0];
                const lastMsg = conv?.messages[0];
                return (
                  <div
                    key={c.id}
                    onClick={() => setActiveContactId(c.id)}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      background: isActive ? 'rgba(201,168,76,0.1)' : 'transparent',
                      border: isActive ? '1px solid rgba(201,168,76,0.2)' : '1px solid transparent',
                      marginBottom: 2,
                    }}
                  >
                    <div className="row-between">
                      <strong style={{ fontSize: 13 }}>{c.name}</strong>
                      <span className="muted" style={{ fontSize: 11 }}>{timeAgo(conv?.lastMessageAt ?? null)}</span>
                    </div>
                    <div className="row-between mt-2">
                      <span className="muted truncate" style={{ fontSize: 12, maxWidth: 160 }}>
                        {lastMsg?.body || 'Sin mensajes todavía'}
                      </span>
                      {!!conv?.unreadCount && <span className="badge badge-gold">{conv.unreadCount}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ---------- Hilo de chat ---------- */}
          <div className="chat-container" style={{ flex: 1, borderRight: '1px solid var(--rai-border)' }}>
            <div className="row-between" style={{ padding: '14px 20px', borderBottom: '1px solid var(--rai-border)' }}>
              <div>
                <h3>{detail?.name ?? 'Sin conversación seleccionada'}</h3>
                {detail && (
                  <span className="muted" style={{ fontSize: 11 }}>
                    {detail.email || detail.phone || 'Sin datos de contacto'} · canal: {activeConversation?.channel ?? 'manual'}
                  </span>
                )}
              </div>
              <div className="row" style={{ gap: 8 }}>
                <button className="ghost btn-sm" title="Próximamente"><Star size={14} /></button>
                <button className="ghost btn-sm" title="Próximamente"><Paperclip size={14} /></button>
              </div>
            </div>
            <div className="chat-log" ref={chatLogRef}>
              {detailLoading && (
                <div className="muted" style={{ fontSize: 13, textAlign: 'center', padding: '24px 12px', display: 'flex', justifyContent: 'center' }}>
                  <Loader2 size={16} className="animate-spin" />
                </div>
              )}
              {!detailLoading && !activeConversation && (
                <div className="muted" style={{ fontSize: 13, textAlign: 'center', padding: '24px 12px' }}>
                  Selecciona o crea un contacto para ver los mensajes aquí.
                </div>
              )}
              {!detailLoading && activeConversation && activeConversation.messages.length === 0 && (
                <div className="muted" style={{ fontSize: 13, textAlign: 'center', padding: '24px 12px' }}>
                  Todavía no hay mensajes. Escribe el primero abajo.
                </div>
              )}
              {activeConversation?.messages.map((m) => (
                <div key={m.id} className={`chat-bubble ${m.direction === 'out' ? 'user' : 'assistant'}`}>
                  {m.body}
                  <div className="muted" style={{ fontSize: 10, marginTop: 6 }}>
                    {m.sender === 'ai' ? 'IA · ' : m.sender === 'contact' ? 'Cliente · ' : 'Tú · '}
                    {formatClock(m.createdAt)}
                  </div>
                </div>
              ))}
            </div>
            <div className="chat-input-row">
              <input
                placeholder="Escribir un mensaje..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage('agent');
                  }
                }}
                disabled={!activeConversation || sending}
              />
              {activeConversation && (
                <button
                  className="ghost btn-sm"
                  title="Simular respuesta del cliente (para pruebas)"
                  onClick={() => handleSendMessage('contact', 'Gracias, lo reviso y te confirmo.')}
                  disabled={sending}
                >
                  <RefreshCcw size={14} />
                </button>
              )}
              <button className="primary" onClick={() => handleSendMessage('agent')} disabled={!activeConversation || sending || !messageInput.trim()}>
                <Send size={14} />
              </button>
            </div>
          </div>

          {/* ---------- Panel lateral ---------- */}
          <div style={{ width: 320, display: 'flex' }}>
            <div style={{ width: 48, borderRight: '1px solid var(--rai-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 12, gap: 4 }}>
              {SIDE_PANELS.map(({ id, label, icon: Icon }) => {
                const isActive = id === sidePanel;
                return (
                  <button
                    key={id}
                    onClick={() => setSidePanel(id)}
                    title={label}
                    style={{
                      width: 36,
                      height: 36,
                      padding: 0,
                      background: isActive ? 'rgba(201,168,76,0.1)' : 'transparent',
                      border: isActive ? '1px solid rgba(201,168,76,0.2)' : '1px solid transparent',
                      color: isActive ? 'var(--rai-gold)' : 'var(--rai-muted)',
                      borderRadius: 8,
                    }}
                  >
                    <Icon size={16} />
                  </button>
                );
              })}
            </div>
            <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
              <div className="row-between mb-4">
                <h3>{panel.label}</h3>
              </div>

              {!detail && (
                <div className="card" style={{ textAlign: 'center', color: 'var(--rai-muted)', fontSize: 13, padding: 24 }}>
                  Selecciona un contacto para ver {panel.label.toLowerCase()}.
                </div>
              )}

              {detail && sidePanel === 'notas' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="row" style={{ gap: 6 }}>
                    <input
                      placeholder="Escribir nota..."
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addNote()}
                      style={{ flex: 1 }}
                    />
                    <button className="primary btn-sm" onClick={addNote}><Plus size={14} /></button>
                  </div>
                  {detail.notes.length === 0 && (
                    <div className="card" style={{ textAlign: 'center', color: 'var(--rai-muted)', fontSize: 13, padding: 24 }}>
                      {panel.empty}
                    </div>
                  )}
                  {detail.notes.map((n) => (
                    <div key={n.id} className="card" style={{ padding: 10, fontSize: 12 }}>
                      <div className="row-between">
                        <span className="muted" style={{ fontSize: 10 }}>{new Date(n.createdAt).toLocaleString('es-ES')}</span>
                        <button className="ghost btn-sm" onClick={() => deleteNote(n.id)}><Trash2 size={12} /></button>
                      </div>
                      <div className="mt-2">{n.body}</div>
                    </div>
                  ))}
                </div>
              )}

              {detail && sidePanel === 'tareas' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="row" style={{ gap: 6 }}>
                    <input
                      placeholder="Nueva tarea..."
                      value={taskInput}
                      onChange={(e) => setTaskInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addTask()}
                      style={{ flex: 1 }}
                    />
                    <button className="primary btn-sm" onClick={addTask}><Plus size={14} /></button>
                  </div>
                  {detail.contactTasks.length === 0 && (
                    <div className="card" style={{ textAlign: 'center', color: 'var(--rai-muted)', fontSize: 13, padding: 24 }}>
                      {panel.empty}
                    </div>
                  )}
                  {detail.contactTasks.map((t) => (
                    <div key={t.id} className="card row-between" style={{ padding: 10, fontSize: 12 }}>
                      <label className="row" style={{ gap: 8, cursor: 'pointer' }}>
                        <input type="checkbox" checked={t.done} onChange={() => toggleTask(t)} />
                        <span style={{ textDecoration: t.done ? 'line-through' : 'none', color: t.done ? 'var(--rai-muted)' : 'inherit' }}>
                          {t.title}
                        </span>
                      </label>
                      <button className="ghost btn-sm" onClick={() => deleteTask(t.id)}><Trash2 size={12} /></button>
                    </div>
                  ))}
                </div>
              )}

              {detail && sidePanel !== 'notas' && sidePanel !== 'tareas' && (
                <div className="card" style={{ textAlign: 'center', color: 'var(--rai-muted)', fontSize: 13, padding: 24 }}>
                  {panel.empty}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : topTab === 'snippets' ? (
        <div className="container">
          <div className="card mb-6">
            <p className="muted">Guarda respuestas rápidas para reutilizar en tus conversaciones.</p>
          </div>
          <div className="card mb-6" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input placeholder="Título (ej. CTA — Compra ahora)" value={newSnippet.title} onChange={(e) => setNewSnippet((p) => ({ ...p, title: e.target.value }))} />
            <textarea placeholder="Contenido del fragmento..." rows={3} value={newSnippet.body} onChange={(e) => setNewSnippet((p) => ({ ...p, body: e.target.value }))} />
            <button className="primary" onClick={addSnippet} style={{ alignSelf: 'flex-start' }}><Plus size={14} /> Agregar fragmento</button>
          </div>
          {snippetsLoading && <Loader2 size={16} className="animate-spin" />}
          {!snippetsLoading && snippets.length === 0 && (
            <div className="card mb-4" style={{ textAlign: 'center', color: 'var(--rai-muted)', fontSize: 13, padding: 32 }}>
              Todavía no hay fragmentos. Crea el primero arriba.
            </div>
          )}
          <div className="grid grid-3">
            {snippets.map((s) => (
              <div key={s.id} className="card">
                <div className="row-between mb-2">
                  <strong style={{ fontSize: 13 }}>{s.title}</strong>
                  <button className="ghost btn-sm" onClick={() => deleteSnippet(s.id)}><Trash2 size={12} /></button>
                </div>
                <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>{s.body}</p>
                <button className="ghost btn-sm" onClick={() => useSnippet(s.body)}>Usar en chat</button>
              </div>
            ))}
          </div>
        </div>
      ) : topTab === 'links' ? (
        <div className="container">
          <div className="card mb-6">
            <p className="muted">Enlaces cortos rastreables para iniciar conversaciones desde campañas.</p>
          </div>
          <div className="card mb-6" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input placeholder="Nombre (ej. IG Bio Link)" value={newLink.label} onChange={(e) => setNewLink((p) => ({ ...p, label: e.target.value }))} />
            <input placeholder="Destino (URL a la que redirige)" value={newLink.destination} onChange={(e) => setNewLink((p) => ({ ...p, destination: e.target.value }))} />
            <button className="primary" onClick={addLink} style={{ alignSelf: 'flex-start' }}><Plus size={14} /> Crear enlace</button>
          </div>
          {linksLoading && <Loader2 size={16} className="animate-spin" />}
          {!linksLoading && links.length === 0 && (
            <div className="card mb-4" style={{ textAlign: 'center', color: 'var(--rai-muted)', fontSize: 13, padding: 32 }}>
              Todavía no hay enlaces de activación. Crea el primero arriba.
            </div>
          )}
          <div className="grid grid-3">
            {links.map((l) => (
              <div key={l.id} className="card">
                <div className="row-between mb-2">
                  <strong style={{ fontSize: 13 }}>{l.label}</strong>
                  <button className="ghost btn-sm" onClick={() => deleteLink(l.id)}><Trash2 size={12} /></button>
                </div>
                <p className="muted truncate" style={{ fontSize: 12 }}>→ {l.destination}</p>
                <div className="row-between mt-2">
                  <code style={{ fontSize: 11 }}>/go/{l.slug}</code>
                  <div className="row" style={{ gap: 8 }}>
                    <span className="badge badge-gold">{l.clicks} clics</span>
                    <button className="ghost btn-sm" onClick={() => copyLink(l.slug)} title="Copiar enlace"><Copy size={12} /></button>
                    <a
                      href={`/go/${l.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-ghost"
                      title="Abrir enlace"
                      style={{ padding: '6px 12px', fontSize: 12 }}
                    >
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : topTab === 'analytics' ? (
        <div className="container">
          <div className="card mb-6">
            <p className="muted">Tiempos de respuesta, volumen de mensajes y satisfacción del cliente.</p>
          </div>
          <div className="grid grid-3">
            <div className="card">
              <p style={{ fontSize: 13 }}>Contactos totales: {totalContactos}</p>
            </div>
            <div className="card">
              <p style={{ fontSize: 13 }}>Conversaciones abiertas: {conversacionesAbiertas}</p>
            </div>
            <div className="card">
              <p style={{ fontSize: 13 }}>Conversaciones resueltas: {conversacionesResueltas}</p>
            </div>
            <div className="card">
              <p style={{ fontSize: 13 }}>Tiempo medio de respuesta: —</p>
            </div>
            <div className="card">
              <p style={{ fontSize: 13 }}>CSAT: —</p>
            </div>
          </div>
          <div className="mt-6 muted" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Info size={12} />
            Métricas de tiempo de respuesta y CSAT pendientes de instrumentación.
          </div>
        </div>
      ) : topTab === 'settings' ? (
        <div className="container">
          <div className="card mb-6">
            <p className="muted">Configura el ANS (SLA): define la rapidez con la que tu equipo debe responder.</p>
          </div>
          {settingsLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 480 }}>
              <div>
                <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                  ANS a punto de expirar (minutos para primera respuesta)
                </label>
                <input
                  type="number"
                  placeholder="ej. 30"
                  value={settingsForm.slaFirstResponseMins}
                  onChange={(e) => setSettingsForm((p) => ({ ...p, slaFirstResponseMins: e.target.value }))}
                />
              </div>
              <div>
                <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                  ANS atrasado (minutos sin responder)
                </label>
                <input
                  type="number"
                  placeholder="ej. 120"
                  value={settingsForm.slaOverdueMins}
                  onChange={(e) => setSettingsForm((p) => ({ ...p, slaOverdueMins: e.target.value }))}
                />
              </div>
              <label className="row" style={{ gap: 8, cursor: 'pointer', fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={settingsForm.aiCountsAsResponse}
                  onChange={(e) => setSettingsForm((p) => ({ ...p, aiCountsAsResponse: e.target.checked }))}
                />
                Las respuestas de IA cuentan como respuesta para el ANS
              </label>
              <button className="primary" onClick={saveSettings} disabled={settingsSaving} style={{ alignSelf: 'flex-start' }}>
                {settingsSaving ? <Loader2 size={14} className="animate-spin" /> : 'Guardar configuración'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="container">
          <div className="card mb-6">
            <p className="muted">Las acciones manuales son tareas que requieren llamadas o SMS manuales a tus contactos.</p>
          </div>
          <div className="card mb-4" style={{ textAlign: 'center', color: 'var(--rai-muted)', fontSize: 13, padding: 32 }}>
            ¡Buen trabajo! No tienes tareas pendientes.
          </div>
          <div className="mt-6 muted" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Info size={12} />
            Sección en construcción.
          </div>
        </div>
      )}

      {/* ---------- Modal: nuevo contacto ---------- */}
      {showNewContact && (
        <div className="modal-backdrop" onClick={() => setShowNewContact(false)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="row-between mb-4">
              <h3>Nuevo contacto</h3>
              <button className="ghost btn-sm" onClick={() => setShowNewContact(false)}><X size={14} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input placeholder="Nombre *" value={newContact.name} onChange={(e) => setNewContact((p) => ({ ...p, name: e.target.value }))} />
              <input placeholder="Email" value={newContact.email} onChange={(e) => setNewContact((p) => ({ ...p, email: e.target.value }))} />

              <div className="row" style={{ gap: 6, position: 'relative' }}>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => setCountryDropdownOpen((o) => !o)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 96, justifyContent: 'space-between' }}
                >
                  <span className="row" style={{ gap: 6 }}>
                    <img src={flagUrl(COUNTRY_CODES[countryIdx].iso2)} width={20} height={14} alt={COUNTRY_CODES[countryIdx].name} style={{ borderRadius: 2, display: 'block' }} />
                    <span style={{ fontSize: 13 }}>{COUNTRY_CODES[countryIdx].dial}</span>
                  </span>
                  <ChevronDown size={12} />
                </button>
                <input
                  placeholder="Número (ej. 4242265547)"
                  value={phoneLocal}
                  onChange={(e) => setPhoneLocal(e.target.value.replace(/[^0-9]/g, ''))}
                  style={{ flex: 1 }}
                />

                {countryDropdownOpen && (
                  <>
                    <div
                      onClick={() => setCountryDropdownOpen(false)}
                      style={{ position: 'fixed', inset: 0, zIndex: 19 }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: '110%',
                        left: 0,
                        zIndex: 20,
                        background: 'var(--rai-dark)',
                        border: '1px solid var(--rai-border)',
                        borderRadius: 8,
                        maxHeight: 240,
                        overflowY: 'auto',
                        width: 240,
                        boxShadow: 'var(--shadow-lg)',
                      }}
                    >
                      {COUNTRY_CODES.map((c, i) => (
                        <div
                          key={`${c.iso2}-${c.dial}`}
                          onClick={() => {
                            setCountryIdx(i);
                            setCountryDropdownOpen(false);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '6px 10px',
                            cursor: 'pointer',
                            fontSize: 12,
                            background: i === countryIdx ? 'rgba(201,168,76,0.1)' : 'transparent',
                          }}
                        >
                          <img src={flagUrl(c.iso2)} width={18} height={13} alt={c.name} style={{ borderRadius: 2, display: 'block' }} />
                          <span style={{ flex: 1 }}>{c.name}</span>
                          <span className="muted">{c.dial}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <button className="primary" onClick={handleCreateContact} disabled={creatingContact}>
                {creatingContact ? <Loader2 size={14} className="animate-spin" /> : 'Crear contacto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
