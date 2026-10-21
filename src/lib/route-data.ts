import { prefetchJson } from './swr-cache';

/**
 * Datos que cada módulo pide al abrirse; se precargan al pasar el mouse por su enlace.
 *
 * IMPORTANTE: una URL solo debe estar aquí si el módulo la consume con
 * `useCachedJson` / `getCached` usando EXACTAMENTE la misma cadena; si la
 * página usa `fetch` directo, la precarga sería una petición a la base que
 * nadie aprovecha. Solo GET idempotentes y baratos (nunca mutaciones).
 * Las constantes viven en cada módulo (p. ej. automatizacion/types.ts,
 * pagos/payments-client.ts); aquí se repiten como texto porque `lib/` no
 * importa desde `app/`. Hay una prueba que impide duplicados y rutas mutantes.
 */
export const ROUTE_DATA: Record<string, string[]> = {
  // Contactos comparte su petición con esta caché.
  '/contactos': ['/api/contacts'],
  // Conversaciones tiene un cargador con timeout y deduplicación propios;
  // no se precarga aquí para evitar una segunda petición en clics rápidos.
  // Biblioteca multimedia (el módulo usa useCachedJson con esta URL exacta).
  '/contenido-multimedia': ['/api/media'],
  '/launchpad': ['/api/launchpad'],
  '/generador-imagenes': ['/api/content-grids', '/api/workspace/brand-doc'],
  // Lista de pagos (LIST_URL de pagos/payments-client.ts).
  '/pagos': ['/api/payments?limit=300'],
  // Flujos, ajustes y actividad (AUTOMATIONS_URL, SETTINGS_URL, RUNS_URL de automatizacion/types.ts).
  '/automatizacion': ['/api/automations', '/api/settings', '/api/automations/runs?limit=50'],
  // Lista de agentes (la página la consume con useCachedJson('/api/ai-agents')).
  '/agentes-ia': ['/api/ai-agents'],
  // Ajustes de la cuenta (el panel de equipo/claves es solo para admin: no se precarga).
  '/settings': ['/api/settings'],
};

/** Precarga los datos del módulo al que apunta `href` (si se conocen). */
export function prefetchRouteData(href: string): void {
  const urls = ROUTE_DATA[href];
  if (urls) urls.forEach((u) => prefetchJson(u));
}

/**
 * Precarga inicial en reposo: SOLO los módulos más lentos/usados, en cantidad
 * mínima (cada URL es una consulta a la base remota y compite con la página
 * actual por las conexiones). El resto se precarga al pasar el mouse.
 */
export const WARM_URLS: readonly string[] = [
  '/api/automations',
  '/api/automations/runs?limit=50',
  '/api/payments?limit=300',
  '/api/launchpad',
];

export function warmCommonData(): void {
  WARM_URLS.forEach((u) => prefetchJson(u, 60_000));
}
