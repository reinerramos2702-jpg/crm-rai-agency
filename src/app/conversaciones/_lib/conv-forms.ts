/** Validaciones de formularios del módulo (puras). */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MAX_MESSAGE_LENGTH = 4000;

export function isValidEmail(value: string): boolean {
  return value.length <= 254 && EMAIL.test(value);
}

export interface NewContactInput {
  name: string;
  email: string;
  phoneLocal: string;
}

export type NewContactErrors = Partial<Record<keyof NewContactInput, string>>;

export function validateNewContact({ name, email, phoneLocal }: NewContactInput): NewContactErrors {
  const errors: NewContactErrors = {};
  if (!name.trim()) errors.name = 'El nombre es obligatorio.';
  else if (name.trim().length > 120) errors.name = 'Usa un máximo de 120 caracteres.';
  if (email.trim() && !isValidEmail(email.trim())) errors.email = 'Escribe un correo válido, por ejemplo nombre@dominio.com.';
  if (phoneLocal && (phoneLocal.length < 6 || phoneLocal.length > 15)) errors.phoneLocal = 'El número debe tener entre 6 y 15 dígitos.';
  return errors;
}

/** Deja solo dígitos (el selector de país aporta el prefijo). */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '').slice(0, 15);
}

/**
 * Normaliza el destino de un enlace de activación. Solo http(s): bloquea
 * `javascript:`, `data:` y similares. Sin esquema se asume https.
 */
export function normalizeDestination(input: string): string | null {
  const raw = input.trim();
  if (!raw || /\s/.test(raw)) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    if ((url.protocol !== 'http:' && url.protocol !== 'https:') || !url.hostname.includes('.')) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export type MinutesResult = { ok: true; value: number | null } | { ok: false };

/** Minutos de ANS: vacío = sin límite; si no, entero entre 1 y 10 080 (una semana). */
export function parseMinutes(value: string): MinutesResult {
  const raw = value.trim();
  if (!raw) return { ok: true, value: null };
  if (!/^\d{1,5}$/.test(raw)) return { ok: false };
  const n = Number(raw);
  return n >= 1 && n <= 10_080 ? { ok: true, value: n } : { ok: false };
}
