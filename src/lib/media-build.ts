/**
 * Lógica pura que convierte las filas que YA existen en la base (imágenes de
 * grillas, salidas de campañas, publicaciones programadas, documento de marca)
 * en una lista única de activos. Sin Prisma ni React: se prueba en aislamiento.
 */
import {
  KIND_SINGULAR,
  type MediaItem,
  type MediaKind,
  type MediaPayload,
} from './media-types';

/** Topes por fuente: acotan la consulta y permiten avisar si pudo quedar algo fuera. */
export const MEDIA_TAKE = { grid: 300, campaign: 300, planned: 80 } as const;

const MAX_URL_LENGTH = 2048;
const MAX_NOTE_LENGTH = 200;

const IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'svg', 'bmp']);
const VIDEO_EXT = new Set(['mp4', 'mov', 'webm', 'm4v', 'mkv']);
const AUDIO_EXT = new Set(['mp3', 'wav', 'm4a', 'ogg', 'aac']);
const DOC_EXT = new Set(['pdf', 'doc', 'docx', 'txt', 'md', 'csv', 'xls', 'xlsx', 'ppt', 'pptx', 'json', 'rtf']);

export interface GridAssetRow {
  id: string;
  themeIndex: number;
  slideNumber: number;
  kind: string;
  prompt: string | null;
  publicUrl: string;
  createdAt: Date | string;
  grid: { id: string; name: string };
}

export interface CampaignAssetRow {
  id: string;
  kind: string;
  publicUrl: string;
  createdAt: Date | string;
  task: { index: number; execution: { campaign: { id: string; name: string } } };
}

export interface PlannedPostRow {
  id: string;
  dayNumber: number | null;
  caption: string;
  mediaUrls: string[];
  scheduledAt: Date | string;
  status: string;
}

export interface BrandDocRow {
  brandDocName: string | null;
  brandDocUpdatedAt: Date | string | null;
}

/** Acepta solo http(s) y devuelve la URL limpia; cualquier otra cosa (javascript:, data:…) es null. */
export function safeHttpUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  if (!raw || raw.length > MAX_URL_LENGTH) return null;
  try {
    const u = new URL(raw);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Extensión en minúsculas tomada de la ruta de la URL (ignora consulta y hash); vacía si no hay. */
export function extensionOf(url: string): string {
  let path = url;
  try {
    path = new URL(url).pathname;
  } catch {
    path = url.split(/[?#]/)[0];
  }
  const name = path.split('/').pop() ?? '';
  const dot = name.lastIndexOf('.');
  if (dot <= 0 || dot === name.length - 1) return '';
  const ext = name.slice(dot + 1).toLowerCase();
  return /^[a-z0-9]{1,5}$/.test(ext) ? ext : '';
}

export function kindFromExtension(ext: string): MediaKind | null {
  if (IMAGE_EXT.has(ext)) return 'image';
  if (VIDEO_EXT.has(ext)) return 'video';
  if (AUDIO_EXT.has(ext)) return 'audio';
  if (DOC_EXT.has(ext)) return 'document';
  return null;
}

/** Tipo de un `Asset` de campaña. «final» es el video terminado salvo que la extensión diga otra cosa. */
export function kindFromAssetKind(kind: string, ext: string): MediaKind | null {
  switch (kind) {
    case 'image':
      return 'image';
    case 'video':
      return 'video';
    case 'voice':
    case 'music':
      return 'audio';
    case 'script':
      return 'document';
    case 'final':
      return kindFromExtension(ext) ?? 'video';
    default:
      return kindFromExtension(ext);
  }
}

export function toIso(value: Date | string | null | undefined): string {
  if (!value) return new Date(0).toISOString();
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? new Date(0).toISOString() : d.toISOString();
}

export function truncateText(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

export function fromGridAssets(rows: readonly GridAssetRow[]): MediaItem[] {
  const out: MediaItem[] = [];
  for (const row of rows) {
    const url = safeHttpUrl(row.publicUrl);
    if (!url) continue;
    const ext = extensionOf(url);
    const kind = kindFromAssetKind(row.kind, ext);
    if (!kind) continue;
    out.push({
      id: `generator:${row.id}`,
      kind,
      origin: 'generator',
      title: `Tema ${row.themeIndex + 1} · Slide ${row.slideNumber}`,
      detail: row.grid.name,
      note: truncateText(row.prompt ?? '', MAX_NOTE_LENGTH),
      url,
      ext,
      date: toIso(row.createdAt),
      sourceHref: `/generador-imagenes/${row.grid.id}`,
    });
  }
  return out;
}

export function fromCampaignAssets(rows: readonly CampaignAssetRow[]): MediaItem[] {
  const out: MediaItem[] = [];
  for (const row of rows) {
    const url = safeHttpUrl(row.publicUrl);
    if (!url) continue;
    const ext = extensionOf(url);
    const kind = kindFromAssetKind(row.kind, ext);
    if (!kind) continue;
    const campaign = row.task.execution.campaign;
    out.push({
      id: `campaign:${row.id}`,
      kind,
      origin: 'campaign',
      title: `${KIND_SINGULAR[kind]} · tarea ${row.task.index + 1}`,
      detail: campaign.name,
      note: '',
      url,
      ext,
      date: toIso(row.createdAt),
      sourceHref: `/campaign/${campaign.id}`,
    });
  }
  return out;
}

export function fromPlannedPosts(rows: readonly PlannedPostRow[]): MediaItem[] {
  const out: MediaItem[] = [];
  for (const row of rows) {
    row.mediaUrls.forEach((raw, i) => {
      const url = safeHttpUrl(raw);
      if (!url) return;
      const ext = extensionOf(url);
      out.push({
        id: `planner:${row.id}:${i}`,
        kind: kindFromExtension(ext) === 'video' ? 'video' : 'image',
        origin: 'planner',
        title: row.dayNumber ? `Publicación del día ${row.dayNumber}` : 'Publicación programada',
        detail: truncateText(row.caption, 90),
        note: truncateText(row.caption, MAX_NOTE_LENGTH),
        url,
        ext,
        date: toIso(row.scheduledAt),
        sourceHref: '/automatizacion',
      });
    });
  }
  return out;
}

export function fromBrandDoc(row: BrandDocRow | null | undefined): MediaItem[] {
  const name = row?.brandDocName?.trim();
  if (!row || !name) return [];
  const dot = name.lastIndexOf('.');
  return [
    {
      id: 'brand:doc',
      kind: 'document',
      origin: 'brand',
      title: name,
      detail: 'Documento de marca',
      note: 'sistema operativo de contenido',
      url: null,
      ext: dot > 0 ? name.slice(dot + 1).toLowerCase().slice(0, 5) : '',
      date: toIso(row.brandDocUpdatedAt),
      sourceHref: '/generador-imagenes',
    },
  ];
}

/** Une listas respetando la prioridad (la primera gana si dos activos comparten URL) y ordena por fecha. */
export function mergeMedia(lists: readonly (readonly MediaItem[])[]): MediaItem[] {
  const seen = new Set<string>();
  const merged: MediaItem[] = [];
  for (const list of lists) {
    for (const item of list) {
      if (item.url) {
        if (seen.has(item.url)) continue;
        seen.add(item.url);
      }
      merged.push(item);
    }
  }
  return merged.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.id.localeCompare(b.id)));
}

export interface BuildInput {
  grid: readonly GridAssetRow[];
  campaign: readonly CampaignAssetRow[];
  planned: readonly PlannedPostRow[];
  brand: BrandDocRow | null | undefined;
}

export function buildMediaPayload(input: BuildInput, now: Date = new Date()): MediaPayload {
  const items = mergeMedia([
    fromGridAssets(input.grid),
    fromCampaignAssets(input.campaign),
    fromPlannedPosts(input.planned),
    fromBrandDoc(input.brand),
  ]);
  return {
    items,
    truncated:
      input.grid.length >= MEDIA_TAKE.grid ||
      input.campaign.length >= MEDIA_TAKE.campaign ||
      input.planned.length >= MEDIA_TAKE.planned,
    generatedAt: now.toISOString(),
  };
}
