import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PUBLIC_PATHS, PUBLIC_PREFIXES, isPublicPath } from '../public-paths';

describe('isPublicPath — segmento exacto o prefijo con barra', () => {
  it.each(['/login', '/registro', '/recuperar', '/restablecer', '/terminos', '/privacidad', '/book/mi-hotel', '/go/abc'])(
    '%s es pública',
    (p) => expect(isPublicPath(p)).toBe(true),
  );

  it.each(['/', '/marketing', '/campaign/new', '/loginx', '/login-admin', '/registrado', '/booking', '/book', '/goto/x', '/settings'])(
    '%s es privada (nada de startsWith simple)',
    (p) => expect(isPublicPath(p)).toBe(false),
  );

  it('la lista pública es la esperada por producto', () => {
    expect([...PUBLIC_PATHS]).toEqual(['/login', '/registro', '/recuperar', '/restablecer', '/terminos', '/privacidad']);
    expect([...PUBLIC_PREFIXES]).toEqual(['/book/', '/go/']);
  });
});

describe('fuente única de rutas públicas', () => {
  it('client-api.ts usa public-paths y no define su propia lista', () => {
    const src = readFileSync(join(process.cwd(), 'src/lib/client-api.ts'), 'utf8');
    expect(src).toContain("from './public-paths'");
    expect(src).not.toMatch(/PUBLIC_PATHS\s*=/);
  });

  it('el middleware usa public-paths y no define su propia lista', () => {
    const src = readFileSync(join(process.cwd(), 'src/middleware.ts'), 'utf8');
    expect(src).toContain("from '@/lib/public-paths'");
    expect(src).not.toMatch(/PUBLIC_PATHS\s*=/);
  });
});
