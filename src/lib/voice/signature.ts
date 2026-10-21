/**
 * Verificación de firmas del webhook de Retell (docs.retellai.com/features/secure-webhook,
 * leído el 16 oct 2026):
 *  - Cabecera `X-Retell-Signature` con formato `v={timestamp},d={hex}`.
 *  - HMAC-SHA256 de (cuerpo CRUDO + timestamp) con la API key que tiene la insignia de webhook.
 *  - `timestamp` en milisegundos; se rechaza si difiere más de 5 minutos (anti-repetición).
 *  - Comparación en tiempo constante; hay que usar el cuerpo crudo, no el JSON reserializado.
 */
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const SIGNATURE_TOLERANCE_MS = 5 * 60 * 1000;
const HEADER_RE = /^v=(\d{10,16}),d=([0-9a-fA-F]{64})$/;

export function signRetellBody(rawBody: string, secret: string, timestampMs: number): string {
  const digest = createHmac('sha256', secret).update(rawBody + String(timestampMs)).digest('hex');
  return `v=${timestampMs},d=${digest}`;
}

export function verifyRetellSignature(
  rawBody: string,
  secret: string | null | undefined,
  header: string | null | undefined,
  nowMs: number = Date.now(),
): boolean {
  if (!secret || !header) return false;
  const m = HEADER_RE.exec(header.trim());
  if (!m) return false;
  const [, timestamp, digest] = m;
  if (Math.abs(nowMs - Number(timestamp)) > SIGNATURE_TOLERANCE_MS) return false;
  const expected = createHmac('sha256', secret).update(rawBody + timestamp).digest();
  const received = Buffer.from(digest, 'hex');
  return expected.length === received.length && timingSafeEqual(expected, received);
}

/** Igualdad de secretos en tiempo constante (compara huellas de igual longitud). */
export function secretsEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}
