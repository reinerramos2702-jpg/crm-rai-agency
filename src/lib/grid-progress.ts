/**
 * Progreso de una grilla semanal: estado por pieza (idea, copy, imagen, lista)
 * y avance total. Lógica pura, sin React ni red, para poder probarla.
 */

/** Mínimo de slides con imagen para dar un carrusel por terminado. */
export const SLIDES_TARGET = 4;
/** Máximo de slides por carrusel que maneja el wizard. */
export const SLIDES_MAX = 5;
/** Un copy más corto que esto se considera borrador. */
export const COPY_DRAFT_MAX = 40;

export type StageState = 'todo' | 'partial' | 'done';

export interface ProgressTheme {
  title?: string;
  category?: string;
  caption?: string;
}

export interface ProgressAsset {
  themeIndex: number;
  slideNumber: number;
}

export interface PieceStatus {
  index: number;
  idea: StageState;
  copy: StageState;
  image: StageState;
  imageCount: number;
  /** Idea, copy e imagen completos. */
  ready: boolean;
  /** Avance de la pieza entre 0 y 1. */
  score: number;
}

export interface GridProgress {
  pieces: PieceStatus[];
  /** 0–100. */
  percent: number;
  readyCount: number;
  ideaCount: number;
  copyCount: number;
  imagesTotal: number;
}

export function pieceStatus(theme: ProgressTheme | undefined, imageCount: number, index = 0): PieceStatus {
  const title = theme?.title?.trim() ?? '';
  const caption = theme?.caption?.trim() ?? '';
  const images = Math.max(0, Math.floor(imageCount));

  const idea: StageState = title ? 'done' : 'todo';
  const copy: StageState = !caption ? 'todo' : caption.length < COPY_DRAFT_MAX ? 'partial' : 'done';
  const image: StageState = images === 0 ? 'todo' : images < SLIDES_TARGET ? 'partial' : 'done';

  const score =
    ((idea === 'done' ? 1 : 0) + (copy === 'done' ? 1 : copy === 'partial' ? 0.5 : 0) + Math.min(images, SLIDES_TARGET) / SLIDES_TARGET) / 3;

  return {
    index,
    idea,
    copy,
    image,
    imageCount: images,
    ready: idea === 'done' && copy === 'done' && image === 'done',
    score,
  };
}

/** Cuenta las imágenes de cada tema; un mismo slide repetido cuenta una vez. */
export function countImagesByTheme(assets: readonly ProgressAsset[], total: number): number[] {
  const seen = Array.from({ length: total }, () => new Set<number>());
  for (const a of assets) {
    if (a.themeIndex >= 0 && a.themeIndex < total) seen[a.themeIndex].add(a.slideNumber);
  }
  return seen.map((s) => s.size);
}

export function gridProgress(
  themes: readonly ProgressTheme[],
  assets: readonly ProgressAsset[],
  total = 7,
): GridProgress {
  const size = Math.max(1, Math.floor(total));
  const counts = countImagesByTheme(assets, size);
  const pieces = Array.from({ length: size }, (_, i) => pieceStatus(themes[i], counts[i], i));
  const sum = pieces.reduce((acc, p) => acc + p.score, 0);
  return {
    pieces,
    percent: Math.round((sum / size) * 100),
    readyCount: pieces.filter((p) => p.ready).length,
    ideaCount: pieces.filter((p) => p.idea === 'done').length,
    copyCount: pieces.filter((p) => p.copy !== 'todo').length,
    imagesTotal: counts.reduce((acc, n) => acc + n, 0),
  };
}

/** Etiqueta legible de un estado, para lectores de pantalla y tooltips. */
export function stageLabel(state: StageState): string {
  return state === 'done' ? 'completo' : state === 'partial' ? 'en curso' : 'pendiente';
}
