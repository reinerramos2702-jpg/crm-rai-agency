import { prisma } from '@/lib/db';
import { addDays, dayKey, timeKey, todayKey, DEFAULT_TIMEZONE } from './timezone';
import type {
  BlackoutDTO,
  CalendarSettingsDTO,
  MediaType,
  Network,
  PostDTO,
  PostStatus,
  StreakDTO,
} from './types';

/**
 * Capa de servicio del Calendario de Contenido: acceso a datos, reglas de
 * negocio (bloqueo de fechas, límite de frecuencia, aprobación en dos pasos)
 * y serialización a DTO.
 *
 * Todo se filtra SIEMPRE por `workspaceId`. Cuando aterrice el multi-tenant
 * del Bloque 1, este es el único punto por el que hay que pasar el `tenantId`.
 */

/** Devuelve (creando si hace falta) la configuración del calendario del workspace. */
export async function getSettings(workspaceId: string) {
  const existing = await prisma.contentCalendarSettings.findUnique({ where: { workspaceId } });
  if (existing) return existing;
  return prisma.contentCalendarSettings.create({
    data: { workspaceId, timezone: DEFAULT_TIMEZONE },
  });
}

export function settingsToDTO(s: {
  timezone: string;
  maxPostsPerDay: number;
  requireApproval: boolean;
  defaultPostTime: string;
  brandName: string | null;
  brandHandle: string | null;
  brandAvatarUrl: string | null;
  brandPrimary: string | null;
  brandAccent: string | null;
  brandBackground: string | null;
  onboardingCompletedAt: Date | null;
}): CalendarSettingsDTO {
  return {
    timezone: s.timezone,
    maxPostsPerDay: s.maxPostsPerDay,
    requireApproval: s.requireApproval,
    defaultPostTime: s.defaultPostTime,
    brandName: s.brandName,
    brandHandle: s.brandHandle,
    brandAvatarUrl: s.brandAvatarUrl,
    brandPrimary: s.brandPrimary,
    brandAccent: s.brandAccent,
    brandBackground: s.brandBackground,
    onboardingCompletedAt: s.onboardingCompletedAt ? s.onboardingCompletedAt.toISOString() : null,
  };
}

/** `include` estándar para traer un post con sus medios ordenados. */
export const POST_INCLUDE = {
  media: { orderBy: { sortIndex: 'asc' as const } },
};

export interface RawMedia {
  id: string;
  url: string;
  thumbUrl: string | null;
  kind: string;
  mimeType: string | null;
  fileName: string | null;
  width: number | null;
  height: number | null;
  durationSec: number | null;
  sortIndex: number;
  clipFromSec: number | null;
  clipToSec: number | null;
}

export interface RawPost {
  id: string;
  title: string | null;
  caption: string | null;
  inBank: boolean;
  scheduledFor: Date | null;
  sortIndex: number;
  status: string;
  networks: string[];
  mediaType: string;
  approvedAt: Date | null;
  rejectionNote: string | null;
  publishAttempts: number;
  lastError: string | null;
  nextRetryAt: Date | null;
  publishedAt: Date | null;
  publishResult: unknown;
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
  media: RawMedia[];
}

export function postToDTO(post: RawPost, timezone: string): PostDTO {
  return {
    id: post.id,
    title: post.title,
    caption: post.caption,
    inBank: post.inBank,
    scheduledFor: post.scheduledFor ? post.scheduledFor.toISOString() : null,
    day: post.scheduledFor ? dayKey(post.scheduledFor, timezone) : null,
    time: post.scheduledFor ? timeKey(post.scheduledFor, timezone) : null,
    sortIndex: post.sortIndex,
    status: post.status as PostStatus,
    networks: post.networks as Network[],
    mediaType: post.mediaType as MediaType,
    approvedAt: post.approvedAt ? post.approvedAt.toISOString() : null,
    rejectionNote: post.rejectionNote,
    publishAttempts: post.publishAttempts,
    lastError: post.lastError,
    nextRetryAt: post.nextRetryAt ? post.nextRetryAt.toISOString() : null,
    publishedAt: post.publishedAt ? post.publishedAt.toISOString() : null,
    publishResult: (post.publishResult as PostDTO['publishResult']) || null,
    isDemo: post.isDemo,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    media: post.media.map((m) => ({
      id: m.id,
      url: m.url,
      thumbUrl: m.thumbUrl,
      kind: m.kind === 'video' ? 'video' : 'image',
      mimeType: m.mimeType,
      fileName: m.fileName,
      width: m.width,
      height: m.height,
      durationSec: m.durationSec,
      sortIndex: m.sortIndex,
      clipFromSec: m.clipFromSec,
      clipToSec: m.clipToSec,
    })),
  };
}

/** Registra un evento en el log de actividad del calendario (nunca bloquea). */
export async function logPostEvent(args: {
  workspaceId: string;
  postId?: string | null;
  actorUserId?: string | null;
  action: string;
  detail?: string;
  meta?: Record<string, unknown>;
  isDemo?: boolean;
}) {
  try {
    await prisma.contentPostEvent.create({
      data: {
        workspaceId: args.workspaceId,
        postId: args.postId || null,
        actorUserId: args.actorUserId || null,
        action: args.action,
        detail: args.detail || null,
        meta: (args.meta || {}) as never,
        isDemo: args.isDemo || false,
      },
    });
  } catch {
    // El log de actividad nunca debe tumbar la operación principal.
  }
}

export async function listBlackouts(workspaceId: string): Promise<BlackoutDTO[]> {
  const rows = await prisma.contentBlackoutDate.findMany({
    where: { workspaceId },
    orderBy: { day: 'asc' },
  });
  return rows.map((r) => ({ id: r.id, day: r.day, reason: r.reason }));
}

/**
 * Trae los posts cuyo día (en `timezone`) cae dentro de [fromDay, toDay].
 *
 * Se acota primero por un rango UTC amplio (un día extra a cada lado) y luego
 * se filtra en memoria por `dayKey`, para no depender de funciones de fecha
 * del motor SQL ni de la zona horaria del servidor.
 */
export async function postsInDayRange(
  workspaceId: string,
  fromDay: string,
  toDay: string,
  timezone: string
) {
  const gte = new Date(`${addDays(fromDay, -1)}T00:00:00.000Z`);
  const lte = new Date(`${addDays(toDay, 2)}T00:00:00.000Z`);

  const rows = await prisma.contentPost.findMany({
    where: { workspaceId, inBank: false, scheduledFor: { gte, lte } },
    include: POST_INCLUDE,
    orderBy: [{ scheduledFor: 'asc' }, { sortIndex: 'asc' }],
  });

  return rows.filter((p) => {
    if (!p.scheduledFor) return false;
    const k = dayKey(p.scheduledFor, timezone);
    return k >= fromDay && k <= toDay;
  });
}

/** Cuenta las tarjetas programadas en un día concreto de la zona del calendario. */
export async function countPostsOnDay(
  workspaceId: string,
  day: string,
  timezone: string,
  ignorePostId?: string
): Promise<number> {
  const posts = await postsInDayRange(workspaceId, day, day, timezone);
  return posts.filter((p) => p.id !== ignorePostId).length;
}

/**
 * #13 + #14 — ¿este día admite una tarjeta más?
 * Devuelve `{ ok: true }` si el día está libre, o el motivo del bloqueo.
 */
export async function checkDayCapacity(args: {
  workspaceId: string;
  day: string;
  timezone: string;
  maxPostsPerDay: number;
  /** Post que se está moviendo/editando: no cuenta contra su propio día. */
  ignorePostId?: string;
}): Promise<{ ok: true } | { ok: false; reason: 'blackout' | 'limit'; message: string }> {
  const blackout = await prisma.contentBlackoutDate.findUnique({
    where: { workspaceId_day: { workspaceId: args.workspaceId, day: args.day } },
  });
  if (blackout) {
    return {
      ok: false,
      reason: 'blackout',
      message: blackout.reason
        ? `El ${args.day} está marcado como día sin publicación (${blackout.reason}).`
        : `El ${args.day} está marcado como día sin publicación.`,
    };
  }

  const used = await countPostsOnDay(args.workspaceId, args.day, args.timezone, args.ignorePostId);
  if (used >= args.maxPostsPerDay) {
    return {
      ok: false,
      reason: 'limit',
      message: `El ${args.day} ya tiene ${used} publicación(es) y el límite configurado es ${args.maxPostsPerDay} por día.`,
    };
  }
  return { ok: true };
}

/**
 * #6 Auto-distribución: devuelve los próximos `count` días disponibles a partir
 * de `startDay`, saltando bloqueos y días que ya llegaron al límite.
 */
export async function findAvailableDays(args: {
  workspaceId: string;
  startDay: string;
  count: number;
  timezone: string;
  maxPostsPerDay: number;
  /** Tope de días a explorar antes de rendirse (evita bucles infinitos). */
  horizonDays?: number;
}): Promise<string[]> {
  const horizon = args.horizonDays || 180;
  const lastDay = addDays(args.startDay, horizon);

  const blackoutRows = await prisma.contentBlackoutDate.findMany({
    where: { workspaceId: args.workspaceId, day: { gte: args.startDay, lte: lastDay } },
    select: { day: true },
  });
  const blackouts = new Set(blackoutRows.map((b) => b.day));

  const scheduled = await postsInDayRange(args.workspaceId, args.startDay, lastDay, args.timezone);
  const usage = new Map<string, number>();
  for (const p of scheduled) {
    if (!p.scheduledFor) continue;
    const k = dayKey(p.scheduledFor, args.timezone);
    usage.set(k, (usage.get(k) || 0) + 1);
  }

  const out: string[] = [];
  let cursor = args.startDay;
  for (let i = 0; i <= horizon && out.length < args.count; i++) {
    const used = usage.get(cursor) || 0;
    if (!blackouts.has(cursor) && used < args.maxPostsPerDay) {
      out.push(cursor);
      usage.set(cursor, used + 1);
    }
    cursor = addDays(cursor, 1);
  }
  return out;
}

/**
 * #17 Indicador de racha: días consecutivos con al menos una publicación,
 * contando hacia atrás desde hoy (o desde ayer, para no dar por rota la racha
 * mientras el día en curso todavía no termina).
 */
export async function computeStreak(workspaceId: string, timezone: string): Promise<StreakDTO> {
  const published = await prisma.contentPost.findMany({
    where: { workspaceId, status: 'published', publishedAt: { not: null } },
    select: { publishedAt: true },
    orderBy: { publishedAt: 'desc' },
    take: 1000,
  });

  const days = new Set<string>();
  for (const p of published) {
    if (p.publishedAt) days.add(dayKey(p.publishedAt, timezone));
  }
  const sorted = Array.from(days).sort();
  const lastPublishedDay = sorted.length ? sorted[sorted.length - 1] : null;

  const today = todayKey(timezone);
  let cursor = days.has(today) ? today : addDays(today, -1);
  let current = 0;
  while (days.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }

  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    if (run > best) best = run;
    prev = d;
  }

  return { current, best, lastPublishedDay, publishedDays: sorted.slice(-90) };
}
