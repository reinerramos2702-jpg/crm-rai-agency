export const PAGE_SIZES = [20, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

export function pageCount(total: number, size: number): number {
  return Math.max(1, Math.ceil(Math.max(0, total) / Math.max(1, size)));
}

/** Mantiene la página dentro de rango (1..pageCount). */
export function clampPage(page: number, total: number, size: number): number {
  return Math.min(Math.max(1, Math.floor(page) || 1), pageCount(total, size));
}

export function sliceFor<T>(items: readonly T[], page: number, size: number): T[] {
  const p = clampPage(page, items.length, size);
  return items.slice((p - 1) * size, p * size);
}

/** «1–20 de 134» o «0 resultados». */
export function rangeLabel(total: number, page: number, size: number): string {
  if (total <= 0) return '0 resultados';
  const p = clampPage(page, total, size);
  return `${(p - 1) * size + 1}–${Math.min(p * size, total)} de ${total}`;
}

export function isPageSize(value: number): value is PageSize {
  return PAGE_SIZES.some((s) => s === value);
}
