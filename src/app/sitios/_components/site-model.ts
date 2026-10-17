/** Modelo, filtros y validación puros de Sitios (sin React: se prueban con vitest). */

export interface Site {
  id: string;
  name: string;
  slug: string;
  type: string;
  city: string | null;
  country: string | null;
  address: string | null;
  postalCode?: string | null;
  capacity: number;
  status: string;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail?: string | null;
  _count: { rooms: number; bookings: number; payments: number };
}

export interface Room {
  id: string;
  number: string;
  floor: string | null;
  status: string;
  notes: string | null;
  roomType: { id: string; name: string } | null;
}

export interface SiteDetail extends Omit<Site, '_count'> {
  notes: string | null;
  rooms: Room[];
  _count: { bookings: number; payments: number };
}

export interface SiteMetrics {
  activeBookings: number;
  monthRevenueCents: number;
}

export const TYPE_LABELS: Record<string, string> = {
  hotel: 'Hotel',
  restaurant: 'Restaurante',
  office: 'Oficina',
  venue: 'Local',
  other: 'Otro',
};

export const TYPE_KEYS = Object.keys(TYPE_LABELS);
export const STATUS_KEYS = ['active', 'maintenance', 'closed'] as const;

export function typeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type;
}

/* ---------- Filtros ---------- */

export interface SiteFilters {
  q: string;
  type: string;
  status: string;
}

export const EMPTY_FILTERS: SiteFilters = { q: '', type: '', status: '' };

export function hasActiveFilters(f: SiteFilters): boolean {
  return f.q.trim() !== '' || f.type !== '' || f.status !== '';
}

/** Minúsculas y sin tildes, para buscar «Peñón» escribiendo «penon». */
export function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function matchesQuery(site: Site, needle: string): boolean {
  if (!needle) return true;
  const haystack = [site.name, site.city, site.address, site.country, site.contactName]
    .filter((v): v is string => typeof v === 'string' && v !== '')
    .map(normalizeText);
  return haystack.some((h) => h.includes(needle));
}

/** Aplica búsqueda, tipo y estado. `skip` ignora un criterio (para los contadores de cada chip). */
export function filterSites(sites: Site[], f: SiteFilters, skip?: 'type' | 'status'): Site[] {
  const needle = normalizeText(f.q);
  return sites.filter(
    (s) =>
      matchesQuery(s, needle) &&
      (skip === 'type' || !f.type || s.type === f.type) &&
      (skip === 'status' || !f.status || s.status === f.status),
  );
}

export function countBy(sites: Site[], key: 'type' | 'status'): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of sites) out[s[key]] = (out[s[key]] ?? 0) + 1;
  return out;
}

export interface SitesSummary {
  total: number;
  active: number;
  maintenance: number;
  closed: number;
  rooms: number;
  bookings: number;
}

export function summarize(sites: Site[]): SitesSummary {
  const out: SitesSummary = { total: sites.length, active: 0, maintenance: 0, closed: 0, rooms: 0, bookings: 0 };
  for (const s of sites) {
    if (s.status === 'active') out.active += 1;
    else if (s.status === 'maintenance') out.maintenance += 1;
    else if (s.status === 'closed') out.closed += 1;
    out.rooms += s._count.rooms;
    out.bookings += s._count.bookings;
  }
  return out;
}

export function formatLocation(site: Pick<Site, 'address' | 'city' | 'country'>): string {
  return [site.address, site.city, site.country].filter((v): v is string => !!v && v.trim() !== '').join(', ');
}

/** Número de teléfono apto para `tel:` (conserva solo + y dígitos). */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

export function pluralize(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

/* ---------- Formulario ---------- */

export interface SiteFormValues {
  name: string;
  type: string;
  status: string;
  capacity: string;
  address: string;
  city: string;
  country: string;
  postalCode: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  notes: string;
}

export type SiteFormErrors = Partial<Record<keyof SiteFormValues, string>>;

export function emptySiteForm(): SiteFormValues {
  return {
    name: '', type: 'hotel', status: 'active', capacity: '0',
    address: '', city: '', country: '', postalCode: '',
    contactName: '', contactPhone: '', contactEmail: '', notes: '',
  };
}

export function formFromSite(site: SiteDetail): SiteFormValues {
  return {
    name: site.name,
    type: site.type,
    status: site.status,
    capacity: String(site.capacity),
    address: site.address ?? '',
    city: site.city ?? '',
    country: site.country ?? '',
    postalCode: site.postalCode ?? '',
    contactName: site.contactName ?? '',
    contactPhone: site.contactPhone ?? '',
    contactEmail: site.contactEmail ?? '',
    notes: site.notes ?? '',
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateSiteForm(v: SiteFormValues): SiteFormErrors {
  const e: SiteFormErrors = {};
  const name = v.name.trim();
  if (!name) e.name = 'El nombre es obligatorio.';
  else if (name.length < 2) e.name = 'Escribe al menos 2 caracteres.';
  else if (name.length > 120) e.name = 'Máximo 120 caracteres.';

  const cap = v.capacity.trim();
  if (cap !== '') {
    const n = Number(cap);
    if (!Number.isInteger(n) || n < 0) e.capacity = 'Usa un número entero igual o mayor que 0.';
    else if (n > 100000) e.capacity = 'El aforo máximo es 100 000.';
  }

  const phone = v.contactPhone.trim();
  if (phone) {
    const digits = phone.replace(/\D/g, '').length;
    if (!/^[+\d\s().-]+$/.test(phone) || digits < 6 || digits > 15) {
      e.contactPhone = 'Teléfono no válido. Ejemplo: +58 412 000 0000.';
    }
  }

  const email = v.contactEmail.trim();
  if (email && !EMAIL_RE.test(email)) e.contactEmail = 'Correo no válido. Ejemplo: sede@empresa.com.';

  if (v.notes.length > 1000) e.notes = 'Máximo 1000 caracteres.';
  return e;
}

/** Cuerpo para POST/PATCH: textos recortados y aforo numérico (contrato original). */
export function toPayload(v: SiteFormValues): Record<string, unknown> {
  return {
    name: v.name.trim(),
    type: v.type,
    status: v.status,
    capacity: Number(v.capacity) || 0,
    address: v.address.trim(),
    city: v.city.trim(),
    country: v.country.trim(),
    postalCode: v.postalCode.trim(),
    contactName: v.contactName.trim(),
    contactPhone: v.contactPhone.trim(),
    contactEmail: v.contactEmail.trim(),
    notes: v.notes.trim(),
  };
}

/* ---------- Habitaciones ---------- */

export interface RoomFormValues {
  number: string;
  floor: string;
  roomTypeId: string;
  status: string;
  notes: string;
}

export function validateRoomForm(v: RoomFormValues, existing: Room[]): Partial<Record<keyof RoomFormValues, string>> {
  const e: Partial<Record<keyof RoomFormValues, string>> = {};
  const number = v.number.trim();
  if (!number) e.number = 'El número es obligatorio.';
  else if (number.length > 30) e.number = 'Máximo 30 caracteres.';
  else if (existing.some((r) => r.number.trim().toLowerCase() === number.toLowerCase())) {
    e.number = 'Ya existe una habitación con ese número en este sitio.';
  }
  if (v.floor.trim().length > 20) e.floor = 'Máximo 20 caracteres.';
  return e;
}

export function countRoomsByStatus(rooms: Room[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rooms) out[r.status] = (out[r.status] ?? 0) + 1;
  return out;
}

export type Tone = 'ok' | 'warn' | 'danger' | 'gold' | 'purple' | 'muted';

/** Color del punto de estado (mismo criterio que las insignias de hotel). */
export function statusTone(status: string): Tone {
  switch (status) {
    case 'active':
    case 'available':
      return 'ok';
    case 'maintenance':
    case 'out_of_order':
      return 'warn';
    case 'closed':
      return 'danger';
    case 'occupied':
      return 'gold';
    case 'cleaning':
      return 'purple';
    default:
      return 'muted';
  }
}
