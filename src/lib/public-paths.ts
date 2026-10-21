/**
 * Páginas accesibles sin sesión. Fuente única para el middleware (redirige a
 * /login lo que no esté aquí) y para `client-api.ts` (un 401 en estas rutas es
 * normal y no redirige). Sin dependencias: se importa desde edge y cliente.
 */
export const PUBLIC_PATHS = ['/login', '/registro', '/recuperar', '/restablecer', '/terminos', '/privacidad'] as const;

/** Prefijos públicos con barra final: /book/<slug> (reservas) y /go/<slug> (enlaces de activación). */
export const PUBLIC_PREFIXES = ['/book/', '/go/'] as const;

/** Coincidencia por segmento exacto o prefijo con barra — nunca `startsWith` simple (`/loginx` NO es público). */
export function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return true;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}
