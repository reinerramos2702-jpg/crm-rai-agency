import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpError, RequestTimeoutError, describeLoadError, requestJson, sendJson } from './conv-http';

afterEach(() => {
  vi.useRealTimers();
});

/** fetch falso que no responde nunca, pero respeta la señal de aborto como el real. */
function hangingFetch(): typeof fetch {
  return (_url, init) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    });
}

function jsonFetch(status: number, body: unknown): typeof fetch {
  return () => Promise.resolve(new Response(typeof body === 'string' ? body : JSON.stringify(body), { status }));
}

describe('requestJson', () => {
  it('devuelve el JSON recibido', async () => {
    await expect(requestJson('/x', 1000, jsonFetch(200, { contacts: [] }))).resolves.toEqual({ contacts: [] });
  });
  it('lanza HttpError con el estado', async () => {
    await expect(requestJson('/x', 1000, jsonFetch(401, { error: 'Unauthorized' }))).rejects.toMatchObject({ status: 401 });
  });
  it('lanza SyntaxError si el cuerpo no es JSON (p. ej. página de login)', async () => {
    await expect(requestJson('/x', 1000, jsonFetch(200, '<html>login</html>'))).rejects.toBeInstanceOf(SyntaxError);
  });
  it('corta una petición colgada con RequestTimeoutError (causa del spinner infinito)', async () => {
    vi.useFakeTimers();
    const pending = requestJson('/api/contacts', 5000, hangingFetch());
    const assertion = expect(pending).rejects.toBeInstanceOf(RequestTimeoutError);
    await vi.advanceTimersByTimeAsync(5001);
    await assertion;
  });
  it('corta también un cuerpo que no termina de llegar', async () => {
    vi.useFakeTimers();
    const stalledBody: typeof fetch = (_url, init) => {
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          init?.signal?.addEventListener('abort', () => controller.error(new DOMException('Aborted', 'AbortError')));
        },
      });
      return Promise.resolve(new Response(body, { status: 200 }));
    };
    const pending = requestJson('/x', 3000, stalledBody);
    const assertion = expect(pending).rejects.toBeInstanceOf(RequestTimeoutError);
    await vi.advanceTimersByTimeAsync(3001);
    await assertion;
  });
});

describe('sendJson', () => {
  it('devuelve los datos si el servidor acepta', async () => {
    await expect(sendJson('/x', 'POST', { a: 1 }, 1000, jsonFetch(200, { ok: true }))).resolves.toEqual({ ok: true, data: { ok: true } });
  });
  it('usa el mensaje de error del servidor', async () => {
    await expect(sendJson('/x', 'POST', {}, 1000, jsonFetch(400, { error: 'name es requerido' }))).resolves.toEqual({
      ok: false,
      message: 'name es requerido',
    });
  });
  it('explica un 500 con cuerpo HTML', async () => {
    const res = await sendJson('/x', 'POST', {}, 1000, jsonFetch(500, '<html>boom</html>'));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toContain('500');
  });
  it('no lanza ante fallos de red', async () => {
    const down: typeof fetch = () => Promise.reject(new TypeError('Failed to fetch'));
    await expect(sendJson('/x', 'DELETE', undefined, 1000, down)).resolves.toEqual({
      ok: false,
      message: 'No hay conexión con el servidor.',
    });
  });
  it('devuelve un mensaje de plazo agotado', async () => {
    vi.useFakeTimers();
    const pending = sendJson('/x', 'POST', {}, 2000, hangingFetch());
    await vi.advanceTimersByTimeAsync(2001);
    await expect(pending).resolves.toEqual({ ok: false, message: 'El servidor tardó demasiado en responder.' });
  });
});

describe('describeLoadError', () => {
  it('traduce cada familia de error', () => {
    expect(describeLoadError(new RequestTimeoutError())).toContain('tardó demasiado');
    expect(describeLoadError(new HttpError(401, ''))).toContain('sesión');
    expect(describeLoadError(new HttpError(403, ''))).toContain('permiso');
    expect(describeLoadError(new HttpError(500, ''))).toContain('500');
    expect(describeLoadError(new SyntaxError('x'))).toContain('no es válida');
    expect(describeLoadError(new TypeError('x'))).toContain('conexión');
    expect(describeLoadError('algo')).toContain('No se pudo');
  });
});
