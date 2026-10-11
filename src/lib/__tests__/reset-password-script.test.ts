import { describe, it, expect } from 'vitest';
import { verifyPassword } from '@/lib/password';

async function loadScript() {
  const href = new URL('../../../scripts/reset-password.mjs', import.meta.url).href;
  return (await import(/* @vite-ignore */ href)) as {
    hashPasswordScrypt: (p: string) => string;
    isStagingUrl: (u: unknown) => boolean;
  };
}

describe('scripts/reset-password.mjs', () => {
  it('el hash que genera es verificable con verifyPassword de la app', async () => {
    const { hashPasswordScrypt } = await loadScript();
    const hash = hashPasswordScrypt('clave-de-prueba-123');
    expect(hash.startsWith('scrypt:')).toBe(true);
    expect(verifyPassword('clave-de-prueba-123', hash)).toBe(true);
    expect(verifyPassword('otra-clave', hash)).toBe(false);
  });

  it('solo acepta URLs con schema=staging (nunca producción)', async () => {
    const { isStagingUrl } = await loadScript();
    expect(isStagingUrl('postgresql://u:p@h:6543/postgres?pgbouncer=true&schema=staging')).toBe(true);
    expect(isStagingUrl('postgresql://u:p@h:5432/postgres?schema=staging')).toBe(true);
    expect(isStagingUrl('postgresql://u:p@h:5432/postgres?schema=public')).toBe(false);
    expect(isStagingUrl('postgresql://u:p@h:5432/postgres')).toBe(false);
    expect(isStagingUrl(undefined)).toBe(false);
  });
});
