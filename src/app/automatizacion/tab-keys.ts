import type React from 'react';

/**
 * Teclado de una lista de pestañas (patrón WAI-ARIA): flechas izquierda y derecha, Inicio y Fin
 * seleccionan la pestaña vecina y le pasan el foco. Las pestañas deben tener `tabIndex` 0 solo en la activa.
 */
export function handleTabKeys<T extends string>(
  e: React.KeyboardEvent,
  ids: readonly T[],
  current: T,
  select: (id: T) => void,
  domId: (id: T) => string,
): void {
  const i = ids.indexOf(current);
  if (i < 0 || ids.length === 0) return;
  let next: number;
  if (e.key === 'ArrowRight') next = (i + 1) % ids.length;
  else if (e.key === 'ArrowLeft') next = (i - 1 + ids.length) % ids.length;
  else if (e.key === 'Home') next = 0;
  else if (e.key === 'End') next = ids.length - 1;
  else return;
  e.preventDefault();
  const id = ids[next];
  select(id);
  window.requestAnimationFrame(() => document.getElementById(domId(id))?.focus());
}
