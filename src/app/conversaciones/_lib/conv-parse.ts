import type {
  ActivationLink,
  Contact,
  ContactDetail,
  ContactTask,
  Conversation,
  Message,
  MessageSender,
  Note,
  SettingsState,
  Snippet,
} from './conv-types';

/**
 * Validación de las respuestas del API. Nada se asume: lo que no cumple el
 * contrato se descarta (elementos sueltos) o invalida la respuesta completa (null).
 */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const text = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value : fallback);
const textOrNull = (value: unknown): string | null => (typeof value === 'string' ? value : null);
const count = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
const sender = (value: unknown): MessageSender => (value === 'contact' || value === 'ai' ? value : 'agent');

function list<T>(value: unknown, item: (entry: unknown) => T | null): T[] {
  if (!Array.isArray(value)) return [];
  const entries: unknown[] = value;
  const out: T[] = [];
  for (const entry of entries) {
    const parsed = item(entry);
    if (parsed) out.push(parsed);
  }
  return out;
}

export function parseMessage(value: unknown): Message | null {
  if (!isRecord(value)) return null;
  const id = text(value.id);
  if (!id) return null;
  return {
    id,
    body: text(value.body),
    direction: value.direction === 'in' ? 'in' : 'out',
    sender: sender(value.sender),
    createdAt: text(value.createdAt),
  };
}

function parseConversation(value: unknown): Conversation | null {
  if (!isRecord(value)) return null;
  const id = text(value.id);
  if (!id) return null;
  return {
    id,
    channel: text(value.channel, 'manual'),
    status: text(value.status, 'open'),
    unreadCount: count(value.unreadCount),
    lastMessageAt: textOrNull(value.lastMessageAt),
    createdAt: textOrNull(value.createdAt),
    messages: list(value.messages, parseMessage),
  };
}

function parseContact(value: unknown): Contact | null {
  if (!isRecord(value)) return null;
  const id = text(value.id);
  if (!id) return null;
  return {
    id,
    name: text(value.name, 'Sin nombre').trim() || 'Sin nombre',
    email: textOrNull(value.email),
    phone: textOrNull(value.phone),
    source: textOrNull(value.source),
    tags: list(value.tags, (tag) => (typeof tag === 'string' ? tag : null)),
    conversations: list(value.conversations, parseConversation),
  };
}

export function parseNote(value: unknown): Note | null {
  if (!isRecord(value)) return null;
  const id = text(value.id);
  if (!id) return null;
  return { id, body: text(value.body), createdAt: text(value.createdAt) };
}

export function parseTask(value: unknown): ContactTask | null {
  if (!isRecord(value)) return null;
  const id = text(value.id);
  if (!id) return null;
  return {
    id,
    title: text(value.title),
    done: value.done === true,
    dueAt: textOrNull(value.dueAt),
    createdAt: text(value.createdAt),
  };
}

function parseSnippet(value: unknown): Snippet | null {
  if (!isRecord(value)) return null;
  const id = text(value.id);
  if (!id) return null;
  return { id, title: text(value.title), body: text(value.body), createdAt: text(value.createdAt) };
}

function parseLink(value: unknown): ActivationLink | null {
  if (!isRecord(value)) return null;
  const id = text(value.id);
  if (!id) return null;
  return {
    id,
    label: text(value.label),
    slug: text(value.slug),
    destination: text(value.destination),
    clicks: count(value.clicks),
    createdAt: text(value.createdAt),
  };
}

/** GET /api/contacts → { contacts } */
export function parseContactsPayload(raw: unknown): Contact[] | null {
  if (!isRecord(raw) || !Array.isArray(raw.contacts)) return null;
  return list(raw.contacts, parseContact);
}

/** GET /api/contacts/[id] → { contact } con conversaciones, notas y tareas. */
export function parseContactDetail(raw: unknown): ContactDetail | null {
  if (!isRecord(raw) || !isRecord(raw.contact)) return null;
  const base = parseContact(raw.contact);
  if (!base) return null;
  return {
    ...base,
    notes: list(raw.contact.notes, parseNote),
    contactTasks: list(raw.contact.contactTasks, parseTask),
  };
}

export function parseSnippets(raw: unknown): Snippet[] | null {
  return isRecord(raw) && Array.isArray(raw.snippets) ? list(raw.snippets, parseSnippet) : null;
}

export function parseLinks(raw: unknown): ActivationLink[] | null {
  return isRecord(raw) && Array.isArray(raw.links) ? list(raw.links, parseLink) : null;
}

const minutes = (value: unknown): string => (typeof value === 'number' && Number.isFinite(value) ? String(value) : '');

/** GET /api/settings → { settings } (puede ser null si aún no se configuró). */
export function parseSettings(raw: unknown): SettingsState | null {
  if (!isRecord(raw)) return null;
  const s = isRecord(raw.settings) ? raw.settings : {};
  return {
    slaFirstResponseMins: minutes(s.slaFirstResponseMins),
    slaOverdueMins: minutes(s.slaOverdueMins),
    aiCountsAsResponse: s.aiCountsAsResponse === true,
  };
}

/** Respuestas de escritura: { message } | { note } | { task } | { snippet } | { link } | { contact }. */
export const parseMessageResult = (raw: unknown): Message | null => (isRecord(raw) ? parseMessage(raw.message) : null);
export const parseNoteResult = (raw: unknown): Note | null => (isRecord(raw) ? parseNote(raw.note) : null);
export const parseTaskResult = (raw: unknown): ContactTask | null => (isRecord(raw) ? parseTask(raw.task) : null);
export const parseSnippetResult = (raw: unknown): Snippet | null => (isRecord(raw) ? parseSnippet(raw.snippet) : null);
export const parseLinkResult = (raw: unknown): ActivationLink | null => (isRecord(raw) ? parseLink(raw.link) : null);

export function parseCreatedContactId(raw: unknown): string | null {
  if (!isRecord(raw) || !isRecord(raw.contact)) return null;
  return text(raw.contact.id) || null;
}
