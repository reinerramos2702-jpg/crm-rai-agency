import { prefetchJson } from './swr-cache';

/** Datos que cada módulo pide al abrirse; se precargan al pasar el mouse por su enlace. */
export const ROUTE_DATA: Record<string, string[]> = {
  '/launchpad': ['/api/launchpad'],
  '/generador-imagenes': ['/api/content-grids', '/api/workspace/brand-doc'],
};

/** Precarga los datos del módulo al que apunta `href` (si se conocen). */
export function prefetchRouteData(href: string): void {
  const urls = ROUTE_DATA[href];
  if (urls) urls.forEach((u) => prefetchJson(u));
}

/** Precarga inicial en reposo: los módulos con más tráfico quedan listos antes del primer clic. */
export function warmCommonData(): void {
  Object.values(ROUTE_DATA).flat().forEach((u) => prefetchJson(u, 60_000));
}
