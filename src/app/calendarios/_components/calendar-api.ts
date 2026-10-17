/** Peticiones de escritura del módulo: nunca lanzan, devuelven el mensaje de error o null si todo salió bien. */

function messageFrom(data: unknown, fallback: string): string {
  if (typeof data === 'object' && data !== null && 'error' in data) {
    const err = data.error;
    if (typeof err === 'string' && err.trim()) return err;
  }
  return fallback;
}

export async function sendJson(
  url: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body?: Record<string, unknown>,
): Promise<string | null> {
  try {
    const res = await fetch(url, {
      method,
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.ok) return null;
    let data: unknown = null;
    try { data = await res.json(); } catch { data = null; }
    const fallback = res.status === 403
      ? 'Tu rol no permite esta acción.'
      : `No se pudo completar la acción (error ${res.status}).`;
    return messageFrom(data, fallback);
  } catch {
    return 'Sin conexión con el servidor. Revisa tu red e inténtalo de nuevo.';
  }
}

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/i;

/** Enlace público de reservas; null si el identificador no tiene un formato seguro. */
export function bookingUrl(origin: string, slug: string | null | undefined): string | null {
  if (!origin || !slug || !SLUG_RE.test(slug)) return null;
  return `${origin}/book/${slug}`;
}

/** Copia al portapapeles; false si el navegador no lo permite (p. ej. sin HTTPS). */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (!navigator.clipboard) return false;
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
