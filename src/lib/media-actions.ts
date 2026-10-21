/**
 * Acciones puras sobre activos: nombre de archivo, lista de enlaces, CSV y
 * destinos de «Usar en…». El navegador (copiar, descargar) vive en la pantalla.
 */
import { normalizeText } from './grid-filters';
import { KIND_SINGULAR, ORIGIN_LABELS, type MediaItem, type MediaKind } from './media-types';

export const PAGE_SIZE = 48;
export const MAX_BATCH_DOWNLOADS = 8;

const DEFAULT_EXT: Record<MediaKind, string> = { image: 'png', video: 'mp4', audio: 'mp3', document: 'txt' };

export function slugify(text: string, max = 48): string {
  const slug = normalizeText(text)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
    .replace(/-+$/g, '');
  return slug || 'archivo';
}

export function suggestFileName(item: Pick<MediaItem, 'title' | 'detail' | 'ext' | 'kind'>): string {
  const base = slugify(`${item.detail} ${item.title}`);
  return `${base}.${item.ext || DEFAULT_EXT[item.kind]}`;
}

/** Enlaces de los activos con archivo, uno por línea. */
export function linksText(items: readonly MediaItem[]): string {
  return items.filter((i) => i.url).map((i) => i.url as string).join('\n');
}

function csvCell(value: string): string {
  // Las celdas que empiezan por = + - @ se prefijan para que una hoja de cálculo no las ejecute como fórmula.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** CSV (con BOM aplicado por quien lo descarga) de los activos: título, tipo, origen, contexto, fecha y enlace. */
export function buildCsv(items: readonly MediaItem[]): string {
  const rows = [['Título', 'Tipo', 'Origen', 'Contexto', 'Fecha', 'Enlace']];
  for (const i of items) {
    rows.push([i.title, KIND_SINGULAR[i.kind], ORIGIN_LABELS[i.origin], i.detail, i.date.slice(0, 10), i.url ?? '']);
  }
  return rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
}

export interface UseInTarget {
  id: 'campaign' | 'generator' | 'schedule';
  label: string;
  href: string;
  hint: string;
}

const ALL_TARGETS: Record<UseInTarget['id'], UseInTarget> = {
  campaign: {
    id: 'campaign',
    label: 'Nueva campaña',
    href: '/campaign/new',
    hint: 'Pega el enlace como referencia en el chat de planificación.',
  },
  generator: {
    id: 'generator',
    label: 'Generador de imágenes',
    href: '/generador-imagenes',
    hint: 'Úsalo como referencia visual al crear o ajustar una grilla.',
  },
  schedule: {
    id: 'schedule',
    label: 'Programar publicación',
    href: '/automatizacion',
    hint: 'Pega el enlace como medio de una publicación.',
  },
};

/** Destinos donde tiene sentido el activo; solo se copia el enlace y se abre el módulo (no se adjunta solo). */
export function usageTargets(item: Pick<MediaItem, 'kind' | 'url'>): UseInTarget[] {
  if (!item.url) return [];
  if (item.kind === 'image') return [ALL_TARGETS.campaign, ALL_TARGETS.generator, ALL_TARGETS.schedule];
  if (item.kind === 'video') return [ALL_TARGETS.campaign, ALL_TARGETS.schedule];
  return [ALL_TARGETS.campaign];
}

export function formatMediaDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime()) || d.getTime() === 0) return 'Sin fecha';
  return d.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Índice vecino con vuelta al otro extremo (visor ←/→). */
export function stepIndex(current: number, delta: 1 | -1, length: number): number {
  if (length <= 0) return -1;
  return (current + delta + length) % length;
}
