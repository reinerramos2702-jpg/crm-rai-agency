import { toCsv } from '../_shared/crm-csv';
import { normalize } from '../_shared/crm-text';
import { toDate } from '../_shared/crm-time';

export interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  /** Último mensaje de sus conversaciones; si no hay, la última modificación. */
  lastActivityAt: string;
}

export type SortKey = 'recent' | 'name' | 'created' | 'activity';

export interface ContactFilters {
  q: string;
  source: string;
  tag: string;
}

export const EMPTY_FILTERS: ContactFilters = { q: '', source: '', tag: '' };

export const SORT_LABELS: Record<SortKey, string> = {
  recent: 'Modificados recientemente',
  name: 'Nombre (A–Z)',
  created: 'Más nuevos primero',
  activity: 'Última actividad',
};

export const SOURCE_LABELS: Record<string, string> = {
  manual: 'Manual',
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  email: 'Correo',
  web: 'Sitio web',
  import: 'Importado',
};

export function sourceLabel(source: string | null): string {
  if (!source) return 'Sin fuente';
  return SOURCE_LABELS[source] ?? source;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

/** Fecha más reciente de las conversaciones del contacto (`lastMessageAt` o su último mensaje). */
function conversationActivity(raw: unknown): string | null {
  if (!Array.isArray(raw)) return null;
  let best: string | null = null;
  for (const conv of raw) {
    if (!isRecord(conv)) continue;
    const msgs = Array.isArray(conv.messages) ? conv.messages : [];
    const first = msgs[0];
    const candidate = str(conv.lastMessageAt) ?? (isRecord(first) ? str(first.createdAt) : null);
    if (candidate && (!best || (toDate(candidate)?.getTime() ?? 0) > (toDate(best)?.getTime() ?? 0))) best = candidate;
  }
  return best;
}

/** Valida la respuesta de `GET /api/contacts` (ignora entradas con forma inesperada). */
export function parseContacts(payload: unknown): Contact[] {
  if (!isRecord(payload) || !Array.isArray(payload.contacts)) return [];
  const out: Contact[] = [];
  for (const item of payload.contacts) {
    if (!isRecord(item)) continue;
    const id = str(item.id);
    const name = str(item.name);
    if (!id || !name) continue;
    const updatedAt = str(item.updatedAt) ?? str(item.createdAt) ?? '';
    out.push({
      id,
      name,
      email: str(item.email),
      phone: str(item.phone),
      source: str(item.source),
      tags: Array.isArray(item.tags) ? item.tags.filter((t): t is string => typeof t === 'string' && t !== '') : [],
      createdAt: str(item.createdAt) ?? updatedAt,
      updatedAt,
      lastActivityAt: conversationActivity(item.conversations) ?? updatedAt,
    });
  }
  return out;
}

export function collectTags(contacts: readonly Contact[]): string[] {
  return Array.from(new Set(contacts.flatMap((c) => c.tags))).sort((a, b) => a.localeCompare(b, 'es'));
}

export function collectSources(contacts: readonly Contact[]): string[] {
  const set = new Set<string>();
  for (const c of contacts) if (c.source) set.add(c.source);
  return Array.from(set).sort((a, b) => sourceLabel(a).localeCompare(sourceLabel(b), 'es'));
}

export function filterContacts(contacts: readonly Contact[], filters: ContactFilters): Contact[] {
  const q = normalize(filters.q);
  return contacts.filter((c) => {
    if (filters.source && c.source !== filters.source) return false;
    if (filters.tag && !c.tags.includes(filters.tag)) return false;
    if (!q) return true;
    const haystack = normalize([c.name, c.email ?? '', c.phone ?? '', c.tags.join(' ')].join(' '));
    return haystack.includes(q);
  });
}

function time(value: string): number {
  return toDate(value)?.getTime() ?? 0;
}

export function sortContacts(contacts: readonly Contact[], key: SortKey): Contact[] {
  const list = [...contacts];
  switch (key) {
    case 'name': return list.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    case 'created': return list.sort((a, b) => time(b.createdAt) - time(a.createdAt));
    case 'activity': return list.sort((a, b) => time(b.lastActivityAt) - time(a.lastActivityAt));
    default: return list.sort((a, b) => time(b.updatedAt) - time(a.updatedAt));
  }
}

export function activeFilterCount(filters: ContactFilters): number {
  return (filters.source ? 1 : 0) + (filters.tag ? 1 : 0);
}

/** Añade una etiqueta sin duplicarla (comparación sin tildes ni mayúsculas). Devuelve la lista nueva. */
export function withTag(tags: readonly string[], raw: string): string[] {
  const tag = raw.trim().slice(0, 40);
  if (!tag || tags.some((t) => normalize(t) === normalize(tag))) return [...tags];
  return [...tags, tag];
}

export function contactsToCsv(contacts: readonly Contact[]): string {
  const header = ['Nombre', 'Teléfono', 'Correo', 'Fuente', 'Etiquetas', 'Creado', 'Última actividad'];
  const rows = contacts.map((c) => [
    c.name, c.phone ?? '', c.email ?? '', sourceLabel(c.source), c.tags.join('; '), c.createdAt, c.lastActivityAt,
  ]);
  return toCsv([header, ...rows]);
}
