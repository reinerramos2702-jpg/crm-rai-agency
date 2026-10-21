/**
 * Prepara el envío de una grilla al planificador de Instagram
 * (POST /api/content-planner/schedule). Valida en el cliente con las mismas
 * reglas que el servidor para mostrar, antes de confirmar, qué se enviará y qué no.
 */
import { CAPTION_MAX, MAX_CAROUSEL, isPublicHttpsUrl, type MediaType, type PublishMode } from './scheduled-posts';

export interface SchedulePiece {
  day: number;
  title: string;
  caption: string;
  imageUrls: string[];
}

export interface ScheduleRow {
  day: number;
  title: string;
  date: string;
  caption: string;
  mediaUrls: string[];
  mediaType: MediaType;
  /** Motivo por el que no se enviará; `null` si va en el lote. */
  skipReason: string | null;
  /** Imágenes descartadas por no tener URL pública https. */
  droppedImages: number;
}

export function campaignRefFor(gridId: string): string {
  return `generador-${gridId}`.slice(0, 100);
}

/** Suma `days` a una fecha YYYY-MM-DD sin depender de la zona horaria. */
export function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Fecha local de hoy (+ offset de días) en formato YYYY-MM-DD. */
export function localIsoDate(offsetDays = 0, now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return addDaysIso(`${y}-${m}-${d}`, offsetDays);
}

export function prepareSchedule(pieces: readonly SchedulePiece[], startDate: string, mode: PublishMode): ScheduleRow[] {
  return pieces.map((piece, i) => {
    const caption = piece.caption.trim();
    const publicUrls = piece.imageUrls.filter((u) => isPublicHttpsUrl(u));
    const droppedImages = piece.imageUrls.length - publicUrls.length;
    const mediaUrls = publicUrls.slice(0, MAX_CAROUSEL);
    const mediaType: MediaType = mediaUrls.length > 1 ? 'carousel' : 'image';

    let skipReason: string | null = null;
    if (!caption) skipReason = 'Sin copy';
    else if (caption.length > CAPTION_MAX) skipReason = `El copy supera ${CAPTION_MAX} caracteres`;
    else if (mode === 'live' && mediaUrls.length === 0) skipReason = 'Faltan imágenes con URL pública';
    else if (mode === 'live' && droppedImages > 0) skipReason = 'Hay imágenes sin URL pública https';

    return {
      day: piece.day,
      title: piece.title,
      date: addDaysIso(startDate, i),
      caption,
      mediaUrls,
      mediaType,
      skipReason,
      droppedImages,
    };
  });
}

/** Cuerpo del POST: solo las filas que se enviarán. */
export function buildSchedulePayload(gridId: string, rows: readonly ScheduleRow[]) {
  return {
    campaignRef: campaignRefFor(gridId),
    posts: rows
      .filter((r) => r.skipReason === null)
      .map((r) => ({ day: r.day, date: r.date, caption: r.caption, mediaType: r.mediaType, mediaUrls: r.mediaUrls })),
  };
}
