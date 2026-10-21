import crypto from 'node:crypto';

/**
 * Hashing de contraseñas con scrypt nativo de Node (crypto.scryptSync).
 * No agrega dependencias (bcryptjs no está en package.json) y scrypt es el
 * KDF recomendado por OWASP para passwords. Formato almacenado:
 *   scrypt:<salt hex>:<derived key hex>
 * El salt es aleatorio por usuario (16 bytes) y el derived key de 64 bytes.
 */

const SCRYPT_KEYLEN = 64;
const SCRYPT_OPTS = { N: 16384, r: 8, p: 1 } as const;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, SCRYPT_KEYLEN, SCRYPT_OPTS);
  return `scrypt:${salt}:${derived.toString('hex')}`;
}

/**
 * Verifica un password contra un hash almacenado. Comparación en tiempo
 * constante (timingSafeEqual) para no filtrar por timing si el hash es
 * correcto. Devuelve false ante cualquier formato inválido (fail-closed).
 */
export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split(':');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  try {
    const derived = crypto.scryptSync(password, salt, SCRYPT_KEYLEN, SCRYPT_OPTS);
    const expected = Buffer.from(hash, 'hex');
    return expected.length === derived.length && crypto.timingSafeEqual(expected, derived);
  } catch {
    return false;
  }
}