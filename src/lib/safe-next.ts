/**
 * Valida el parámetro `?next=` de /login: solo rutas internas del mismo
 * origen. Un único validador para el middleware y la página de login, para
 * que nunca sea un redirect abierto.
 */
const ORIGIN_PROBE = 'http://internal.invalid';

function hasControlChar(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c <= 0x1f || c === 0x7f) return true;
  }
  return false;
}

export function safeNext(raw: string | null | undefined, fallback = '/'): string {
  if (!raw) return fallback;
  // Debe ser ruta absoluta de este sitio: "/x". Rechaza "//host", "/\host", esquemas ("https:", "javascript:")
  // y caracteres de control (el parser de URL los descarta y convertiría "/\t/evil.com" en "//evil.com").
  if (!raw.startsWith('/') || raw.startsWith('//')) return fallback;
  if (raw.includes('\\') || hasControlChar(raw)) return fallback;
  try {
    // Defensa en profundidad: lo que el navegador resolvería debe seguir en el mismo origen.
    if (new URL(raw, ORIGIN_PROBE).origin !== ORIGIN_PROBE) return fallback;
  } catch {
    return fallback;
  }
  return raw;
}
