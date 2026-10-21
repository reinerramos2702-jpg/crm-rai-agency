import { describe, expect, it } from 'vitest';
import { safeNext } from '../safe-next';

describe('safeNext — solo rutas internas', () => {
  it.each(['/marketing', '/campaign/new', '/contactos?x=1&y=2', '/pagos#top', '/a/b%2Fc', '/'])(
    'acepta la ruta interna %s',
    (p) => expect(safeNext(p)).toBe(p),
  );

  it.each([
    ['//evil.com', 'protocol-relative'],
    ['//evil.com/x', 'protocol-relative con ruta'],
    ['/\\evil.com', 'barra invertida'],
    ['\\\\evil.com', 'doble barra invertida'],
    ['/\t/evil.com', 'tab que el parser descarta'],
    ['/\n/evil.com', 'salto de línea'],
    ['https://evil.com', 'esquema https'],
    ['http://evil.com', 'esquema http'],
    ['javascript:alert(1)', 'esquema javascript'],
    ['JaVaScRiPt:alert(1)', 'esquema javascript en mayúsculas'],
    ['data:text/html,<script>', 'esquema data'],
    ['marketing', 'sin barra inicial'],
    ['', 'cadena vacía'],
  ])('rechaza %j (%s) y devuelve el inicio', (raw) => {
    expect(safeNext(raw)).toBe('/');
  });

  it('null y undefined devuelven el fallback', () => {
    expect(safeNext(null)).toBe('/');
    expect(safeNext(undefined)).toBe('/');
    expect(safeNext(null, '/inicio')).toBe('/inicio');
  });
});
