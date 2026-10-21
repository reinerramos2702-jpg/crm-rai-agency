// Preferencias locales de la Guía de Inicio (por navegador): pasos pospuestos,
// filtro y categorías completadas plegadas. Lógica pura; el acceso a
// localStorage lo hace la página DENTRO de un efecto (hidratación).

export const LAUNCHPAD_PREFS_KEY = 'rai-launchpad-prefs-v1';

export type LaunchpadFilter = 'pending' | 'all';

export interface LaunchpadPrefs {
  /** Ids de pasos pospuestos («Más tarde»): no se sugieren como siguiente paso. */
  skipped: string[];
  filter: LaunchpadFilter;
  /** Agrupa las categorías ya completadas en un bloque plegado. */
  doneCollapsed: boolean;
}

export const DEFAULT_LAUNCHPAD_PREFS: LaunchpadPrefs = { skipped: [], filter: 'pending', doneCollapsed: true };

/** Lee preferencias guardadas; descarta ids desconocidos y valores corruptos. */
export function parseLaunchpadPrefs(raw: string | null | undefined, validIds: readonly string[]): LaunchpadPrefs {
  if (!raw) return { ...DEFAULT_LAUNCHPAD_PREFS, skipped: [] };
  try {
    const data = JSON.parse(raw) as Partial<LaunchpadPrefs> | null;
    const valid = new Set(validIds);
    const skipped = Array.isArray(data?.skipped)
      ? Array.from(new Set(data.skipped.filter((id): id is string => typeof id === 'string' && valid.has(id))))
      : [];
    return {
      skipped,
      filter: data?.filter === 'all' ? 'all' : 'pending',
      doneCollapsed: typeof data?.doneCollapsed === 'boolean' ? data.doneCollapsed : DEFAULT_LAUNCHPAD_PREFS.doneCollapsed,
    };
  } catch {
    return { ...DEFAULT_LAUNCHPAD_PREFS, skipped: [] };
  }
}

export function serializeLaunchpadPrefs(prefs: LaunchpadPrefs): string {
  return JSON.stringify(prefs);
}

/** Pospone el paso, o lo retoma si ya estaba pospuesto. */
export function toggleSkipped(prefs: LaunchpadPrefs, id: string): LaunchpadPrefs {
  const skipped = prefs.skipped.includes(id) ? prefs.skipped.filter((x) => x !== id) : [...prefs.skipped, id];
  return { ...prefs, skipped };
}

export type StepState = 'done' | 'skipped' | 'pending';

/** Un paso completado nunca figura como pospuesto. */
export function stepState(id: string, completed: readonly string[], skipped: readonly string[]): StepState {
  if (completed.includes(id)) return 'done';
  if (skipped.includes(id)) return 'skipped';
  return 'pending';
}

/**
 * Con filtro «pendientes» se ocultan los completados; con «todos» se ve la lista entera.
 * `keep` mantiene visibles los pasos recién marcados para que no desaparezcan bajo el cursor.
 */
export function filterItems<T extends { id: string }>(
  items: readonly T[],
  completed: readonly string[],
  filter: LaunchpadFilter,
  keep: ReadonlySet<string> = new Set(),
): T[] {
  if (filter === 'all') return [...items];
  const done = new Set(completed);
  return items.filter((i) => !done.has(i.id) || keep.has(i.id));
}

interface CategoryLike {
  id: string;
  items: readonly { id: string }[];
}

/** Separa las categorías en curso de las completas (conserva el orden de la guía). */
export function splitCategories<C extends CategoryLike>(categories: readonly C[], completed: readonly string[]) {
  const done = new Set(completed);
  const isComplete = (c: C) => c.items.length > 0 && c.items.every((i) => done.has(i.id));
  return {
    active: categories.filter((c) => !isComplete(c)),
    finished: categories.filter(isComplete),
  };
}

/**
 * Categoría con la que abrir la guía: la del primer paso pendiente no pospuesto;
 * si no hay, la del primero pendiente; si todo está completo, la primera.
 */
export function pickInitialCategory<C extends CategoryLike>(
  categories: readonly C[],
  completed: readonly string[],
  skipped: readonly string[],
): string | undefined {
  const done = new Set(completed);
  const snoozed = new Set(skipped);
  const first = (pred: (id: string) => boolean) => categories.find((c) => c.items.some((i) => pred(i.id)));
  return (first((id) => !done.has(id) && !snoozed.has(id)) ?? first((id) => !done.has(id)) ?? categories[0])?.id;
}
