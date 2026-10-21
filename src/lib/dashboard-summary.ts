// Tipos y utilidades PURAS del resumen del Dashboard (sin Prisma ni React).
// Las comparten /api/dashboard/summary (servidor) y src/app/page.tsx (cliente).

import { tzOffsetMs, zonedToUtc } from './scheduled-posts';
import { isValidTimezone } from './content-planner-config';

export const DASH_PERIODS = [7, 30] as const;
export type DashPeriod = (typeof DASH_PERIODS)[number];
export const DEFAULT_PERIOD: DashPeriod = 7;
export const DEFAULT_DASH_TZ = 'America/Caracas';

export function parsePeriod(v: unknown): DashPeriod {
  const n = Number(v);
  return (DASH_PERIODS as readonly number[]).includes(n) ? (n as DashPeriod) : DEFAULT_PERIOD;
}

/* ---------------- Tipos del resumen ---------------- */

export interface TodayAppointment { id: string; title: string; startTime: string; contactName: string | null }
export interface TodayTask { id: string; title: string; dueAt: string | null; overdue: boolean; contactName: string }
export interface TodayConversation { id: string; contactName: string; channel: string; unread: number; lastMessageAt: string | null }
export interface TodayPayment { id: string; reference: string; amountCents: number; currency: string }
export interface TodayPost { id: string; dayNumber: number | null; scheduledAt: string; status: string }

/** Lista acotada: `count` es el total conocido; `more` indica que se alcanzó el tope de lectura. */
export interface TodayList<T> { count: number; more: boolean; items: T[] }

export interface DashboardToday {
  tz: string;
  appointments: TodayList<TodayAppointment> | null;
  tasks: (TodayList<TodayTask> & { overdue: number }) | null;
  unanswered: TodayList<TodayConversation> | null;
  payments: TodayList<TodayPayment> | null;
  posts: TodayList<TodayPost> | null;
}

export type KpiId = 'contacts' | 'conversations' | 'appointments' | 'campaigns' | 'payments' | 'posts';
export interface DashboardKpi { id: KpiId; current: number; previous: number }

export interface DashboardInstagram {
  available: boolean;
  mode: 'simulated' | 'live';
  scheduled: number;
  published: number;
  failed: number;
  next: { dayNumber: number | null; scheduledAt: string; timezone: string } | null;
}

export interface DashboardAutomation { active: number; total: number; runs: number }

export interface DashboardActivityItem { id: string; action: string; entityType: string; createdAt: string }

export interface DashboardSummary {
  days: DashPeriod;
  generatedAt: string;
  me: { displayName: string | null; workspaceName: string | null; role: string };
  today: DashboardToday;
  kpis: DashboardKpi[];
  instagram: DashboardInstagram | null;
  automation: DashboardAutomation | null;
  activity: DashboardActivityItem[] | null;
}

/* ---------------- Fechas y zonas horarias ---------------- */

/** Zona válida o la de Caracas (zona operativa por defecto del CRM). */
export function safeTimezone(tz: unknown): string {
  return typeof tz === 'string' && tz && isValidTimezone(tz) ? tz : DEFAULT_DASH_TZ;
}

/** Inicio (incluido) y fin (excluido) del día local de `now` en `tz`, como instantes UTC. */
export function dayBounds(now: Date, tz: string): { start: Date; end: Date } {
  const zone = safeTimezone(tz);
  const local = new Date(now.getTime() + tzOffsetMs(now.getTime(), zone));
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  const d = local.getUTCDate();
  const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
  const start = zonedToUtc(iso(Date.UTC(y, m, d)), '00:00', zone);
  const end = zonedToUtc(iso(Date.UTC(y, m, d + 1)), '00:00', zone);
  return { start, end };
}

/** Ventanas de comparación: actual = [now-days, now); previa = [now-2·days, now-days). */
export function periodWindows(now: Date, days: number) {
  const ms = days * 86_400_000;
  const t = now.getTime();
  return {
    current: { from: new Date(t - ms), to: now },
    previous: { from: new Date(t - 2 * ms), to: new Date(t - ms) },
  };
}

/* ---------------- Variación entre periodos ---------------- */

export type DeltaDir = 'up' | 'down' | 'flat' | 'new' | 'none';
export interface DeltaInfo { dir: DeltaDir; label: string }

/** Variación porcentual redondeada; null si el periodo previo es 0 (no se puede comparar). */
export function pctDelta(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export function deltaInfo(current: number, previous: number): DeltaInfo {
  if (current === 0 && previous === 0) return { dir: 'none', label: 'Sin datos' };
  if (previous === 0) return { dir: 'new', label: 'Nuevo' };
  const pct = pctDelta(current, previous) as number;
  if (pct === 0) return { dir: 'flat', label: '0 %' };
  return pct > 0 ? { dir: 'up', label: `+${pct} %` } : { dir: 'down', label: `${pct} %`.replace('-', '−') };
}

/* ---------------- Saludo y textos ---------------- */

export function greetingFor(hour: number): string {
  if (hour < 6) return 'Buenas noches';
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export function firstName(displayName: string | null | undefined): string {
  return displayName?.trim().split(/\s+/)[0] ?? '';
}

export function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

/** «+99» cuando el conteo llegó al tope de lectura. */
export function countLabel(count: number, more: boolean): string {
  return more ? `${count}+` : String(count);
}

/** Frase corta con lo que requiere atención hoy; null mientras no hay datos. */
export function todayHeadline(today: DashboardToday | null | undefined): string | null {
  if (!today) return null;
  const parts: string[] = [];
  const a = today.appointments?.count ?? 0;
  const t = today.tasks?.count ?? 0;
  const u = today.unanswered?.count ?? 0;
  const p = today.payments?.count ?? 0;
  if (a > 0) parts.push(`${a} ${plural(a, 'cita', 'citas')}`);
  if (t > 0) parts.push(`${t} ${plural(t, 'tarea', 'tareas')}`);
  if (u > 0) parts.push(`${u} ${plural(u, 'conversación sin responder', 'conversaciones sin responder')}`);
  if (p > 0) parts.push(`${p} ${plural(p, 'pago por revisar', 'pagos por revisar')}`);
  if (parts.length === 0) return 'Todo al día: nada urgente para hoy.';
  const last = parts.pop() as string;
  return `Hoy tienes ${parts.length ? `${parts.join(', ')} y ${last}` : last}.`;
}

/** Hora local («09:30») de un instante ISO en `tz`. */
export function formatClock(iso: string, tz: string): string {
  try {
    return new Intl.DateTimeFormat('es', { timeZone: safeTimezone(tz), hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
  } catch {
    return iso.slice(11, 16);
  }
}

/** «hace 5 min», «hace 3 h», «ayer», «hace 4 d». */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const diff = now.getTime() - new Date(iso).getTime();
  if (!Number.isFinite(diff)) return '';
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'ayer' : `hace ${d} d`;
}

export function formatMoney(amountCents: number, currency: string): string {
  try {
    return new Intl.NumberFormat('es', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amountCents / 100);
  } catch {
    return `${(amountCents / 100).toFixed(2)} ${currency}`;
  }
}

export const CHANNEL_LABELS: Record<string, string> = {
  manual: 'Manual',
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  email: 'Correo',
  sms: 'SMS',
};

/* ---------------- Actividad reciente (AuditEvent) ---------------- */

export type ActivityTone = 'ok' | 'warn' | 'danger' | 'info';
export interface ActivityDescription { label: string; tone: ActivityTone; href: string | null }

const ACTIVITY_LABELS: Record<string, { label: string; tone: ActivityTone }> = {
  'content.publish.instagram.success': { label: 'Publicación enviada a Instagram', tone: 'ok' },
  'content.publish.instagram.failed': { label: 'Falló una publicación de Instagram', tone: 'danger' },
  'content.schedule.batch': { label: 'Lote de publicaciones programado', tone: 'info' },
  'content.schedule.publish_now': { label: 'Publicación inmediata en Instagram', tone: 'info' },
  'workspace.meta.connected': { label: 'Cuenta de Meta conectada', tone: 'ok' },
  'workspace.meta.disconnected': { label: 'Cuenta de Meta desconectada', tone: 'warn' },
  'workspace.meta.mode_changed': { label: 'Modo de publicación cambiado', tone: 'info' },
  'workspace.meta.own_app_configured': { label: 'App propia de Meta configurada', tone: 'info' },
};

const ENTITY_LABELS: Record<string, { one: string; href: string | null }> = {
  guest: { one: 'Pasajero', href: '/pasajeros' },
  booking: { one: 'Reserva', href: '/reservas' },
  payment: { one: 'Pago', href: '/pagos' },
  site: { one: 'Sitio', href: '/sitios' },
  room: { one: 'Habitación', href: null },
  room_type: { one: 'Tipo de habitación', href: null },
  content: { one: 'Contenido', href: '/automatizacion' },
  workspace: { one: 'Espacio de trabajo', href: '/settings' },
};

const VERBS: Record<string, { text: string; tone: ActivityTone }> = {
  created: { text: 'creado', tone: 'ok' },
  updated: { text: 'actualizado', tone: 'info' },
  deleted: { text: 'eliminado', tone: 'warn' },
  approved: { text: 'aprobado', tone: 'ok' },
  cancelled: { text: 'cancelado', tone: 'warn' },
  failed: { text: 'con error', tone: 'danger' },
};

/** Texto legible en español para una acción del registro de auditoría. */
export function describeActivity(action: string, entityType: string): ActivityDescription {
  const entity = ENTITY_LABELS[entityType] ?? null;
  const href = entity?.href ?? null;
  const known = ACTIVITY_LABELS[action];
  if (known) return { ...known, href };
  const verb = VERBS[action.split('.').pop() ?? ''];
  if (entity && verb) {
    // «Habitación» y «Reserva» concuerdan en femenino; el resto en masculino.
    const feminine = entity.one === 'Habitación' || entity.one === 'Reserva' || entity.one === 'Tipo de habitación';
    const text = feminine ? verb.text.replace(/o$/, 'a') : verb.text;
    return { label: `${entity.one} ${text}`, tone: verb.tone, href };
  }
  return { label: 'Actividad registrada', tone: 'info', href };
}

/* ---------------- Etiquetas de KPI ---------------- */

export const KPI_LABELS: Record<KpiId, { label: string; href: string }> = {
  contacts: { label: 'Contactos nuevos', href: '/contactos' },
  conversations: { label: 'Conversaciones nuevas', href: '/conversaciones' },
  appointments: { label: 'Citas agendadas', href: '/calendarios' },
  campaigns: { label: 'Campañas creadas', href: '/campaign/new' },
  payments: { label: 'Pagos cobrados', href: '/pagos' },
  posts: { label: 'Publicaciones IG', href: '/automatizacion' },
};

/** Anchos relativos (0–100) de las barras «actual» y «anterior»: la mayor ocupa el 100 %. */
export function barShares(current: number, previous: number): [number, number] {
  const max = Math.max(current, previous, 0);
  if (max === 0) return [0, 0];
  return [Math.round((current / max) * 100), Math.round((previous / max) * 100)];
}
