/**
 * Ajustes generales de voz (workspace). Validación pura con zod, sin red ni React.
 *
 * DEUDA: el esquema de Prisma no tiene dónde guardarlos por workspace (Settings solo
 * admite JSON en `contentPlannerConfig`, que pertenece al planificador). Hasta aprobar
 * una migración (`Settings.voiceSettings Json?`), la interfaz los guarda en localStorage
 * y los envía validados al activar el agente. Ver docs/planning/VOZ-RETELL-PLAN.md §9.
 */
import { z } from 'zod';
import { normalizePhone } from '../phone';
import { VOICE_LANGUAGES, WEEK_DAYS, type CallRules, type VoiceLanguageId, type VoiceSpeedId } from '../agent-wizard';

export const VOICE_SETTINGS_VERSION = 1;
export const voiceSettingsKey = (workspaceId: string): string => `rai-voice-settings-v${VOICE_SETTINGS_VERSION}:${workspaceId}`;
/** Zona de la operación (Venezuela, UTC-4, sin horario de verano). */
export const VOICE_TIMEZONE = 'America/Caracas';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const LANGUAGE_IDS = VOICE_LANGUAGES.map((l) => l.id) as [VoiceLanguageId, ...VoiceLanguageId[]];
const SPEED_IDS = ['lenta', 'normal', 'rapida'] as const satisfies readonly VoiceSpeedId[];

export const LIMITS = {
  greeting: 280,
  message: 400,
  when: 300,
  keyword: 40,
  keywords: 20,
  voiceId: 80,
  capMin: 1,
  capMax: 10_000,
  minutesMin: 1,
  minutesMax: 60,
} as const;

const text = (max: number) => z.string().trim().max(max, `Máximo ${max} caracteres.`);

export const voiceSettingsSchema = z
  .object({
    enabled: z.boolean(),
    language: z.enum(LANGUAGE_IDS),
    speed: z.enum(SPEED_IDS),
    /** `voice_id` del proveedor; vacío = la voz por defecto del entorno. */
    providerVoiceId: text(LIMITS.voiceId),
    greeting: text(LIMITS.greeting),
    aiDisclosure: z.boolean(),
    hours: z.object({
      enabled: z.boolean(),
      timezone: text(60).min(1),
      days: z.array(z.number().int().min(0).max(6)).max(7),
      from: z.string().regex(TIME_RE, 'Hora inválida (HH:MM).'),
      to: z.string().regex(TIME_RE, 'Hora inválida (HH:MM).'),
    }),
    afterHoursMessage: text(LIMITS.message),
    transfer: z.object({
      enabled: z.boolean(),
      number: text(24),
      when: text(LIMITS.when),
    }),
    recording: z.boolean(),
    monthlyCapUsd: z.number().min(LIMITS.capMin).max(LIMITS.capMax),
    maxCallMinutes: z.number().int().min(LIMITS.minutesMin).max(LIMITS.minutesMax),
    escalationKeywords: z.array(text(LIMITS.keyword).min(1)).max(LIMITS.keywords),
  })
  .superRefine((s, ctx) => {
    if (s.hours.enabled) {
      if (s.hours.days.length === 0) ctx.addIssue({ code: 'custom', path: ['hours', 'days'], message: 'Marca al menos un día de atención.' });
      if (TIME_RE.test(s.hours.from) && TIME_RE.test(s.hours.to) && s.hours.from >= s.hours.to) {
        ctx.addIssue({ code: 'custom', path: ['hours', 'to'], message: 'La hora de cierre debe ser posterior a la de apertura.' });
      }
    }
    if (s.transfer.enabled && !normalizePhone(s.transfer.number)) {
      ctx.addIssue({ code: 'custom', path: ['transfer', 'number'], message: 'Indica un número con código de país (por ejemplo +584121234567).' });
    }
  });

export type VoiceSettings = z.infer<typeof voiceSettingsSchema>;

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  enabled: false,
  language: 'es-VE',
  speed: 'normal',
  providerVoiceId: '',
  greeting: 'Hola, gracias por llamar. Soy el asistente virtual. ¿En qué puedo ayudarte?',
  aiDisclosure: true,
  hours: { enabled: true, timezone: VOICE_TIMEZONE, days: [1, 2, 3, 4, 5], from: '08:00', to: '18:00' },
  afterHoursMessage: 'Nuestro horario de atención ha terminado. Déjame tu nombre y número y te devolvemos la llamada.',
  transfer: { enabled: false, number: '', when: 'Cuando la persona pida hablar con alguien del equipo o el tema no esté en la base de conocimiento.' },
  recording: false,
  monthlyCapUsd: 25,
  maxCallMinutes: 8,
  escalationKeywords: ['reclamo', 'queja', 'emergencia', 'hablar con una persona'],
};

export interface SettingsIssue {
  field: string;
  message: string;
}

export type SettingsResult =
  | { ok: true; data: VoiceSettings }
  | { ok: false; errors: SettingsIssue[] };

/** Valida un objeto desconocido (cuerpo de una petición o dato guardado). */
export function validateVoiceSettings(raw: unknown): SettingsResult {
  const parsed = voiceSettingsSchema.safeParse(raw);
  if (parsed.success) {
    const d = parsed.data;
    const phone = d.transfer.enabled ? normalizePhone(d.transfer.number) : null;
    return {
      ok: true,
      data: { ...d, transfer: { ...d.transfer, number: phone ?? d.transfer.number } },
    };
  }
  return {
    ok: false,
    errors: parsed.error.issues.map((i) => ({ field: i.path.join('.') || 'settings', message: i.message })),
  };
}

type DeepPartial<T> = { [K in keyof T]?: T[K] extends readonly unknown[] ? T[K] : T[K] extends object ? DeepPartial<T[K]> : T[K] };

/** Mezcla un parcial con los valores por defecto (lectura tolerante de datos guardados). */
export function withDefaults(partial: DeepPartial<VoiceSettings> | null | undefined): VoiceSettings {
  const p = partial ?? {};
  const d = DEFAULT_VOICE_SETTINGS;
  return {
    ...d,
    ...p,
    hours: { ...d.hours, ...(p.hours ?? {}) },
    transfer: { ...d.transfer, ...(p.transfer ?? {}) },
  } as VoiceSettings;
}

/** Lee un dato guardado: si no valida, devuelve los valores por defecto (nunca lanza). */
export function parseStoredVoiceSettings(raw: string | null): VoiceSettings {
  if (!raw) return DEFAULT_VOICE_SETTINGS;
  try {
    const result = validateVoiceSettings(withDefaults(JSON.parse(raw) as DeepPartial<VoiceSettings>));
    return result.ok ? result.data : DEFAULT_VOICE_SETTINGS;
  } catch {
    return DEFAULT_VOICE_SETTINGS;
  }
}

/** Siembra los ajustes a partir de las reglas de llamada del asistente (sin duplicar lógica). */
export function settingsFromCallRules(
  rules: CallRules,
  extra: { language?: VoiceLanguageId; speed?: VoiceSpeedId; greeting?: string } = {},
  base: VoiceSettings = DEFAULT_VOICE_SETTINGS,
): VoiceSettings {
  return {
    ...base,
    language: extra.language ?? base.language,
    speed: extra.speed ?? base.speed,
    greeting: (extra.greeting ?? base.greeting).trim() || base.greeting,
    aiDisclosure: rules.aiDisclosure,
    recording: rules.recording,
    maxCallMinutes: Math.min(LIMITS.minutesMax, Math.max(LIMITS.minutesMin, Math.round(rules.maxMinutes))),
    afterHoursMessage: rules.afterHoursMessage.trim() || base.afterHoursMessage,
    hours: { ...base.hours, enabled: rules.hoursEnabled, from: rules.hoursFrom, to: rules.hoursTo, days: [...rules.days] },
    transfer: { ...base.transfer, enabled: rules.transferEnabled, number: rules.transferPhone.trim(), when: rules.transferWhen.trim() || base.transfer.when },
  };
}

/** ¿Estamos dentro del horario de atención? Usa la zona del ajuste (Intl, sin dependencias). */
export function isWithinBusinessHours(s: Pick<VoiceSettings, 'hours'>, now: Date = new Date()): boolean {
  if (!s.hours.enabled) return true;
  let weekday: string | undefined;
  let hh = '';
  let mm = '';
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: s.hours.timezone,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now);
    weekday = parts.find((p) => p.type === 'weekday')?.value;
    hh = parts.find((p) => p.type === 'hour')?.value ?? '';
    mm = parts.find((p) => p.type === 'minute')?.value ?? '';
  } catch {
    return true; // zona inválida: no bloquear la atención por un error de configuración
  }
  const dayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday ?? '');
  if (dayIndex < 0 || !s.hours.days.includes(dayIndex)) return false;
  const current = `${hh}:${mm}`;
  return current >= s.hours.from && current < s.hours.to;
}

/** Texto legible del horario («lunes a viernes, 08:00 a 18:00»). */
export function describeHours(s: Pick<VoiceSettings, 'hours'>): string {
  if (!s.hours.enabled) return 'Atiende a cualquier hora';
  const names = WEEK_DAYS.filter((d) => s.hours.days.includes(d.id)).map((d) => d.label.toLowerCase());
  return `${names.length ? names.join(', ') : 'sin días definidos'}, de ${s.hours.from} a ${s.hours.to} (${s.hours.timezone})`;
}
