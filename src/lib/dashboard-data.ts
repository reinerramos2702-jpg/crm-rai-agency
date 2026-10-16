// Consultas del resumen del Dashboard (SOLO servidor). Un único endpoint
// (/api/dashboard/summary) las ejecuta en paralelo con selects mínimos y las
// guarda en TtlCache por sección: «Hoy» e «Instagram/Automatización/Actividad»
// 10 s; indicadores por periodo 60 s. Cada sección falla de forma aislada (null)
// y respeta los permisos del rol (null = el rol no la ve).

import { prisma } from './db';
import { TtlCache } from './ttl-cache';
import { MODULE_ACCESS, ROLES, hasPermission, type Role } from './roles-shared';
import { getPublishMode, isMissingTableError } from './scheduled-posts';
import { parseStoredConfig } from './content-planner-config';
import {
  DASH_PERIODS,
  dayBounds,
  periodWindows,
  safeTimezone,
  type DashPeriod,
  type DashboardActivityItem,
  type DashboardAutomation,
  type DashboardInstagram,
  type DashboardKpi,
  type DashboardSummary,
  type DashboardToday,
  type KpiId,
  type TodayList,
} from './dashboard-summary';

/** Tope de filas leídas por lista de «Hoy»: si se alcanza, la interfaz muestra «N+». */
export const READ_CAP = { appointments: 50, tasks: 100, conversations: 100, payments: 50, posts: 50 } as const;
const PREVIEW = 3;
export const ACTIVITY_ROLES: readonly string[] = ['super_admin', 'agency_owner', 'admin', 'gerente'];

const can = (path: string, role: Role) => (MODULE_ACCESS[path] as string[] | undefined)?.includes(role) ?? false;

interface Extras {
  instagram: DashboardInstagram | null;
  automation: DashboardAutomation | null;
  activity: DashboardActivityItem[] | null;
}

const todayCache = new TtlCache<DashboardToday>(10_000);
const extrasCache = new TtlCache<Extras>(10_000);
const kpiCache = new TtlCache<DashboardKpi[]>(60_000);
const tzCache = new TtlCache<string>(5 * 60_000);

const keyOf = (workspaceId: string, role: string, extra = '') => `${workspaceId}:${role}${extra}`;

/** Invalidación sencilla: descarta todo lo guardado de un workspace (cualquier rol y periodo). */
export function invalidateDashboard(workspaceId: string): void {
  tzCache.delete(workspaceId);
  for (const role of ROLES) {
    todayCache.delete(keyOf(workspaceId, role));
    extrasCache.delete(keyOf(workspaceId, role));
    for (const d of DASH_PERIODS) kpiCache.delete(keyOf(workspaceId, role, `:${d}`));
  }
}

/** Ejecuta una consulta de sección; ante error la sección queda en null y el resto sigue. */
async function guard<T>(label: string, run: () => Promise<T>): Promise<T | null> {
  try {
    return await run();
  } catch (e) {
    if (!isMissingTableError(e)) console.warn(`[dashboard] sección «${label}» no disponible`, e);
    return null;
  }
}

function list<T>(rows: T[], cap: number): TodayList<T> {
  return { count: rows.length, more: rows.length >= cap, items: rows.slice(0, PREVIEW) };
}

async function workspaceTimezone(workspaceId: string): Promise<string> {
  return tzCache.getOrCompute(workspaceId, async () => {
    const row = await guard('zona horaria', () =>
      prisma.settings.findUnique({ where: { workspaceId }, select: { contentPlannerConfig: true } }),
    );
    return safeTimezone(parseStoredConfig(row?.contentPlannerConfig).timezone);
  });
}

/* ------------------------------ Hoy ------------------------------ */

async function loadToday(workspaceId: string, role: Role, now: Date): Promise<DashboardToday> {
  const tz = await workspaceTimezone(workspaceId);
  const { start, end } = dayBounds(now, tz);

  const [appointments, tasks, unanswered, payments, posts] = await Promise.all([
    can('/calendarios', role)
      ? guard('citas', async () => {
          const rows = await prisma.appointment.findMany({
            where: { workspaceId, startTime: { gte: start, lt: end }, status: { not: 'cancelled' } },
            orderBy: { startTime: 'asc' },
            take: READ_CAP.appointments,
            select: { id: true, title: true, startTime: true, contact: { select: { name: true } } },
          });
          return list(
            rows.map((r) => ({ id: r.id, title: r.title, startTime: r.startTime.toISOString(), contactName: r.contact?.name ?? null })),
            READ_CAP.appointments,
          );
        })
      : null,
    can('/conversaciones', role)
      ? guard('tareas', async () => {
          const rows = await prisma.contactTask.findMany({
            where: { done: false, dueAt: { lt: end }, contact: { workspaceId } },
            orderBy: { dueAt: 'asc' },
            take: READ_CAP.tasks,
            select: { id: true, title: true, dueAt: true, contact: { select: { name: true } } },
          });
          const mapped = rows.map((r) => ({
            id: r.id,
            title: r.title,
            dueAt: r.dueAt ? r.dueAt.toISOString() : null,
            overdue: !!r.dueAt && r.dueAt < start,
            contactName: r.contact.name,
          }));
          return { ...list(mapped, READ_CAP.tasks), overdue: mapped.filter((m) => m.overdue).length };
        })
      : null,
    can('/conversaciones', role)
      ? guard('conversaciones', async () => {
          const rows = await prisma.conversation.findMany({
            where: { contact: { workspaceId }, status: { not: 'closed' }, unreadCount: { gt: 0 } },
            orderBy: { updatedAt: 'desc' },
            take: READ_CAP.conversations,
            select: { id: true, channel: true, unreadCount: true, lastMessageAt: true, contact: { select: { name: true } } },
          });
          return list(
            rows.map((r) => ({
              id: r.id,
              contactName: r.contact.name,
              channel: r.channel,
              unread: r.unreadCount,
              lastMessageAt: r.lastMessageAt ? r.lastMessageAt.toISOString() : null,
            })),
            READ_CAP.conversations,
          );
        })
      : null,
    can('/pagos', role)
      ? guard('pagos', async () => {
          const rows = await prisma.payment.findMany({
            where: { workspaceId, status: 'under_review' },
            orderBy: { createdAt: 'desc' },
            take: READ_CAP.payments,
            select: { id: true, reference: true, amountCents: true, currency: true },
          });
          return list(rows, READ_CAP.payments);
        })
      : null,
    hasPermission(role, 'canManageContent')
      ? guard('publicaciones de hoy', async () => {
          const rows = await prisma.scheduledPost.findMany({
            where: { workspaceId, scheduledAt: { gte: start, lt: end }, status: { in: ['scheduled', 'publishing'] } },
            orderBy: { scheduledAt: 'asc' },
            take: READ_CAP.posts,
            select: { id: true, dayNumber: true, scheduledAt: true, status: true },
          });
          return list(
            rows.map((r) => ({ id: r.id, dayNumber: r.dayNumber, scheduledAt: r.scheduledAt.toISOString(), status: r.status })),
            READ_CAP.posts,
          );
        })
      : null,
  ]);

  return { tz, appointments, tasks, unanswered, payments, posts };
}

/* ------------------------- Indicadores por periodo ------------------------- */

async function loadKpis(workspaceId: string, role: Role, days: DashPeriod, now: Date): Promise<DashboardKpi[]> {
  const { current, previous } = periodWindows(now, days);
  const range = (w: { from: Date; to: Date }) => ({ gte: w.from, lt: w.to });

  const pair = (id: KpiId, run: (r: { gte: Date; lt: Date }) => Promise<number>) =>
    guard(`indicador ${id}`, async () => {
      const [cur, prev] = await Promise.all([run(range(current)), run(range(previous))]);
      return { id, current: cur, previous: prev } satisfies DashboardKpi;
    });

  const jobs: Array<Promise<DashboardKpi | null>> = [];
  if (can('/contactos', role)) jobs.push(pair('contacts', (r) => prisma.contact.count({ where: { workspaceId, createdAt: r } })));
  if (can('/conversaciones', role)) {
    jobs.push(pair('conversations', (r) => prisma.conversation.count({ where: { contact: { workspaceId }, createdAt: r } })));
  }
  if (can('/calendarios', role)) jobs.push(pair('appointments', (r) => prisma.appointment.count({ where: { workspaceId, createdAt: r } })));
  if (can('/campaign/new', role)) jobs.push(pair('campaigns', (r) => prisma.campaign.count({ where: { workspaceId, createdAt: r } })));
  if (can('/pagos', role)) {
    jobs.push(pair('payments', (r) => prisma.payment.count({ where: { workspaceId, status: 'paid', paidAt: r } })));
  }
  if (hasPermission(role, 'canManageContent')) {
    jobs.push(pair('posts', (r) => prisma.scheduledPost.count({ where: { workspaceId, status: 'published', publishedAt: r } })));
  }
  return (await Promise.all(jobs)).filter((k): k is DashboardKpi => k !== null);
}

/* ------------------- Instagram, automatización y actividad ------------------- */

async function loadInstagram(workspaceId: string, now: Date): Promise<DashboardInstagram | null> {
  const mode = getPublishMode();
  try {
    const [groups, next] = await Promise.all([
      prisma.scheduledPost.groupBy({ by: ['status'], where: { workspaceId }, _count: { _all: true } }),
      prisma.scheduledPost.findFirst({
        where: { workspaceId, status: 'scheduled', scheduledAt: { gte: now } },
        orderBy: { scheduledAt: 'asc' },
        select: { dayNumber: true, scheduledAt: true, timezone: true },
      }),
    ]);
    const n = (status: string) => groups.find((g) => g.status === status)?._count._all ?? 0;
    return {
      available: true,
      mode,
      scheduled: n('scheduled'),
      published: n('published'),
      failed: n('failed'),
      next: next ? { dayNumber: next.dayNumber, scheduledAt: next.scheduledAt.toISOString(), timezone: next.timezone } : null,
    };
  } catch (e) {
    if (isMissingTableError(e)) return { available: false, mode, scheduled: 0, published: 0, failed: 0, next: null };
    console.warn('[dashboard] sección «instagram» no disponible', e);
    return null;
  }
}

async function loadExtras(workspaceId: string, role: Role, now: Date): Promise<Extras> {
  const [instagram, automation, activity] = await Promise.all([
    hasPermission(role, 'canManageContent') ? loadInstagram(workspaceId, now) : null,
    can('/automatizacion', role)
      ? guard('automatización', async () => {
          const rows = await prisma.workflow.findMany({ where: { workspaceId }, select: { status: true, runsCount: true }, take: 500 });
          return {
            active: rows.filter((w) => w.status === 'active').length,
            total: rows.length,
            runs: rows.reduce((acc, w) => acc + (w.runsCount ?? 0), 0),
          };
        })
      : null,
    ACTIVITY_ROLES.includes(role)
      ? guard('actividad', async () => {
          const rows = await prisma.auditEvent.findMany({
            where: { workspaceId },
            orderBy: { createdAt: 'desc' },
            take: 8,
            select: { id: true, action: true, entityType: true, createdAt: true },
          });
          return rows.map((r) => ({ id: r.id, action: r.action, entityType: r.entityType, createdAt: r.createdAt.toISOString() }));
        })
      : null,
  ]);
  return { instagram, automation, activity };
}

/* ------------------------------ Resumen ------------------------------ */

export interface SummaryInput {
  workspaceId: string;
  role: Role;
  days: DashPeriod;
  me: { displayName: string | null; workspaceName: string | null };
  now?: Date;
}

export async function buildDashboardSummary({ workspaceId, role, days, me, now = new Date() }: SummaryInput): Promise<DashboardSummary> {
  const [today, kpis, extras] = await Promise.all([
    todayCache.getOrCompute(keyOf(workspaceId, role), () => loadToday(workspaceId, role, now)),
    kpiCache.getOrCompute(keyOf(workspaceId, role, `:${days}`), () => loadKpis(workspaceId, role, days, now)),
    extrasCache.getOrCompute(keyOf(workspaceId, role), () => loadExtras(workspaceId, role, now)),
  ]);
  return {
    days,
    generatedAt: now.toISOString(),
    me: { displayName: me.displayName, workspaceName: me.workspaceName, role },
    today,
    kpis,
    instagram: extras.instagram,
    automation: extras.automation,
    activity: extras.activity,
  };
}
