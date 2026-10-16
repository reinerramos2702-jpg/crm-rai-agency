/**
 * Lógica pura de la vista de Pagos (sin React, DOM ni red): filtros, orden,
 * totales, CSV, tiempos relativos y actualizaciones optimistas de la caché.
 * La usan `src/app/pagos/**` y sus pruebas.
 */

export interface PaymentRow {
  id: string;
  reference: string;
  amountCents: number;
  currency: string;
  method: string;
  status: string;
  createdAt: string;
  paidAt: string | null;
  transactionRef: string | null;
  notes?: string | null;
  refundedAmountCents?: number;
  guest: { id: string; firstName: string; lastName: string | null } | null;
  booking: { id: string; reference: string } | null;
  site: { id: string; name: string } | null;
}

export interface PaymentsSummary {
  paidCents: number;
  pendingCents: number;
  refundedCents: number;
  statusCounts: Record<string, number>;
}

export interface PaymentsResponse {
  payments: PaymentRow[];
  summary: PaymentsSummary;
}

export type PaymentAction = 'approve' | 'reject' | 'cancel' | 'review' | 'refund';

export interface PaymentFilters {
  status: string;
  method: string;
  query: string;
  /** AAAA-MM-DD en hora local; vacío = sin límite. */
  from: string;
  to: string;
}

export const EMPTY_FILTERS: PaymentFilters = { status: '', method: '', query: '', from: '', to: '' };

export const PAYMENT_METHODS = [
  { id: 'cash', label: 'Efectivo' },
  { id: 'card', label: 'Tarjeta' },
  { id: 'transfer', label: 'Transferencia' },
  { id: 'paypal', label: 'PayPal' },
  { id: 'stripe', label: 'Stripe' },
  { id: 'mercadopago', label: 'Mercado Pago' },
  { id: 'crypto', label: 'Cripto' },
  { id: 'check', label: 'Cheque' },
  { id: 'other', label: 'Otro' },
] as const;

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
  under_review: 'En revisión',
  failed: 'Fallido',
  refunded: 'Reembolsado',
  cancelled: 'Cancelado',
};

/** Espejo de la máquina de estados de `/api/payments/[id]/transition`. */
const TRANSITIONS: Record<string, Partial<Record<PaymentAction, string>>> = {
  pending: { approve: 'paid', reject: 'failed', cancel: 'cancelled', review: 'under_review' },
  under_review: { approve: 'paid', reject: 'failed', cancel: 'cancelled' },
  paid: { refund: 'refunded' },
  failed: { review: 'under_review' },
};

const DAY = 86_400_000;
const MIN = 60_000;
const HOUR = 3_600_000;

export function methodLabel(id: string): string {
  const hit = PAYMENT_METHODS.find((m) => m.id === id);
  if (hit) return hit.label;
  return id ? id.charAt(0).toUpperCase() + id.slice(1) : '—';
}

export function statusLabel(id: string): string {
  return PAYMENT_STATUS_LABELS[id] ?? id;
}

/** Minúsculas y sin tildes, para comparar texto sin importar acentos. */
export function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export function guestName(p: Pick<PaymentRow, 'guest'>): string {
  return p.guest ? `${p.guest.firstName} ${p.guest.lastName ?? ''}`.trim() : '';
}

/** Fecha que se muestra y por la que se ordena: cobro si existe, si no creación. */
export function paymentDate(p: Pick<PaymentRow, 'paidAt' | 'createdAt'>): string {
  return p.paidAt ?? p.createdAt;
}

function timeOf(iso: string): number {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
}

function haystack(p: PaymentRow): string {
  return normalizeText(
    [
      p.reference, p.transactionRef ?? '', p.notes ?? '', guestName(p),
      p.booking?.reference ?? '', p.site?.name ?? '', methodLabel(p.method),
      (p.amountCents / 100).toFixed(2),
    ].join(' '),
  );
}

function parseLocalDay(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Convierte AAAA-MM-DD en [inicio del día, fin del día] locales; null si no hay límite. */
function dayBounds(from: string, to: string): { start: number | null; end: number | null } {
  let a = parseLocalDay(from);
  let b = parseLocalDay(to);
  if (a && b && a.getTime() > b.getTime()) [a, b] = [b, a];
  return {
    start: a ? a.getTime() : null,
    end: b ? new Date(b.getFullYear(), b.getMonth(), b.getDate(), 23, 59, 59, 999).getTime() : null,
  };
}

export function hasActiveFilters(f: PaymentFilters, ignoreStatus = false): boolean {
  return !!((ignoreStatus ? '' : f.status) || f.method || f.query.trim() || f.from || f.to);
}

export function filterPayments(rows: PaymentRow[], f: PaymentFilters): PaymentRow[] {
  const tokens = normalizeText(f.query).split(/\s+/).filter(Boolean);
  const { start, end } = dayBounds(f.from, f.to);
  return rows.filter((p) => {
    if (f.status && p.status !== f.status) return false;
    if (f.method && p.method !== f.method) return false;
    if (start !== null || end !== null) {
      const t = timeOf(paymentDate(p));
      if (start !== null && t < start) return false;
      if (end !== null && t > end) return false;
    }
    if (tokens.length > 0) {
      const text = haystack(p);
      if (!tokens.every((tk) => text.includes(tk))) return false;
    }
    return true;
  });
}

/** Más recientes primero; el desempate por id deja el orden determinista. */
export function sortPayments(rows: PaymentRow[]): PaymentRow[] {
  return [...rows].sort((a, b) => {
    const d = timeOf(paymentDate(b)) - timeOf(paymentDate(a));
    if (d !== 0) return d;
    const c = timeOf(b.createdAt) - timeOf(a.createdAt);
    if (c !== 0) return c;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/** Conteo por estado de las filas que cumplen el resto de filtros (ignora el de estado). */
export function statusCounts(rows: PaymentRow[], f: PaymentFilters): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const p of filterPayments(rows, { ...f, status: '' })) counts[p.status] = (counts[p.status] ?? 0) + 1;
  return counts;
}

export interface CurrencyTotals {
  currency: string;
  count: number;
  paidCents: number;
  pendingCents: number;
  refundedCents: number;
}

export function totalsByCurrency(rows: PaymentRow[]): CurrencyTotals[] {
  const map = new Map<string, CurrencyTotals>();
  for (const p of rows) {
    const t = map.get(p.currency) ?? { currency: p.currency, count: 0, paidCents: 0, pendingCents: 0, refundedCents: 0 };
    t.count += 1;
    const c = contribution(p);
    t.paidCents += c.paid;
    t.pendingCents += c.pending;
    t.refundedCents += c.refunded;
    map.set(p.currency, t);
  }
  return Array.from(map.values()).sort((a, b) => a.currency.localeCompare(b.currency));
}

// ---------------------------------------------------------------- fechas

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function toDayString(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export type DatePreset = 'today' | '7d' | '30d' | 'month';

export const DATE_PRESETS: Array<{ id: DatePreset; label: string }> = [
  { id: 'today', label: 'Hoy' },
  { id: '7d', label: '7 días' },
  { id: '30d', label: '30 días' },
  { id: 'month', label: 'Este mes' },
];

export function rangeForPreset(preset: DatePreset, now: number): { from: string; to: string } {
  const d = new Date(now);
  const today = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const to = toDayString(today);
  if (preset === 'today') return { from: to, to };
  if (preset === 'month') return { from: toDayString(new Date(d.getFullYear(), d.getMonth(), 1)), to };
  const back = preset === '7d' ? 6 : 29;
  return { from: toDayString(new Date(today.getFullYear(), today.getMonth(), today.getDate() - back)), to };
}

export function activePreset(f: Pick<PaymentFilters, 'from' | 'to'>, now: number): DatePreset | null {
  for (const { id } of DATE_PRESETS) {
    const r = rangeForPreset(id, now);
    if (r.from === f.from && r.to === f.to) return id;
  }
  return null;
}

function dayStart(t: number): number {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function shortDate(t: number): string {
  return new Date(t).toLocaleDateString('es-DO', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function fullDate(iso: string): string {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? '' : new Date(t).toLocaleString('es-DO', { dateStyle: 'long', timeStyle: 'short' });
}

/** «ahora», «hace 5 min», «hace 3 h», «ayer», «hace 4 d» o la fecha corta. */
export function relativeTime(iso: string, now: number = Date.now()): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  const diff = now - t;
  if (diff < -MIN) return shortDate(t);
  if (diff < MIN) return 'ahora';
  if (diff < HOUR) return `hace ${Math.floor(diff / MIN)} min`;
  const days = Math.round((dayStart(now) - dayStart(t)) / DAY);
  if (days === 0) return `hace ${Math.floor(diff / HOUR)} h`;
  if (days === 1) return 'ayer';
  if (days < 7) return `hace ${days} d`;
  return shortDate(t);
}

// ---------------------------------------------------------------- variación

export interface Delta {
  pct: number;
  direction: 'up' | 'down' | 'flat';
}

/**
 * Cobrado de los últimos `days` días frente a los `days` anteriores.
 * Devuelve null si el dato no existe: lista incompleta, monedas mezcladas o
 * periodo anterior sin cobros.
 */
export function paidDelta(rows: PaymentRow[], now: number, complete: boolean, days = 30): Delta | null {
  if (!complete) return null;
  const span = days * DAY;
  const currencies = new Set<string>();
  let cur = 0;
  let prev = 0;
  for (const p of rows) {
    if (p.status !== 'paid') continue;
    const age = now - timeOf(paymentDate(p));
    if (age < 0 || age >= span * 2) continue;
    currencies.add(p.currency);
    if (age < span) cur += p.amountCents;
    else prev += p.amountCents;
  }
  if (currencies.size !== 1 || prev <= 0) return null;
  const pct = Math.round(((cur - prev) / prev) * 100);
  return { pct, direction: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat' };
}

// ---------------------------------------------------------------- CSV

const CSV_HEADERS = ['Referencia', 'Huésped', 'Reserva', 'Método', 'Estado', 'Moneda', 'Monto', 'Fecha', 'Transacción'];

function csvCell(value: string): string {
  // Evita que Excel interprete el texto como fórmula.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function paymentsToCsv(rows: PaymentRow[]): string {
  const lines = rows.map((p) =>
    [
      p.reference, guestName(p), p.booking?.reference ?? '', methodLabel(p.method), statusLabel(p.status),
      p.currency, (p.amountCents / 100).toFixed(2), paymentDate(p), p.transactionRef ?? '',
    ].map(csvCell).join(','),
  );
  return [CSV_HEADERS.join(','), ...lines].join('\r\n');
}

// ---------------------------------------------------------------- optimismo

export function nextStatus(status: string, action: PaymentAction): string | null {
  return TRANSITIONS[status]?.[action] ?? null;
}

export function canApprove(status: string): boolean {
  return nextStatus(status, 'approve') !== null;
}

export type PaymentPatch = Partial<Pick<PaymentRow, 'status' | 'paidAt' | 'refundedAmountCents'>> & {
  approvedAt?: string;
  refundedAt?: string;
};

/** Cambios de campos que el servidor aplicará al ejecutar la acción. */
export function optimisticPatch(
  p: Pick<PaymentRow, 'status' | 'amountCents'>,
  action: PaymentAction,
  nowIso: string,
): PaymentPatch | null {
  const status = nextStatus(p.status, action);
  if (!status) return null;
  if (action === 'approve') return { status, paidAt: nowIso, approvedAt: nowIso };
  if (action === 'refund') return { status, refundedAt: nowIso, refundedAmountCents: p.amountCents };
  return { status };
}

function contribution(p: Pick<PaymentRow, 'status' | 'amountCents' | 'refundedAmountCents'>) {
  return {
    paid: p.status === 'paid' ? p.amountCents : 0,
    pending: p.status === 'pending' || p.status === 'under_review' ? p.amountCents : 0,
    refunded: p.status === 'refunded' ? p.refundedAmountCents ?? 0 : 0,
  };
}

function shiftSummary(s: PaymentsSummary, p: PaymentRow, sign: 1 | -1): PaymentsSummary {
  const c = contribution(p);
  const counts = { ...s.statusCounts };
  counts[p.status] = Math.max(0, (counts[p.status] ?? 0) + sign);
  return {
    paidCents: s.paidCents + sign * c.paid,
    pendingCents: s.pendingCents + sign * c.pending,
    refundedCents: s.refundedCents + sign * c.refunded,
    statusCounts: counts,
  };
}

export function applyCreated(data: PaymentsResponse, row: PaymentRow): PaymentsResponse {
  return { payments: [row, ...data.payments], summary: shiftSummary(data.summary, row, 1) };
}

export function applyUpdated(data: PaymentsResponse, id: string, patch: Partial<PaymentRow>): PaymentsResponse {
  const old = data.payments.find((p) => p.id === id);
  if (!old) return data;
  const next = { ...old, ...patch };
  return {
    payments: data.payments.map((p) => (p.id === id ? next : p)),
    summary: shiftSummary(shiftSummary(data.summary, old, -1), next, 1),
  };
}

export function applyDeleted(data: PaymentsResponse, id: string): PaymentsResponse {
  const old = data.payments.find((p) => p.id === id);
  if (!old) return data;
  return { payments: data.payments.filter((p) => p.id !== id), summary: shiftSummary(data.summary, old, -1) };
}

export function totalCount(s: PaymentsSummary): number {
  return Object.values(s.statusCounts).reduce((a, b) => a + b, 0);
}
