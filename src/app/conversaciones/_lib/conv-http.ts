/**
 * Red del módulo. Toda petición tiene un plazo: si el servidor se queda callado
 * (conexión a la base colgada, compilación lenta, red caída) se corta y la pantalla
 * muestra un error con «Reintentar» en lugar de un spinner eterno.
 */

export const REQUEST_TIMEOUT_MS = 20_000;

export class RequestTimeoutError extends Error {
  constructor() {
    super('timeout');
    this.name = 'RequestTimeoutError';
  }
}

export class HttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

interface RawResult {
  status: number;
  ok: boolean;
  text: string;
}

/** Petición con plazo que cubre cabeceras Y cuerpo (un cuerpo que no termina también cuelga). */
async function fetchText(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  fetchImpl: typeof fetch,
): Promise<RawResult> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  try {
    const res = await fetchImpl(url, { ...init, credentials: 'same-origin', signal: controller.signal });
    const text = await res.text();
    return { status: res.status, ok: res.ok, text };
  } catch (error) {
    if (timedOut) throw new RequestTimeoutError();
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function parseJson(text: string): unknown {
  return text ? JSON.parse(text) : null;
}

/** GET que devuelve el JSON sin validar (quien llama lo valida). Lanza HttpError / RequestTimeoutError. */
export async function requestJson(
  url: string,
  timeoutMs: number = REQUEST_TIMEOUT_MS,
  fetchImpl: typeof fetch = fetch,
): Promise<unknown> {
  const result = await fetchText(url, { method: 'GET' }, timeoutMs, fetchImpl);
  if (!result.ok) throw new HttpError(result.status, `HTTP ${result.status}`);
  return parseJson(result.text);
}

/** Mensaje en español para un fallo de carga. */
export function describeLoadError(error: unknown): string {
  if (error instanceof RequestTimeoutError) return 'El servidor tardó demasiado en responder.';
  if (error instanceof HttpError) {
    if (error.status === 401) return 'Tu sesión expiró. Vuelve a iniciar sesión.';
    if (error.status === 403) return 'No tienes permiso para ver esta información.';
    if (error.status === 404) return 'No se encontró la información solicitada.';
    if (error.status >= 500) return `El servidor respondió con un error (${error.status}).`;
    return `No se pudo cargar (error ${error.status}).`;
  }
  if (error instanceof SyntaxError) return 'La respuesta del servidor no es válida.';
  if (error instanceof TypeError) return 'No hay conexión con el servidor.';
  return 'No se pudo cargar la información.';
}

export type WriteResult = { ok: true; data: unknown } | { ok: false; message: string };

function serverMessage(data: unknown): string | null {
  if (typeof data !== 'object' || data === null || !('error' in data)) return null;
  return typeof data.error === 'string' && data.error.trim() ? data.error : null;
}

/** POST / PATCH / DELETE con JSON. Nunca lanza: devuelve el resultado o un mensaje listo para mostrar. */
export async function sendJson(
  url: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body?: unknown,
  timeoutMs: number = REQUEST_TIMEOUT_MS,
  fetchImpl: typeof fetch = fetch,
): Promise<WriteResult> {
  const init: RequestInit =
    body === undefined
      ? { method }
      : { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
  try {
    const result = await fetchText(url, init, timeoutMs, fetchImpl);
    let data: unknown = null;
    try {
      data = parseJson(result.text);
    } catch {
      data = null;
    }
    if (result.ok) return { ok: true, data };
    const fromServer = serverMessage(data);
    if (fromServer) return { ok: false, message: fromServer };
    if (result.status >= 500) {
      return {
        ok: false,
        message: `Error del servidor (${result.status}). Si acabas de actualizar el código, ejecuta «npx prisma generate» y reinicia el servidor.`,
      };
    }
    return { ok: false, message: describeLoadError(new HttpError(result.status, '')) };
  } catch (error) {
    return { ok: false, message: describeLoadError(error) };
  }
}
