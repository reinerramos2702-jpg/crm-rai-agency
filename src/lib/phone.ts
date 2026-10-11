/**
 * Normaliza un teléfono a formato internacional E.164 (+584121234567).
 * Acepta espacios, guiones, puntos y paréntesis; "00" inicial se trata como "+".
 * Devuelve null si no es válido (debe traer código de país).
 */
export function normalizePhone(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  let v = raw.trim().replace(/[\s\-.()]/g, '');
  if (v.startsWith('00')) v = '+' + v.slice(2);
  return /^\+[1-9]\d{7,14}$/.test(v) ? v : null;
}
