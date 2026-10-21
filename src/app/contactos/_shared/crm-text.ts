/** Minúsculas sin tildes ni espacios sobrantes: base de toda búsqueda del módulo. */
export function normalize(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Hasta dos iniciales del nombre; «?» si está vacío. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1] ?? '') : '';
  return (first.charAt(0) + last.charAt(0)).toUpperCase();
}

/** «1 contacto» / «3 contactos». */
export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** Tono 0..5 estable para el avatar de un nombre (misma persona, mismo color). */
export function avatarTone(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) % 997;
  return hash % 6;
}

export const CURRENCY = 'EUR';

/** Importe con símbolo de moneda, p. ej. «12,50 €». */
export function formatMoney(value: number, currency: string = CURRENCY): string {
  const safe = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(safe);
}

/**
 * Convierte texto libre en número: acepta «1.234,50», «1,234.50», «€ 50», «50».
 * Devuelve `null` si no hay un número válido o si es negativo.
 */
export function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[^\d.,]/g, '');
  if (!cleaned) return null;
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  const decimalAt = Math.max(lastComma, lastDot);
  let normalized = cleaned;
  if (decimalAt >= 0) {
    const decimals = cleaned.length - decimalAt - 1;
    const sepCount = cleaned.split(cleaned.charAt(decimalAt)).length - 1;
    const isDecimal = decimals > 0 && decimals <= 2 && sepCount === 1;
    const intPart = cleaned.slice(0, decimalAt).replace(/[.,]/g, '');
    normalized = isDecimal ? `${intPart}.${cleaned.slice(decimalAt + 1)}` : cleaned.replace(/[.,]/g, '');
  }
  const n = Number(normalized);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Correo con forma razonable (no sustituye la validación del servidor). */
export function isEmail(value: string): boolean {
  const v = value.trim();
  const at = v.indexOf('@');
  if (at < 1 || at !== v.lastIndexOf('@')) return false;
  const domain = v.slice(at + 1);
  return domain.includes('.') && !domain.startsWith('.') && !domain.endsWith('.') && !/\s/.test(v);
}
