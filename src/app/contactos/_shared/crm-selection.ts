export type SelectionState = 'none' | 'some' | 'all';

/** Añade o quita un id (devuelve un conjunto nuevo). */
export function toggleId(selected: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(selected);
  if (next.has(id)) next.delete(id); else next.add(id);
  return next;
}

/** Marca o desmarca todos los ids visibles sin tocar el resto de la selección. */
export function setMany(selected: ReadonlySet<string>, ids: readonly string[], checked: boolean): Set<string> {
  const next = new Set(selected);
  for (const id of ids) { if (checked) next.add(id); else next.delete(id); }
  return next;
}

export function selectionState(selected: ReadonlySet<string>, ids: readonly string[]): SelectionState {
  if (ids.length === 0) return 'none';
  const count = ids.filter((id) => selected.has(id)).length;
  if (count === 0) return 'none';
  return count === ids.length ? 'all' : 'some';
}

/** Conserva solo los ids que siguen existiendo (tras borrar o filtrar). */
export function prune(selected: ReadonlySet<string>, valid: readonly string[]): Set<string> {
  const keep = new Set(valid);
  return new Set(Array.from(selected).filter((id) => keep.has(id)));
}
