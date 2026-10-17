// Utilidades PURAS de navegación por pestañas (sin React ni DOM): se prueban con Vitest.

/** Índice de la pestaña a la que lleva una tecla de flecha/Inicio/Fin; null si la tecla no navega. */
export function nextTabIndex(key: string, current: number, length: number): number | null {
  if (length <= 0) return null;
  const last = length - 1;
  switch (key) {
    case 'ArrowRight':
      return current >= last ? 0 : current + 1;
    case 'ArrowLeft':
      return current <= 0 ? last : current - 1;
    case 'Home':
      return 0;
    case 'End':
      return last;
    default:
      return null;
  }
}

export interface IndicatorBox {
  /** Desplazamiento horizontal desde el borde izquierdo del contenido, en px. */
  x: number;
  /** Ancho visible del subrayado, en px. */
  w: number;
}

/**
 * Transform del subrayado animado. El elemento mide 1 px de ancho con origen a la izquierda,
 * así que `scaleX(w)` lo estira al ancho de la pestaña y solo se anima `transform`.
 */
export function indicatorTransform({ x, w }: IndicatorBox): string {
  const safeX = Number.isFinite(x) ? Math.max(0, Math.round(x * 100) / 100) : 0;
  const safeW = Number.isFinite(w) ? Math.max(0, Math.round(w * 100) / 100) : 0;
  return `translateX(${safeX}px) scaleX(${safeW})`;
}

/** Posición de scroll que deja la pestaña activa centrada, acotada al recorrido real. */
export function centerScrollLeft(tabLeft: number, tabWidth: number, viewWidth: number, contentWidth: number): number {
  const target = tabLeft + tabWidth / 2 - viewWidth / 2;
  const max = Math.max(0, contentWidth - viewWidth);
  return Math.min(max, Math.max(0, Math.round(target)));
}

export interface EdgeState {
  start: boolean;
  end: boolean;
}

/** Indica si queda contenido oculto a cada lado (para los degradados de borde). Tolerancia de 2 px. */
export function scrollEdges(scrollLeft: number, viewWidth: number, contentWidth: number): EdgeState {
  return {
    start: scrollLeft > 2,
    end: scrollLeft + viewWidth < contentWidth - 2,
  };
}

/** Ids estables de pestaña y panel para ARIA (`aria-controls` / `aria-labelledby`). */
export function tabDomId(prefix: string, id: string): string {
  return `${prefix}-tab-${id}`;
}
export function panelDomId(prefix: string): string {
  return `${prefix}-panel`;
}
