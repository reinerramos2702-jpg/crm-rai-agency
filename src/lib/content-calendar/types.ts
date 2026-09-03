/**
 * Tipos y constantes compartidas del Calendario de Contenido.
 *
 * Este archivo NO importa nada de Prisma ni de servidor — es seguro usarlo
 * desde componentes `'use client'` (misma regla que `roles-shared.ts`).
 */

export type PostStatus =
  | 'draft'
  | 'pending_approval'
  | 'scheduled'
  | 'publishing'
  | 'published'
  | 'error';

export const POST_STATUSES: PostStatus[] = [
  'draft',
  'pending_approval',
  'scheduled',
  'publishing',
  'published',
  'error',
];

/** #3 Estado por color: visible de un vistazo en la tarjeta. */
export const STATUS_META: Record<
  PostStatus,
  { label: string; badge: string; color: string; help: string }
> = {
  draft: {
    label: 'Borrador',
    badge: 'badge-muted',
    color: 'var(--rai-muted)',
    help: 'Todavía no está programado. Ponle fecha para que entre a la cola de publicación.',
  },
  pending_approval: {
    label: 'Por aprobar',
    badge: 'badge-warning',
    color: 'var(--rai-warning)',
    help: 'Alguien del equipo lo subió y espera el visto bueno del dueño de la cuenta.',
  },
  scheduled: {
    label: 'Programado',
    badge: 'badge-gold',
    color: 'var(--rai-gold)',
    help: 'Listo y en cola. Se publicará solo a la hora indicada.',
  },
  publishing: {
    label: 'Publicando',
    badge: 'badge-purple',
    color: 'var(--rai-purple)',
    help: 'Se está subiendo a la red ahora mismo. Puede tardar hasta un minuto en videos.',
  },
  published: {
    label: 'Publicado',
    badge: 'badge-success',
    color: 'var(--rai-success)',
    help: 'Ya está en vivo. Toca el enlace para verlo en la red.',
  },
  error: {
    label: 'Error',
    badge: 'badge-error',
    color: 'var(--rai-error)',
    help: 'No se pudo publicar. Abre la tarjeta para ver el motivo exacto y reintentar.',
  },
};

export type Network = 'instagram' | 'facebook';

export const NETWORKS: { id: Network; label: string; color: string }[] = [
  { id: 'instagram', label: 'Instagram', color: '#E1306C' },
  { id: 'facebook', label: 'Facebook', color: '#1877F2' },
];

export type MediaType = 'image' | 'carousel' | 'reel' | 'video';

export const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  image: 'Imagen',
  carousel: 'Carrusel',
  reel: 'Reel',
  video: 'Video',
};

/** #9 Reintento inteligente: se reintenta solo, y solo se avisa tras 2 fallos. */
export const MAX_PUBLISH_ATTEMPTS = 3;
export const NOTIFY_AFTER_ATTEMPTS = 2;
/** Espera antes de cada reintento (minutos), por número de intento fallido. */
export const RETRY_BACKOFF_MINUTES = [5, 20];

export interface PostMediaDTO {
  id: string;
  url: string;
  thumbUrl: string | null;
  kind: 'image' | 'video';
  mimeType: string | null;
  fileName: string | null;
  width: number | null;
  height: number | null;
  durationSec: number | null;
  sortIndex: number;
  clipFromSec: number | null;
  clipToSec: number | null;
}

export interface PostDTO {
  id: string;
  title: string | null;
  caption: string | null;
  inBank: boolean;
  scheduledFor: string | null;
  /** Día 'YYYY-MM-DD' en la zona del calendario (calculado en el servidor). */
  day: string | null;
  /** Hora 'HH:mm' en la zona del calendario. */
  time: string | null;
  sortIndex: number;
  status: PostStatus;
  networks: Network[];
  mediaType: MediaType;
  approvedAt: string | null;
  rejectionNote: string | null;
  publishAttempts: number;
  lastError: string | null;
  nextRetryAt: string | null;
  publishedAt: string | null;
  publishResult: Record<string, { mediaId?: string; permalink?: string; error?: string }> | null;
  isDemo: boolean;
  media: PostMediaDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface CalendarSettingsDTO {
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
  onboardingCompletedAt: string | null;
}

export interface BlackoutDTO {
  id: string;
  day: string;
  reason: string | null;
}

/** #17 Indicador de racha: días consecutivos con contenido publicado. */
export interface StreakDTO {
  current: number;
  best: number;
  lastPublishedDay: string | null;
  /** Días del último mes con al menos una publicación (para el mini-heatmap). */
  publishedDays: string[];
}

/** Motivos por los que un día no admite más contenido. */
export type DayBlockReason = 'blackout' | 'limit' | null;

/** #19 Tooltip contextual por botón — un texto por acción, en un solo lugar. */
export const TIPS = {
  newPost:
    'Crea una tarjeta nueva en el día seleccionado. Ejemplo: subes la foto del plato del día y la programas para las 6pm.',
  bulkUpload:
    'Arrastra varios archivos de una vez y se reparten solos en los próximos días libres. Ejemplo: sueltas 10 fotos y quedan 10 días de contenido programado.',
  duplicate:
    'Copia esta tarjeta con su texto y sus imágenes a otro día. Útil para repetir un formato que ya funcionó.',
  publishNow:
    'Publica esta tarjeta en las redes marcadas ahora mismo, sin esperar a la hora programada.',
  approve:
    'Da el visto bueno para que la tarjeta entre a la cola de publicación. Solo el dueño de la cuenta puede aprobar.',
  reject:
    'Devuelve la tarjeta al equipo con un comentario. No se publica hasta que la corrijan y la vuelvan a enviar.',
  aiCaption:
    'La IA mira tu imagen y escribe un caption que puedes editar. Ejemplo: subes una foto del local y te propone el texto con hashtags.',
  bestTime:
    'Sugiere la mejor hora según cuándo tus publicaciones anteriores funcionaron mejor. Ejemplo: te dice "los martes a las 7pm".',
  videoCuts:
    'Sube un video largo y la IA propone 3 cortes para reel o carrusel. Ejemplo: de un video de 5 minutos saca 3 clips de 20 segundos.',
  bank: 'Guarda piezas aprobadas sin fecha. Arrástralas al calendario cuando las necesites.',
  blackout:
    'Marca un día como "sin publicación" (feriado, cierre, luto). Ese día queda bloqueado y no acepta tarjetas.',
  frequency:
    'Máximo de publicaciones por día. Ejemplo: si pones 2, el sistema no deja programar una tercera en el mismo día.',
  brandFrame:
    'Los colores con los que el cliente ve sus tarjetas y el preview de feed. Ejemplo: si su marca es verde, el marco se pone verde.',
  streak:
    'Días seguidos publicando sin saltarte ninguno. Es el hábito que más mueve el alcance.',
  monthView: 'Vista de mes para planear a lo grande. La vista de semana es para el día a día.',
  preview:
    'Así se va a ver en el feed real antes de publicarlo, con el marco del teléfono y los colores de la marca.',
  timezone:
    'Todas las horas del calendario se leen en esta zona. Cambiarla mueve la vista, no reprograma lo ya publicado.',
} as const;
