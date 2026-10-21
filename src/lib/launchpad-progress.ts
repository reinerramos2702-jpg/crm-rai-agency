// Lógica pura (sin React) del progreso de /launchpad: siguiente paso, porcentajes
// y detección de hitos por transición. La UI vive en src/app/launchpad/.

export interface ProgressItem {
  id: string;
}

export interface ProgressCategory {
  id: string;
  items: readonly ProgressItem[];
}

export interface NextStep<C extends ProgressCategory> {
  category: C;
  item: C['items'][number];
}

export interface MilestoneResult {
  /** Ids que pasaron de pendiente a completado entre `prev` y `next`. */
  newlyDone: string[];
  /** Categorías que no estaban completas en `prev` y sí lo están en `next`. */
  categoriesCompleted: string[];
  /** true si todos los pasos quedaron completos en `next` y antes no lo estaban. */
  overallCompleted: boolean;
}

function isCategoryComplete(category: ProgressCategory, done: ReadonlySet<string>): boolean {
  return category.items.length > 0 && category.items.every((i) => done.has(i.id));
}

/** Cantidad de pasos completados de una categoría (ignora ids ajenos a ella). */
export function countCompleted(category: ProgressCategory, completed: readonly string[]): number {
  const done = new Set(completed);
  return category.items.filter((i) => done.has(i.id)).length;
}

/** Porcentaje entero (0–100) de una categoría; 0 si no tiene pasos. */
export function categoryPercent(category: ProgressCategory, completed: readonly string[]): number {
  if (category.items.length === 0) return 0;
  return Math.round((countCompleted(category, completed) / category.items.length) * 100);
}

/** Primer paso pendiente en el orden de la guía, con su categoría; undefined si todo está completo (o no hay pasos). */
export function computeNextStep<C extends ProgressCategory>(
  categories: readonly C[],
  completed: readonly string[],
): NextStep<C> | undefined {
  const done = new Set(completed);
  for (const category of categories) {
    const item = category.items.find((i) => !done.has(i.id));
    if (item) return { category, item: item as C['items'][number] };
  }
  return undefined;
}

/**
 * Compara dos estados de `completed` y devuelve qué hitos se alcanzaron en la
 * transición. Con `prev` igual a `next` (o ya completos) no hay hitos: solo
 * celebra el cambio, nunca un estado inicial.
 */
export function detectMilestone(
  prev: readonly string[],
  next: readonly string[],
  categories: readonly ProgressCategory[],
): MilestoneResult {
  const before = new Set(prev);
  const after = new Set(next);
  const newlyDone = [...after].filter((id) => !before.has(id));
  const categoriesCompleted = categories
    .filter((c) => !isCategoryComplete(c, before) && isCategoryComplete(c, after))
    .map((c) => c.id);
  const withItems = categories.filter((c) => c.items.length > 0);
  const allBefore = withItems.length > 0 && withItems.every((c) => isCategoryComplete(c, before));
  const allAfter = withItems.length > 0 && withItems.every((c) => isCategoryComplete(c, after));
  return { newlyDone, categoriesCompleted, overallCompleted: allAfter && !allBefore };
}
