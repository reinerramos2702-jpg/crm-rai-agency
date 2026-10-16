/**
 * Lógica pura de publicación programada en Instagram (Corte B).
 * Sin acceso a BD ni red: validación de lotes, zonas horarias, reintentos.
 * El cliente nunca decide workspaceId ni status: solo envía contenido y fechas.
 */
import { isValidTime, isValidTimezone } from './content-planner-config';

export const POST_STATUSES = ['draft', 'scheduled', 'publishing', 'published', 'failed', 'cancelled'] as const;
export type PostStatus = (typeof POST_STATUSES)[number];
export type MediaType = 'image' | 'carousel';

export const MAX_ATTEMPTS = 3;
export const MAX_BATCH = 62;
export const MAX_CAROUSEL = 10; // límite vigente de Meta: verificar antes de live
export const CAPTION_MAX = 2200; // límite de caption en Instagram
export const STALE_LOCK_MS = 15 * 60 * 1000;
export const MAX_URL_LEN = 2000;

/** Modo de publicación: 'simulated' (por defecto, no toca Meta) o 'live'. */
export type PublishMode = 'simulated' | 'live';
export function getPublishMode(env: Record<string, string | undefined> = process.env): PublishMode {
  return env.IG_PUBLISH_MODE === 'live' ? 'live' : 'simulated';
}

// ---------- Zonas horarias (sin dependencias) ----------

/** Desfase (ms) de la zona `tz` respecto a UTC en el instante `ts`. */
export function tzOffsetMs(ts: number, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(ts));
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second'));
  return asUtc - Math.floor(ts / 1000) * 1000;
}

/** Convierte fecha local (YYYY-MM-DD) + hora local (HH:MM) en zona `tz` a instante UTC. */
export function zonedToUtc(date: string, time: string, tz: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const naive = Date.UTC(y, m - 1, d, hh, mm, 0);
  let guess = naive - tzOffsetMs(naive, tz);
  // segunda pasada: corrige cambios de horario (DST) cerca del instante
  guess = naive - tzOffsetMs(guess, tz);
  return new Date(guess);
}

export function isIsoDate(v: unknown): v is string {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function isPublicHttpsUrl(v: unknown): v is string {
  if (typeof v !== 'string' || v.length > MAX_URL_LEN) return false;
  try {
    const u = new URL(v);
    if (u.protocol !== 'https:') return false;
    const h = u.hostname.toLowerCase();
    if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return false;
    const octets = h.split('.');
    if (octets.length === 4 && octets.every((o) => o.length >= 1 && o.length <= 3 && /^\d+$/.test(o))) {
      const [a, b] = octets.map(Number);
      if (a === 10 || a === 127 || a === 0 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254)) return false;
    }
    if (h.startsWith('[')) return false; // IPv6 literal: no se acepta
    return true;
  } catch {
    return false;
  }
}

// ---------- Validación de lote ----------

export interface SanitizedPost {
  dayNumber: number;
  caption: string;
  mediaUrls: string[];
  mediaType: MediaType;
  scheduledAt: Date;
}

export interface SkippedPost {
  day: number | null;
  reason: string;
}

export type BatchResult =
  | { ok: true; campaignRef: string; timezone: string; time: string; posts: SanitizedPost[]; skipped: SkippedPost[] }
  | { ok: false; error: string };

interface BatchOpts {
  now: Date;
  requireMedia: boolean;
  defaultTime: string;
  defaultTimezone: string;
}

export function sanitizeBatch(body: unknown, opts: BatchOpts): BatchResult {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Cuerpo inválido' };
  const b = body as Record<string, unknown>;

  const campaignRef = typeof b.campaignRef === 'string' ? b.campaignRef.trim().slice(0, 100) : '';
  if (!campaignRef) return { ok: false, error: 'Falta campaignRef' };

  const time = b.time === undefined || b.time === '' ? opts.defaultTime : b.time;
  if (!isValidTime(time)) return { ok: false, error: 'Hora inválida (usa HH:MM, 24 h)' };
  const timezone = b.timezone === undefined || b.timezone === '' ? opts.defaultTimezone : b.timezone;
  if (!isValidTimezone(timezone)) return { ok: false, error: 'Zona horaria inválida' };

  if (!Array.isArray(b.posts) || b.posts.length === 0) return { ok: false, error: 'El lote está vacío' };
  if (b.posts.length > MAX_BATCH) return { ok: false, error: `Máximo ${MAX_BATCH} publicaciones por lote` };

  const posts: SanitizedPost[] = [];
  const skipped: SkippedPost[] = [];
  const seenDays = new Set<number>();

  for (const raw of b.posts as unknown[]) {
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const day = typeof r.day === 'number' && Number.isInteger(r.day) && r.day > 0 && r.day < 1000 ? r.day : null;
    if (day === null) { skipped.push({ day: null, reason: 'Día inválido' }); continue; }
    if (seenDays.has(day)) { skipped.push({ day, reason: 'Día repetido en el lote' }); continue; }
    seenDays.add(day);

    if (!isIsoDate(r.date)) { skipped.push({ day, reason: 'Fecha inválida (YYYY-MM-DD)' }); continue; }
    const caption = typeof r.caption === 'string' ? r.caption.trim() : '';
    if (!caption) { skipped.push({ day, reason: 'Sin texto (caption)' }); continue; }
    if (caption.length > CAPTION_MAX) { skipped.push({ day, reason: `Caption supera ${CAPTION_MAX} caracteres` }); continue; }

    const urlsIn = Array.isArray(r.mediaUrls) ? r.mediaUrls : [];
    if (urlsIn.length > MAX_CAROUSEL) { skipped.push({ day, reason: `Máximo ${MAX_CAROUSEL} imágenes por carrusel` }); continue; }
    if (urlsIn.some((u) => !isPublicHttpsUrl(u))) { skipped.push({ day, reason: 'URL de imagen no pública o no https' }); continue; }
    const mediaUrls = urlsIn as string[];
    if (opts.requireMedia && mediaUrls.length === 0) { skipped.push({ day, reason: 'Faltan imágenes con URL pública' }); continue; }

    const mediaType: MediaType = mediaUrls.length > 1 || r.mediaType === 'carousel' ? 'carousel' : 'image';
    if (mediaType === 'carousel' && mediaUrls.length > 0 && mediaUrls.length < 2) {
      skipped.push({ day, reason: 'Un carrusel necesita al menos 2 imágenes' }); continue;
    }

    const scheduledAt = zonedToUtc(r.date, time, timezone);
    if (scheduledAt.getTime() <= opts.now.getTime()) { skipped.push({ day, reason: 'La fecha y hora ya pasaron' }); continue; }

    posts.push({ dayNumber: day, caption, mediaUrls, mediaType, scheduledAt });
  }

  if (posts.length === 0) {
    return { ok: false, error: 'Ninguna publicación del lote es válida: ' + skipped.map((s) => `día ${s.day ?? '?'}: ${s.reason}`).join('; ') };
  }
  return { ok: true, campaignRef, timezone, time, posts, skipped };
}

// ---------- Estados y reintentos ----------

const TRANSITIONS: Record<PostStatus, PostStatus[]> = {
  draft: ['scheduled', 'cancelled'],
  scheduled: ['publishing', 'cancelled'],
  publishing: ['published', 'failed', 'scheduled'],
  published: [],
  failed: ['scheduled', 'cancelled'],
  cancelled: ['scheduled'],
};
export function canTransition(from: PostStatus, to: PostStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

/** Espera antes del siguiente intento: 5 min, 15 min, 45 min… */
export function retryDelayMs(attempts: number): number {
  return 5 * 60 * 1000 * Math.pow(3, Math.max(0, attempts - 1));
}

/** Mensaje de error seguro: sin tokens ni URLs con credenciales. */
export function safeError(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  return raw
    .replace(/access_token=[^&\s"']+/gi, 'access_token=***')
    .replace(/EA[A-Za-z0-9]{20,}/g, '***')
    .slice(0, 500);
}

/**
 * ¿El error de Prisma indica que la tabla no existe (migración sin aplicar)?
 * P2021 = tabla inexistente, P2022 = columna inexistente. Se detecta por forma, sin importar Prisma.
 */
export function isMissingTableError(e: unknown): boolean {
  const code = (e as { code?: unknown } | null)?.code;
  return code === 'P2021' || code === 'P2022';
}
