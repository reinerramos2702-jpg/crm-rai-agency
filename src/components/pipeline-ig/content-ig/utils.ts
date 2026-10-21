import type { ContentPlannerConfig } from '@/lib/content-planner-config';
import type { BatchDayInput, ScheduledPostView } from '../useScheduledPosts';
import { CFG_OPTIONAL_IDS, STORAGE_PREFIX } from './constants';
import type { Campaign, ChatMessage, ConfigSection, ContentDay } from './types';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Fecha ISO del día: la del plan si es válida; si no, inicio de campaña + (día-1). */
export function dayIsoDate(startDate: string, day: ContentDay): string | null {
  if (ISO_DATE.test(day.date)) return day.date;
  if (!ISO_DATE.test(startDate)) return null;
  const d = new Date(`${startDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + day.day - 1);
  return d.toISOString().slice(0, 10);
}

/** Caption final = texto + CTA + hashtags, sin duplicar lo que el caption ya trae. */
export function composeCaption(day: ContentDay): string {
  const parts = [day.caption?.trim(), day.cta?.trim(), day.hashtags?.trim()].filter((p): p is string => !!p);
  return parts.filter((p, i) => i === 0 || !parts[0].includes(p)).join('\n\n');
}

/** «12 oct, 20:47» en la zona de la publicación; si la zona no es válida, recorta el ISO. */
export function fmtWhen(iso: string, tz: string): string {
  try {
    return new Intl.DateTimeFormat('es', { timeZone: tz, day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
  } catch {
    return iso.slice(0, 16).replace('T', ' ');
  }
}

/** Fecha corta del plan («2026-10-12» → «12 oct»); si no es válida, la devuelve tal cual. */
export function fmtShortDate(iso: string): string {
  if (!ISO_DATE.test(iso)) return iso;
  try {
    return new Intl.DateTimeFormat('es', { timeZone: 'UTC', day: '2-digit', month: 'short' }).format(new Date(`${iso}T00:00:00Z`));
  } catch {
    return iso;
  }
}

export function nextPendingPost(posts: ScheduledPostView[]): ScheduledPostView | undefined {
  return posts
    .filter((p) => p.status === 'scheduled' || p.status === 'draft')
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))[0];
}

export interface BatchPlan {
  valid: BatchDayInput[];
  invalid: Array<{ day: number; reason: string }>;
}

/** Días listos para programar y días con problemas (los ya publicados o publicándose se omiten). */
export function buildBatch(campaign: Campaign | null, byDay: Map<number, ScheduledPostView>): BatchPlan {
  const valid: BatchDayInput[] = [];
  const invalid: BatchPlan['invalid'] = [];
  if (!campaign) return { valid, invalid };
  for (const d of campaign.days) {
    const date = dayIsoDate(campaign.startDate, d);
    const caption = composeCaption(d);
    const existing = byDay.get(d.day);
    if (existing && (existing.status === 'published' || existing.status === 'publishing')) continue;
    if (!date) { invalid.push({ day: d.day, reason: 'fecha inválida' }); continue; }
    if (!caption) { invalid.push({ day: d.day, reason: 'sin texto' }); continue; }
    valid.push({ day: d.day, date, caption, mediaType: d.type === 'carousel' ? 'carousel' : 'image' });
  }
  return { valid, invalid };
}

/** Refleja en la campaña lo que el servidor ya publicó (o falló). Devuelve null si no hay nada que cambiar. */
export function applyServerStatus(campaign: Campaign, byDay: Map<number, ScheduledPostView>): Campaign | null {
  let changed = false;
  const days = campaign.days.map((d) => {
    const p = byDay.get(d.day);
    if (p?.status === 'published' && d.status !== 'published') { changed = true; return { ...d, status: 'published' as const }; }
    if (p?.status === 'failed' && d.status === 'approved') { changed = true; return { ...d, status: 'failed' as const }; }
    return d;
  });
  if (!changed) return null;
  return { ...campaign, days, published: days.filter((d) => d.status === 'published').length };
}

/** Contexto de marca que se envía a la IA: solo los campos con contenido. */
export function buildBrandContext(config: ContentPlannerConfig, photos: string[]): Record<string, string> | undefined {
  const ctx: Record<string, string> = {};
  const put = (key: string, value: string) => { if (value) ctx[key] = value; };
  put('businessName', config.businessName);
  put('businessType', config.businessType);
  put('businessLocation', config.businessLocation);
  put('businessPhone', config.businessPhone);
  put('businessWhatsApp', config.businessWhatsApp);
  put('businessWebsite', config.businessWebsite);
  put('igHandle', config.igHandle);
  put('brandColors', config.brandColors);
  put('brandTone', config.brandTone);
  put('services', config.services);
  put('targetAudience', config.targetAudience);
  put('competitors', config.competitors);
  put('contentNotes', config.contentNotes);
  put('photoMode', config.photoMode);
  put('logoMode', config.logoMode);
  if (photos.length > 0) ctx.availablePhotos = photos.join(', ');
  if (config.brandDocContent) ctx.brandDocument = config.brandDocContent.slice(0, 30000);
  if (config.brandRules.length > 0) {
    ctx.brandRules = config.brandRules.map((r) => `"${r.forbidden}" → "${r.replacement}" (${r.reason})`).join('; ');
  }
  return Object.keys(ctx).length > 0 ? ctx : undefined;
}

export interface ConfigProgress {
  sections: ConfigSection[];
  required: ConfigSection[];
  done: number;
  pct: number;
  complete: boolean;
}

export function buildConfigProgress(config: ContentPlannerConfig, photos: string[]): ConfigProgress {
  const sections: ConfigSection[] = [
    { id: 'cfg-negocio', label: 'Negocio', done: !!(config.businessName.trim() && config.businessType.trim()), hint: 'Nombre y tipo' },
    { id: 'cfg-marca', label: 'Marca', done: !!(config.brandColors.trim() || config.brandDocContent.trim()), hint: 'Colores o manual' },
    { id: 'cfg-fotos', label: 'Fotos', done: config.photoMode === 'ai' || photos.length > 0, hint: 'Fotos o modo IA' },
    { id: 'cfg-instagram', label: 'Instagram', done: !!(config.igHandle.trim() && config.publishTime && config.timezone), hint: 'Cuenta, hora y zona' },
    { id: 'cfg-reglas', label: 'Reglas', done: config.brandRules.length > 0, hint: 'Opcional' },
    { id: 'cfg-notas', label: 'Notas', done: !!config.contentNotes.trim(), hint: 'Opcional' },
  ];
  const required = sections.filter((s) => !CFG_OPTIONAL_IDS.includes(s.id));
  const done = required.filter((s) => s.done).length;
  return { sections, required, done, pct: Math.round((done / required.length) * 100), complete: done === required.length };
}

/** Zonas horarias del navegador (más la actual, aunque el navegador no la liste). */
export function listTimezones(current: string): string[] {
  let all: string[] = [];
  try {
    all = Intl.supportedValuesOf('timeZone');
  } catch {
    all = [];
  }
  return Array.from(new Set([...(all.length ? all : ['UTC']), current]));
}

// ---------- Almacenamiento local (solo se llama desde efectos) ----------

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isCampaign(value: unknown): value is Campaign {
  return isRecord(value) && typeof value.id === 'string' && Array.isArray(value.days);
}

export function isChatMessage(value: unknown): value is ChatMessage {
  return isRecord(value) && typeof value.content === 'string' && (value.role === 'user' || value.role === 'assistant' || value.role === 'system');
}

export function readStored(key: string): unknown {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    // Contenido guardado ilegible o almacenamiento bloqueado: se usa el valor inicial.
    return undefined;
  }
}

export function writeStored(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {
    // El guardado es opcional: puede fallar si el almacenamiento está bloqueado o lleno.
  }
}
