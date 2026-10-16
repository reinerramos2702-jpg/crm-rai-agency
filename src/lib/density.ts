/**
 * Densidad de la interfaz (módulo puro, sin DOM ni almacenamiento).
 * El almacenamiento y el atributo `data-density` los gestiona `DensityToggle`
 * y el script de `<head>` de `src/app/layout.tsx`.
 */

export type Density = 'compact' | 'comfortable' | 'spacious';

/** Orden de presentación y de ciclo: Compacta → Estándar → Espaciosa. */
export const DENSITIES: readonly Density[] = ['compact', 'comfortable', 'spacious'];

/** Valor por defecto: equivale al aspecto actual, sin cambios visuales. */
export const DEFAULT_DENSITY: Density = 'comfortable';

/** Clave de localStorage (versionada). */
export const DENSITY_KEY = 'rai-density-v1';

/** Evento de ventana para sincronizar controles cuando cambia la densidad. */
export const DENSITY_EVENT = 'rai:density';

/** Etiquetas de interfaz en español. */
export const DENSITY_LABELS: Record<Density, string> = {
  compact: 'Compacta',
  comfortable: 'Estándar',
  spacious: 'Espaciosa',
};

/** Convierte cualquier valor desconocido en una densidad válida (por defecto, la estándar). */
export function normalizeDensity(raw: unknown): Density {
  return typeof raw === 'string' && (DENSITIES as readonly string[]).includes(raw)
    ? (raw as Density)
    : DEFAULT_DENSITY;
}

/** Siguiente densidad del ciclo (la última vuelve a la primera). */
export function nextDensity(d: Density): Density {
  const i = DENSITIES.indexOf(normalizeDensity(d));
  return DENSITIES[(i + 1) % DENSITIES.length];
}
