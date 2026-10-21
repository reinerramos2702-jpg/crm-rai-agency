import { SignJWT } from 'jose';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { config, middleware } from '../middleware';
import { SESSION_COOKIE } from '../lib/session-cookie';

const SECRET = 'test-secret-middleware-0123456789abcdef';
const enc = new TextEncoder();

async function token(opts: { secret?: string; exp?: string | number; sub?: string | null; email?: string | null } = {}) {
  const jwt = new SignJWT({ ...(opts.email === null ? {} : { email: opts.email ?? 'a@b.co' }) })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt();
  if (opts.sub !== null) jwt.setSubject(opts.sub ?? 'user-1');
  jwt.setExpirationTime(opts.exp ?? '7d');
  return jwt.sign(enc.encode(opts.secret ?? SECRET));
}

function req(path: string, cookie?: string) {
  return new NextRequest(`http://localhost:3000${path}`, cookie ? { headers: { cookie: `${SESSION_COOKIE}=${cookie}` } } : undefined);
}

const isPass = (res: Response) => res.headers.get('x-middleware-next') === '1';

describe('middleware — páginas privadas', () => {
  beforeEach(() => {
    vi.stubEnv('JWT_SECRET', SECRET);
    vi.stubEnv('DEV_BYPASS_AUTH', '');
  });
  afterEach(() => vi.unstubAllEnvs());

  it('sin cookie → 307 a /login con ?next= de la ruta original', async () => {
    const res = await middleware(req('/marketing'));
    expect(res.status).toBe(307);
    const loc = new URL(res.headers.get('location')!);
    expect(loc.pathname).toBe('/login');
    expect(loc.searchParams.get('next')).toBe('/marketing');
  });

  it('conserva la query en ?next= y no añade next para la raíz', async () => {
    const a = new URL((await middleware(req('/contactos?q=ana&page=2'))).headers.get('location')!);
    expect(a.searchParams.get('next')).toBe('/contactos?q=ana&page=2');
    const b = new URL((await middleware(req('/'))).headers.get('location')!);
    expect(b.pathname).toBe('/login');
    expect(b.searchParams.has('next')).toBe(false);
  });

  it('la redirección lleva Cache-Control: no-store', async () => {
    const res = await middleware(req('/marketing'));
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('cookie válida → pasa', async () => {
    expect(isPass(await middleware(req('/marketing', await token())))).toBe(true);
  });

  it('cookie con firma inválida (otro secreto) → redirige', async () => {
    const res = await middleware(req('/marketing', await token({ secret: 'otro-secreto-distinto-0123456789ab' })));
    expect(res.status).toBe(307);
  });

  it('cookie vencida → redirige', async () => {
    const exp = Math.floor(Date.now() / 1000) - 60;
    expect((await middleware(req('/marketing', await token({ exp })))).status).toBe(307);
  });

  it('cookie basura → redirige', async () => {
    expect((await middleware(req('/marketing', 'no-es-un-jwt'))).status).toBe(307);
  });

  it('JWT sin sub o sin email → redirige (mismos requisitos que verifyJwt)', async () => {
    expect((await middleware(req('/marketing', await token({ sub: null })))).status).toBe(307);
    expect((await middleware(req('/marketing', await token({ email: null })))).status).toBe(307);
  });

  it('sin JWT_SECRET → trata como sin sesión: redirige a /login sin lanzar error', async () => {
    const valid = await token();
    vi.stubEnv('JWT_SECRET', '');
    const res = await middleware(req('/marketing', valid));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get('location')!).pathname).toBe('/login');
  });
});

describe('middleware — rutas públicas (nunca redirigen, ni con cookie mala: sin bucle)', () => {
  beforeEach(() => vi.stubEnv('JWT_SECRET', SECRET));
  afterEach(() => vi.unstubAllEnvs());

  it.each(['/login', '/registro', '/recuperar', '/restablecer', '/terminos', '/privacidad', '/book/mi-hotel', '/go/abc'])(
    '%s pasa sin cookie',
    async (p) => expect(isPass(await middleware(req(p)))).toBe(true),
  );

  it('/login con cookie inválida o vencida pasa (no redirige a sí mismo)', async () => {
    expect(isPass(await middleware(req('/login', 'basura')))).toBe(true);
    const exp = Math.floor(Date.now() / 1000) - 60;
    expect(isPass(await middleware(req('/login?next=/marketing', await token({ exp }))))).toBe(true);
  });

  it('/loginx NO es pública', async () => {
    expect((await middleware(req('/loginx'))).status).toBe(307);
  });
});

describe('middleware — DEV_BYPASS_AUTH', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('fuera de producción deja pasar sin cookie', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('DEV_BYPASS_AUTH', 'true');
    expect(isPass(await middleware(req('/marketing')))).toBe(true);
  });

  it('en producción se ignora: sin cookie redirige', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('DEV_BYPASS_AUTH', 'true');
    vi.stubEnv('JWT_SECRET', SECRET);
    expect((await middleware(req('/marketing'))).status).toBe(307);
  });
});

describe('middleware — ?next= no abre redirección a sitios externos', () => {
  beforeEach(() => vi.stubEnv('JWT_SECRET', SECRET));
  afterEach(() => vi.unstubAllEnvs());

  it('un path con // o \\ no produce un next externo: la Location siempre es del mismo origen', async () => {
    for (const p of ['//evil.com/x', '/%5Cevil.com', '/a//b']) {
      const res = await middleware(req(p));
      const loc = new URL(res.headers.get('location')!);
      expect(loc.origin).toBe('http://localhost:3000');
      const next = loc.searchParams.get('next');
      if (next) expect(next.startsWith('//')).toBe(false);
    }
  });
});

describe('middleware — matcher (lo que NO debe interceptar)', () => {
  const re = new RegExp(`^${config.matcher[0]}$`);

  it.each(['/api/me', '/api', '/api/auth/login', '/_next/static/chunk.js', '/_next', '/robots.txt', '/favicon.ico', '/logo.svg', '/auth/login-bg-cosmos.webp', '/tutorials/manifest.json'])(
    '%s queda fuera',
    (p) => expect(re.test(p)).toBe(false),
  );

  it.each(['/', '/marketing', '/campaign/new', '/login', '/book/x', '/apiary', '/_nextish'])('%s entra al middleware', (p) =>
    expect(re.test(p)).toBe(true),
  );
});
