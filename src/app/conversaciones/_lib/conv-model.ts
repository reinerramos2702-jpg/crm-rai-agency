import type { Contact, Conversation, Message } from './conv-types';

/** Utilidades puras del módulo (sin React ni red): fáciles de probar. */

const MINUTE = 60_000;

function time(iso: string | null): number {
  if (!iso) return Number.NaN;
  return Date.parse(iso);
}

/** Antigüedad corta: «ahora», «5m», «3h», «2d». */
export function timeAgo(iso: string | null, now: number = Date.now()): string {
  const at = time(iso);
  if (Number.isNaN(at)) return '';
  const mins = Math.floor((now - at) / MINUTE);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function formatClock(iso: string): string {
  const at = time(iso);
  if (Number.isNaN(at)) return '';
  return new Date(at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTime(iso: string): string {
  const at = time(iso);
  if (Number.isNaN(at)) return '';
  return new Date(at).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
}

function dayKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

/** «Hoy», «Ayer» o fecha larga. */
export function dayLabel(date: Date, now: Date = new Date()): string {
  const key = dayKey(date);
  if (key === dayKey(now)) return 'Hoy';
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (key === dayKey(yesterday)) return 'Ayer';
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

export interface DayGroup {
  key: string;
  label: string;
  items: Message[];
}

/** Agrupa mensajes (ya ordenados) por día local, para los separadores del hilo. */
export function groupByDay(messages: Message[], now: Date = new Date()): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const message of messages) {
    const at = time(message.createdAt);
    const key = Number.isNaN(at) ? 'sin-fecha' : dayKey(new Date(at));
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.items.push(message);
    } else {
      groups.push({ key, label: Number.isNaN(at) ? 'Sin fecha' : dayLabel(new Date(at), now), items: [message] });
    }
  }
  return groups;
}

/**
 * Conversación que se muestra de un contacto: la que tiene mensajes más recientes;
 * si ninguna tiene mensajes, la creada más tarde. (El detalle del API las ordena por
 * antigüedad ascendente; usar la primera mostraba la más vieja.)
 */
export function primaryConversation(conversations: Conversation[]): Conversation | null {
  let best: Conversation | null = null;
  for (const conv of conversations) {
    if (!best) {
      best = conv;
      continue;
    }
    const a = time(conv.lastMessageAt);
    const b = time(best.lastMessageAt);
    if (!Number.isNaN(a) || !Number.isNaN(b)) {
      if (Number.isNaN(b) || (!Number.isNaN(a) && a >= b)) best = conv;
      continue;
    }
    const ca = time(conv.createdAt);
    const cb = time(best.createdAt);
    if (Number.isNaN(cb) || (!Number.isNaN(ca) && ca >= cb)) best = conv;
  }
  return best;
}

function fold(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Búsqueda sin tildes por nombre, correo o teléfono; opcionalmente solo no leídas. */
export function filterContacts(contacts: Contact[], query: string, unreadOnly: boolean): Contact[] {
  const q = fold(query.trim());
  const digits = q.replace(/\D/g, '');
  return contacts.filter((contact) => {
    if (unreadOnly && unreadOf(contact) === 0) return false;
    if (!q) return true;
    if (fold(contact.name).includes(q)) return true;
    if (contact.email && fold(contact.email).includes(q)) return true;
    return digits.length >= 3 && !!contact.phone && contact.phone.replace(/\D/g, '').includes(digits);
  });
}

export function unreadOf(contact: Contact): number {
  return primaryConversation(contact.conversations)?.unreadCount ?? 0;
}

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.slice(0, 2).map((w) => Array.from(w)[0] ?? '');
  const out = letters.join('').toUpperCase();
  return out || '?';
}

export const AVATAR_TONES = 5;

/** Índice estable (0–4) para el color del avatar, derivado del nombre. */
export function toneIndex(name: string): number {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + (ch.codePointAt(0) ?? 0)) % 9973;
  return hash % AVATAR_TONES;
}

export type StatusTone = 'ok' | 'warn' | 'muted';

export function statusMeta(status: string): { label: string; tone: StatusTone } {
  if (status === 'pending') return { label: 'Pendiente', tone: 'warn' };
  if (status === 'closed') return { label: 'Resuelta', tone: 'muted' };
  return { label: 'Abierta', tone: 'ok' };
}

/** Última línea visible en la lista: texto compacto y si lo envió el equipo. */
export function previewOf(contact: Contact): { text: string; outbound: boolean } {
  const last = primaryConversation(contact.conversations)?.messages[0];
  if (!last) return { text: 'Sin mensajes todavía', outbound: false };
  return { text: last.body.replace(/\s+/g, ' ').trim() || 'Mensaje vacío', outbound: last.direction === 'out' };
}

export interface InboxSummary {
  total: number;
  open: number;
  pending: number;
  closed: number;
  unread: number;
}

export function summarize(contacts: Contact[]): InboxSummary {
  const out: InboxSummary = { total: contacts.length, open: 0, pending: 0, closed: 0, unread: 0 };
  for (const contact of contacts) {
    const conv = primaryConversation(contact.conversations);
    if (!conv) continue;
    if (conv.status === 'closed') out.closed += 1;
    else if (conv.status === 'pending') out.pending += 1;
    else out.open += 1;
    out.unread += conv.unreadCount;
  }
  return out;
}

export function senderLabel(message: Message): string {
  if (message.sender === 'ai') return 'IA';
  if (message.sender === 'contact') return 'Cliente';
  return 'Tú';
}

/** Une el texto nuevo al borrador existente con un espacio. */
export function appendToDraft(draft: string, addition: string): string {
  return draft.trim() ? `${draft.trimEnd()} ${addition}` : addition;
}
