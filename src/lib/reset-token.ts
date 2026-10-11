import crypto from 'node:crypto';

/** Vigencia del enlace de recuperación. */
export const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

/** Token aleatorio de 256 bits, seguro para URL. Solo se envía al usuario; en DB va el hash. */
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashResetToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
