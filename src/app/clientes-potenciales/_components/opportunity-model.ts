import { toCsv } from '../../contactos/_shared/crm-csv';
import { isEmail, normalize, parseAmount } from '../../contactos/_shared/crm-text';
import { STAGES, stageById, type StageId } from './stages';

export type OpportunityStatus = 'open' | 'won' | 'lost' | 'abandoned';

export const STATUS_LABELS: Record<OpportunityStatus, string> = {
  open: 'Abierto',
  won: 'Ganado',
  lost: 'Perdido',
  abandoned: 'Abandonado',
};

export const STATUS_IDS = ['open', 'won', 'lost', 'abandoned'] as const satisfies readonly OpportunityStatus[];

export function isStatus(value: string): value is OpportunityStatus {
  return STATUS_IDS.some((s) => s === value);
}

export interface Opportunity {
  id: string;
  name: string;
  stageId: StageId;
  status: OpportunityStatus;
  value: number;
  contactId: string | null;
  contactName: string;
  email: string;
  phone: string;
  owner: string;
  business: string;
  source: string;
  /** AAAA-MM-DD o cadena vacía. */
  closeDate: string;
  tags: string[];
  createdAt: string;
}

export interface OpportunityForm {
  contactName: string;
  contactId: string | null;
  email: string;
  phone: string;
  name: string;
  stageId: StageId;
  status: OpportunityStatus;
  value: string;
  owner: string;
  business: string;
  source: string;
  closeDate: string;
  tags: string;
}

export type FormErrors = Partial<Record<'contactName' | 'name' | 'email' | 'value' | 'closeDate', string>>;

export function emptyForm(over: Partial<OpportunityForm> = {}): OpportunityForm {
  return {
    contactName: '', contactId: null, email: '', phone: '', name: '', stageId: 'nuevo', status: 'open',
    value: '', owner: '', business: '', source: '', closeDate: '', tags: '', ...over,
  };
}

export interface OpportunityTemplate {
  id: string;
  label: string;
  form: Partial<OpportunityForm>;
}

export const OPPORTUNITY_TEMPLATES: readonly OpportunityTemplate[] = [
  { id: 'web', label: 'Proyecto web', form: { name: 'Proyecto web — ', stageId: 'consulta', source: 'Referido', tags: 'web' } },
  { id: 'evento', label: 'Cotización de evento', form: { name: 'Cotización de evento — ', stageId: 'consulta', source: 'WhatsApp', tags: 'evento' } },
  { id: 'reserva', label: 'Reserva de hotel', form: { name: 'Reserva — ', stageId: 'contacto', source: 'Sitio web', tags: 'reserva' } },
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function validateForm(form: OpportunityForm): FormErrors {
  const errors: FormErrors = {};
  if (!form.contactName.trim()) errors.contactName = 'Indica el contacto principal.';
  if (!form.name.trim()) errors.name = 'Escribe el nombre del cliente potencial.';
  if (form.email.trim() && !isEmail(form.email)) errors.email = 'Revisa el correo: falta el @ o el dominio.';
  if (form.value.trim() && parseAmount(form.value) === null) errors.value = 'Escribe un importe válido, p. ej. 1.250,00.';
  if (form.closeDate && !DATE_RE.test(form.closeDate)) errors.closeDate = 'Fecha no válida.';
  return errors;
}

function splitTags(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const piece of raw.split(',')) {
    const tag = piece.trim().slice(0, 30);
    const key = normalize(tag);
    if (tag && !seen.has(key)) { seen.add(key); out.push(tag); }
  }
  return out;
}

export function buildOpportunity(form: OpportunityForm, id: string, now: Date): Opportunity {
  return {
    id,
    name: form.name.trim().slice(0, 120),
    stageId: form.stageId,
    status: form.status,
    value: parseAmount(form.value) ?? 0,
    contactId: form.contactId,
    contactName: form.contactName.trim().slice(0, 120),
    email: form.email.trim(),
    phone: form.phone.trim(),
    owner: form.owner.trim().slice(0, 80),
    business: form.business.trim().slice(0, 120),
    source: form.source.trim().slice(0, 80),
    closeDate: form.closeDate,
    tags: splitTags(form.tags),
    createdAt: now.toISOString(),
  };
}

export type OpportunityFilters = { q: string; status: OpportunityStatus | '' };
export type OpportunitySort = 'recent' | 'value' | 'close' | 'name';

export const SORT_LABELS: Record<OpportunitySort, string> = {
  recent: 'Más recientes',
  value: 'Mayor valor',
  close: 'Cierre más próximo',
  name: 'Nombre (A–Z)',
};

export function filterOpportunities(list: readonly Opportunity[], { q, status }: OpportunityFilters): Opportunity[] {
  const needle = normalize(q);
  return list.filter((o) => {
    if (status && o.status !== status) return false;
    if (!needle) return true;
    return normalize([o.name, o.contactName, o.business, o.owner, o.tags.join(' ')].join(' ')).includes(needle);
  });
}

export function sortOpportunities(list: readonly Opportunity[], key: OpportunitySort): Opportunity[] {
  const copy = [...list];
  switch (key) {
    case 'value': return copy.sort((a, b) => b.value - a.value);
    case 'name': return copy.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    case 'close':
      return copy.sort((a, b) => (a.closeDate || '9999-99-99').localeCompare(b.closeDate || '9999-99-99'));
    default: return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

export function groupByStage(list: readonly Opportunity[]): Record<StageId, Opportunity[]> {
  const groups: Record<StageId, Opportunity[]> = {
    nuevo: [], contacto: [], consulta: [], propuesta: [], negociacion: [], reserva: [],
  };
  for (const o of list) groups[o.stageId].push(o);
  return groups;
}

export interface Totals { count: number; value: number }

export function totals(list: readonly Opportunity[]): Totals {
  return { count: list.length, value: list.reduce((sum, o) => sum + o.value, 0) };
}

export interface ForecastPeriod {
  id: 'month' | 'next' | 'quarter';
  label: string;
  count: number;
  value: number;
  /** Valor ponderado por la probabilidad de la etapa. */
  weighted: number;
  /** Probabilidad media (%) de las oportunidades del periodo. */
  avgProbability: number;
}

function monthIndex(date: string): number | null {
  if (!DATE_RE.test(date)) return null;
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  return year * 12 + (month - 1);
}

/** Pronóstico de las oportunidades abiertas según su fecha de cierre estimada. */
export function forecast(list: readonly Opportunity[], now: Date): ForecastPeriod[] {
  const current = now.getFullYear() * 12 + now.getMonth();
  const quarterStart = current - (now.getMonth() % 3);
  const defs: { id: ForecastPeriod['id']; label: string; from: number; to: number }[] = [
    { id: 'month', label: 'Este mes', from: current, to: current },
    { id: 'next', label: 'Próximo mes', from: current + 1, to: current + 1 },
    { id: 'quarter', label: 'Trimestre', from: quarterStart, to: quarterStart + 2 },
  ];
  return defs.map(({ id, label, from, to }) => {
    const inRange = list.filter((o) => {
      const m = monthIndex(o.closeDate);
      return o.status === 'open' && m !== null && m >= from && m <= to;
    });
    const value = inRange.reduce((s, o) => s + o.value, 0);
    const weighted = inRange.reduce((s, o) => s + (o.value * stageById(o.stageId).probability) / 100, 0);
    const probs = inRange.reduce((s, o) => s + stageById(o.stageId).probability, 0);
    return { id, label, count: inRange.length, value, weighted, avgProbability: inRange.length ? Math.round(probs / inRange.length) : 0 };
  });
}

export function opportunitiesToCsv(list: readonly Opportunity[]): string {
  const header = ['Nombre', 'Etapa', 'Estado', 'Contacto', 'Correo', 'Teléfono', 'Valor', 'Propietario', 'Negocio', 'Fuente', 'Cierre estimado', 'Etiquetas'];
  const rows = list.map((o) => [
    o.name, stageById(o.stageId).label, STATUS_LABELS[o.status], o.contactName, o.email, o.phone,
    String(o.value), o.owner, o.business, o.source, o.closeDate, o.tags.join('; '),
  ]);
  return toCsv([header, ...rows]);
}

export const STAGE_OPTIONS = STAGES.map((s) => ({ id: s.id, label: s.label }));
