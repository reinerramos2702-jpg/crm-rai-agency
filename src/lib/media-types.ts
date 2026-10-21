/**
 * Tipos compartidos de la biblioteca de contenido multimedia.
 * Sin dependencias de React ni de Prisma: los usan la ruta /api/media, la
 * lógica pura (media-*.ts) y la pantalla.
 */

export type MediaKind = 'image' | 'video' | 'audio' | 'document';

/** De dónde sale el activo. «reference» vive solo en el navegador de quien lo añadió. */
export type MediaOrigin = 'generator' | 'campaign' | 'planner' | 'brand' | 'reference';

export const MEDIA_KINDS: readonly MediaKind[] = ['image', 'video', 'audio', 'document'];
export const MEDIA_ORIGINS: readonly MediaOrigin[] = ['generator', 'campaign', 'planner', 'brand', 'reference'];

export const KIND_LABELS: Record<MediaKind, string> = {
  image: 'Imágenes',
  video: 'Videos',
  audio: 'Audio',
  document: 'Documentos',
};

export const KIND_SINGULAR: Record<MediaKind, string> = {
  image: 'Imagen',
  video: 'Video',
  audio: 'Audio',
  document: 'Documento',
};

export const ORIGIN_LABELS: Record<MediaOrigin, string> = {
  generator: 'Generador',
  campaign: 'Campaña',
  planner: 'Programación',
  brand: 'Marca',
  reference: 'Enlace',
};

export interface MediaItem {
  /** Estable entre cargas: `<origen>:<id>`. Sirve de clave para etiquetas y selección. */
  id: string;
  kind: MediaKind;
  origin: MediaOrigin;
  title: string;
  /** Contexto corto (nombre de la grilla, de la campaña…). */
  detail: string;
  /** Texto extra solo para buscar (p. ej. el prompt de la imagen). */
  note: string;
  /** Enlace público del archivo. `null` si no hay archivo descargable (documento de marca). */
  url: string | null;
  /** Extensión en minúsculas, sin punto; vacía si no se sabe. */
  ext: string;
  /** Fecha ISO de creación, programación o última actualización. */
  date: string;
  /** Dónde se creó: ruta interna del CRM o, en las referencias, el propio enlace. */
  sourceHref: string;
}

export interface MediaPayload {
  items: MediaItem[];
  /** true si alguna fuente alcanzó su tope y puede haber activos más antiguos sin listar. */
  truncated: boolean;
  generatedAt: string;
}

export interface MediaResponse extends MediaPayload {
  /** El rol actual puede subir el documento de marca con la API existente. */
  canUploadBrandDoc: boolean;
}
