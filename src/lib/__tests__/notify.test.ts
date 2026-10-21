import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendPasswordReset } from '@/lib/notify';

const msg = { channel: 'email' as const, to: 'a@b.com', link: 'http://localhost:3000/restablecer?token=abc' };

describe('sendPasswordReset', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });
  afterEach(() => vi.unstubAllEnvs());

  it('email con RESEND_API_KEY + EMAIL_FROM → llama a Resend con Bearer y el enlace', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test_fake');
    vi.stubEnv('EMAIL_FROM', 'RAI <no-reply@example.com>');
    const f = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', f);
    expect(await sendPasswordReset(msg)).toEqual({ ok: true });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.headers.Authorization).toBe('Bearer re_test_fake');
    const body = JSON.parse(init.body);
    expect(body.to).toEqual(['a@b.com']);
    expect(body.text).toContain(msg.link);
    vi.unstubAllGlobals();
  });

  it('proveedor responde error → ok:false', async () => {
    vi.stubEnv('RESEND_API_KEY', 'k');
    vi.stubEnv('EMAIL_FROM', 'x@y.com');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    expect(await sendPasswordReset(msg)).toEqual({ ok: false });
    vi.unstubAllGlobals();
  });

  it('producción sin proveedor → no envía ni imprime el enlace', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    expect(await sendPasswordReset(msg)).toEqual({ ok: false });
    expect(log).not.toHaveBeenCalled();
  });

  it('desarrollo sin proveedor → imprime el enlace en consola', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    expect(await sendPasswordReset(msg)).toEqual({ ok: true });
    expect(log).toHaveBeenCalled();
  });

  it('SMS no usa Resend (proveedor pendiente)', async () => {
    vi.stubEnv('RESEND_API_KEY', 'k');
    vi.stubEnv('EMAIL_FROM', 'x@y.com');
    vi.stubEnv('NODE_ENV', 'production');
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    expect(await sendPasswordReset({ ...msg, channel: 'sms', to: '+584121234567' })).toEqual({ ok: false });
    expect(f).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
