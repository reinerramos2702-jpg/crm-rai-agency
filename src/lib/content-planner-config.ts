/**
 * Configuración del planificador de contenido (/automatizacion) por empresa.
 *
 * Vive en Settings.contentPlannerConfig (JSON) y se escribe SOLO a través de
 * sanitizeContentPlannerConfig: lista blanca de claves, tipos y topes de
 * tamaño. Nunca se guarda un objeto del cliente tal cual.
 */

export type BrandRule = { forbidden: string; replacement: string; reason: string };

export interface ContentPlannerConfig {
  igHandle: string;
  publishTime: string; // HH:MM 24h
  timezone: string; // IANA, ej. America/Bogota
  autoPublish: boolean;
  businessName: string;
  businessType: string;
  businessLocation: string;
  businessPhone: string;
  businessWhatsApp: string;
  businessWebsite: string;
  brandColors: string; // texto libre: "Azul oscuro, dorado…"
  brandTone: string;
  brandDocName: string;
  brandDocContent: string;
  photoMode: string;
  logoMode: string;
  targetAudience: string;
  services: string;
  competitors: string;
  contentNotes: string;
  brandRules: BrandRule[];
}

export const DEFAULT_PUBLISH_TIME = '09:00';
/** Zona de la operación (Venezuela, UTC-4, sin horario de verano). */
export const DEFAULT_TIMEZONE = 'America/Caracas';

export const LIMITS = {
  short: 200,
  long: 5_000,
  brandDoc: 200_000,
  rules: 100,
  ruleField: 500,
  total: 300_000,
} as const;

export const EMPTY_CONFIG: ContentPlannerConfig = {
  igHandle: '',
  publishTime: DEFAULT_PUBLISH_TIME,
  timezone: DEFAULT_TIMEZONE,
  autoPublish: false,
  businessName: '',
  businessType: '',
  businessLocation: '',
  businessPhone: '',
  businessWhatsApp: '',
  businessWebsite: '',
  brandColors: '',
  brandTone: 'amigable',
  brandDocName: '',
  brandDocContent: '',
  photoMode: 'mixed',
  logoMode: 'manual',
  targetAudience: '',
  services: '',
  competitors: '',
  contentNotes: '',
  brandRules: [],
};

const SHORT_KEYS = [
  'businessName',
  'businessType',
  'businessLocation',
  'businessPhone',
  'businessWhatsApp',
  'businessWebsite',
  'brandColors',
  'brandTone',
  'brandDocName',
  'photoMode',
  'logoMode',
] as const;

const LONG_KEYS = ['targetAudience', 'services', 'competitors', 'contentNotes'] as const;

function str(v: unknown, max: number): string | undefined {
  return typeof v === 'string' ? v.slice(0, max) : undefined;
}

export function isValidTime(v: unknown): v is string {
  if (typeof v !== 'string' || !/^\d{2}:\d{2}$/.test(v)) return false;
  const [h, m] = v.split(':').map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

export function isValidTimezone(v: unknown): v is string {
  if (typeof v !== 'string' || v.length === 0 || v.length > 64) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: v });
    return true;
  } catch {
    return false;
  }
}

/** Normaliza el @usuario: sin espacios, un solo "@" al inicio, máx. 30 chars (límite IG). */
export function normalizeIgHandle(v: string): string {
  const clean = v.trim().replace(/\s+/g, '').replace(/^@+/, '');
  if (!clean) return '';
  return `@${clean.slice(0, 30)}`;
}

/**
 * Devuelve SIEMPRE una config completa y válida (mezcla `input` válido sobre
 * `base`). Campos ausentes o inválidos conservan el valor de `base`.
 * Lanza Error si el resultado supera el tope total de tamaño.
 */
export function sanitizeContentPlannerConfig(
  input: unknown,
  base: ContentPlannerConfig = EMPTY_CONFIG,
): ContentPlannerConfig {
  const src = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const out: ContentPlannerConfig = {
    ...base,
    brandRules: base.brandRules.map((r) => ({ ...r })),
  };

  for (const k of SHORT_KEYS) {
    const v = str(src[k], LIMITS.short);
    if (v !== undefined) out[k] = v;
  }
  for (const k of LONG_KEYS) {
    const v = str(src[k], LIMITS.long);
    if (v !== undefined) out[k] = v;
  }

  const handle = str(src.igHandle, LIMITS.short);
  if (handle !== undefined) out.igHandle = normalizeIgHandle(handle);

  if (isValidTime(src.publishTime)) out.publishTime = src.publishTime;
  if (isValidTimezone(src.timezone)) out.timezone = src.timezone;
  if (typeof src.autoPublish === 'boolean') out.autoPublish = src.autoPublish;

  const doc = str(src.brandDocContent, LIMITS.brandDoc);
  if (doc !== undefined) out.brandDocContent = doc;

  if (Array.isArray(src.brandRules)) {
    out.brandRules = src.brandRules
      .slice(0, LIMITS.rules)
      .map((r) => {
        const o = (r && typeof r === 'object' ? r : {}) as Record<string, unknown>;
        return {
          forbidden: str(o.forbidden, LIMITS.ruleField) ?? '',
          replacement: str(o.replacement, LIMITS.ruleField) ?? '',
          reason: str(o.reason, LIMITS.ruleField) ?? '',
        };
      })
      .filter((r) => r.forbidden.trim() !== '' || r.replacement.trim() !== '');
  }

  if (JSON.stringify(out).length > LIMITS.total) {
    throw new Error('La configuración supera el tamaño máximo permitido');
  }
  return out;
}

/** Lee lo guardado en BD (puede ser null o JSON viejo) y devuelve config completa. */
export function parseStoredConfig(stored: unknown): ContentPlannerConfig {
  try {
    return sanitizeContentPlannerConfig(stored);
  } catch {
    return { ...EMPTY_CONFIG };
  }
}
