/**
 * Lógica pura del asistente de creación de agentes de IA (chat y voz):
 * pasos, valores por defecto, validación suave, validadores de borrador y
 * composición del texto que se guarda en los campos existentes del agente.
 * Sin React ni red: se prueba con vitest.
 */

export type AgentKind = 'chat' | 'voice';

/** Versión de la forma del borrador: súbela si cambian los campos, para descartar borradores viejos. */
export const WIZARD_DRAFT_VERSION = 1;
export const wizardDraftKey = (kind: AgentKind): string => `rai-agent-wizard-${kind}-v${WIZARD_DRAFT_VERSION}`;
export const voiceConfigKey = (agentId: string): string => `rai-agent-voice-config-v${WIZARD_DRAFT_VERSION}:${agentId}`;

// ---------------------------------------------------------------------------
// Catálogos tipados
// ---------------------------------------------------------------------------

export interface Choice<T extends string = string> {
  id: T;
  label: string;
  description: string;
}

export const TONES = [
  { id: 'cercano', label: 'Cercano', description: 'Trato amable y natural, como un buen vendedor de barrio.' },
  { id: 'profesional', label: 'Profesional', description: 'Claro, seguro y directo; transmite confianza.' },
  { id: 'formal', label: 'Formal', description: 'Trato de usted, sobrio y respetuoso.' },
  { id: 'entusiasta', label: 'Entusiasta', description: 'Energía positiva para ventas y promociones.' },
  { id: 'sereno', label: 'Sereno', description: 'Pausado y empático; ideal para soporte y salud.' },
] as const satisfies readonly Choice[];
export type ToneId = (typeof TONES)[number]['id'];

export const GOALS = [
  { id: 'atencion', label: 'Atención al cliente', description: 'Resuelve dudas frecuentes y orienta sobre productos o servicios.' },
  { id: 'ventas', label: 'Ventas y captación', description: 'Califica interesados, presenta ofertas y recoge sus datos.' },
  { id: 'reservas', label: 'Reservas y citas', description: 'Consulta disponibilidad y agenda con el cliente.' },
  { id: 'soporte', label: 'Soporte posventa', description: 'Atiende incidencias, seguimiento de pedidos y garantías.' },
] as const satisfies readonly Choice[];
export type GoalId = (typeof GOALS)[number]['id'];

export const CHAT_CHANNELS = [
  'Widget de chat (SMS chat)',
  'Chat en tiempo real',
  'WhatsApp',
  'Instagram',
  'Email',
  'SMS',
] as const;

export const VOICE_LANGUAGES = [
  { id: 'es-VE', label: 'Español (Venezuela)', description: 'Acento y expresiones venezolanas.' },
  { id: 'es-419', label: 'Español neutro (Latinoamérica)', description: 'Sin regionalismos marcados.' },
  { id: 'es-ES', label: 'Español (España)', description: 'Acento peninsular.' },
  { id: 'en-US', label: 'Inglés (Estados Unidos)', description: 'Para clientes angloparlantes.' },
  { id: 'pt-BR', label: 'Portugués (Brasil)', description: 'Para clientes brasileños.' },
] as const satisfies readonly Choice[];
export type VoiceLanguageId = (typeof VOICE_LANGUAGES)[number]['id'];

export interface VoiceOption {
  id: string;
  label: string;
  gender: 'femenina' | 'masculina';
  description: string;
}

/** Catálogo de ejemplo: el proveedor real de voz se elige al conectar la telefonía. */
export const VOICES: readonly VoiceOption[] = [
  { id: 'sofia', label: 'Sofía', gender: 'femenina', description: 'Cálida y cercana' },
  { id: 'valentina', label: 'Valentina', gender: 'femenina', description: 'Clara y profesional' },
  { id: 'mateo', label: 'Mateo', gender: 'masculina', description: 'Amable y tranquilo' },
  { id: 'andres', label: 'Andrés', gender: 'masculina', description: 'Firme y seguro' },
];

export const VOICE_SPEEDS = [
  { id: 'lenta', label: 'Pausada', description: 'Ideal para datos largos y público mayor.' },
  { id: 'normal', label: 'Natural', description: 'Ritmo conversacional estándar.' },
  { id: 'rapida', label: 'Ágil', description: 'Respuestas dinámicas; ahorra tiempo de llamada.' },
] as const satisfies readonly Choice[];
export type VoiceSpeedId = (typeof VOICE_SPEEDS)[number]['id'];

export const WEEK_DAYS = [
  { id: 1, short: 'Lun', label: 'Lunes' },
  { id: 2, short: 'Mar', label: 'Martes' },
  { id: 3, short: 'Mié', label: 'Miércoles' },
  { id: 4, short: 'Jue', label: 'Jueves' },
  { id: 5, short: 'Vie', label: 'Viernes' },
  { id: 6, short: 'Sáb', label: 'Sábado' },
  { id: 0, short: 'Dom', label: 'Domingo' },
] as const;

// ---------------------------------------------------------------------------
// Pasos
// ---------------------------------------------------------------------------

export interface WizardStep {
  id: string;
  label: string;
  hint: string;
}

export const CHAT_STEPS: readonly WizardStep[] = [
  { id: 'identidad', label: 'Identidad', hint: 'Nombre y negocio' },
  { id: 'objetivo', label: 'Objetivo', hint: 'Qué debe lograr' },
  { id: 'entrenamiento', label: 'Entrenamiento', hint: 'Conocimiento y tono' },
  { id: 'canales', label: 'Canales', hint: 'Dónde responde' },
  { id: 'revisar', label: 'Revisar', hint: 'Crear y probar' },
];

export const VOICE_STEPS: readonly WizardStep[] = [
  { id: 'voz', label: 'Identidad y voz', hint: 'Idioma, tono y velocidad' },
  { id: 'objetivo', label: 'Objetivo y saludo', hint: 'Guion de bienvenida' },
  { id: 'conocimiento', label: 'Base de conocimiento', hint: 'Lo que sabe responder' },
  { id: 'reglas', label: 'Reglas de llamada', hint: 'Horario, transferencia y legal' },
  { id: 'revisar', label: 'Revisar y probar', hint: 'Simulador de llamada' },
];

export const stepsFor = (kind: AgentKind): readonly WizardStep[] => (kind === 'voice' ? VOICE_STEPS : CHAT_STEPS);

/** Porcentaje de avance al estar en el paso `index` (0 = primer paso ya cuenta como avance). */
export function progressPercent(index: number, total: number): number {
  if (total <= 0) return 0;
  const clamped = Math.min(Math.max(index, 0), total - 1);
  return Math.round(((clamped + 1) / total) * 100);
}

// ---------------------------------------------------------------------------
// Borradores
// ---------------------------------------------------------------------------

export interface ChatDraft {
  name: string;
  business: string;
  goal: GoalId;
  goalDetail: string;
  businessInfo: string;
  tone: ToneId;
  welcome: string;
  fallback: string;
  kbIds: string[];
  channels: string[];
}

export interface CallRules {
  hoursEnabled: boolean;
  hoursFrom: string;
  hoursTo: string;
  days: number[];
  afterHoursMessage: string;
  transferEnabled: boolean;
  transferPhone: string;
  transferWhen: string;
  voicemailEnabled: boolean;
  voicemailMessage: string;
  maxMinutes: number;
  aiDisclosure: boolean;
  recording: boolean;
  consent: boolean;
}

export interface VoiceDraft {
  name: string;
  business: string;
  language: VoiceLanguageId;
  voiceId: string;
  tone: ToneId;
  speed: VoiceSpeedId;
  goal: GoalId;
  goalDetail: string;
  businessInfo: string;
  greeting: string;
  kbIds: string[];
  rules: CallRules;
}

export const DEFAULT_CHAT_DRAFT: ChatDraft = {
  name: '',
  business: '',
  goal: 'atencion',
  goalDetail: '',
  businessInfo: '',
  tone: 'cercano',
  welcome: '¡Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?',
  fallback: 'No tengo esa información a la mano, pero la transfiero con el equipo para que te ayude.',
  kbIds: [],
  channels: ['Widget de chat (SMS chat)', 'Chat en tiempo real'],
};

export const DEFAULT_CALL_RULES: CallRules = {
  hoursEnabled: true,
  hoursFrom: '08:00',
  hoursTo: '18:00',
  days: [1, 2, 3, 4, 5],
  afterHoursMessage: 'Nuestro horario de atención ha terminado. Déjame tu nombre y número y te devolvemos la llamada.',
  transferEnabled: false,
  transferPhone: '',
  transferWhen: 'Cuando el cliente pida hablar con una persona o el tema no esté en la base de conocimiento.',
  voicemailEnabled: true,
  voicemailMessage: 'Puedes dejar tu mensaje después de la señal y te responderemos lo antes posible.',
  maxMinutes: 10,
  aiDisclosure: true,
  recording: false,
  consent: true,
};

export const DEFAULT_VOICE_DRAFT: VoiceDraft = {
  name: '',
  business: '',
  language: 'es-VE',
  voiceId: 'sofia',
  tone: 'profesional',
  speed: 'normal',
  goal: 'atencion',
  goalDetail: '',
  businessInfo: '',
  greeting: 'Hola, gracias por llamar. Soy el asistente virtual. ¿En qué puedo ayudarte?',
  kbIds: [],
  rules: DEFAULT_CALL_RULES,
};

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isStrArray = (v: unknown): v is string[] => Array.isArray(v) && v.every(isStr);
const isNumArray = (v: unknown): v is number[] => Array.isArray(v) && v.every((n) => typeof n === 'number');
const oneOf = (list: readonly { id: string }[], v: unknown): boolean => isStr(v) && list.some((x) => x.id === v);

export function isCallRules(v: unknown): v is CallRules {
  if (!isRecord(v)) return false;
  return (
    typeof v.hoursEnabled === 'boolean' && isStr(v.hoursFrom) && isStr(v.hoursTo) && isNumArray(v.days) &&
    isStr(v.afterHoursMessage) && typeof v.transferEnabled === 'boolean' && isStr(v.transferPhone) &&
    isStr(v.transferWhen) && typeof v.voicemailEnabled === 'boolean' && isStr(v.voicemailMessage) &&
    typeof v.maxMinutes === 'number' && typeof v.aiDisclosure === 'boolean' &&
    typeof v.recording === 'boolean' && typeof v.consent === 'boolean'
  );
}

export function isChatDraft(v: unknown): v is ChatDraft {
  if (!isRecord(v)) return false;
  return (
    isStr(v.name) && isStr(v.business) && oneOf(GOALS, v.goal) && isStr(v.goalDetail) && isStr(v.businessInfo) &&
    oneOf(TONES, v.tone) && isStr(v.welcome) && isStr(v.fallback) && isStrArray(v.kbIds) && isStrArray(v.channels)
  );
}

export function isVoiceDraft(v: unknown): v is VoiceDraft {
  if (!isRecord(v)) return false;
  return (
    isStr(v.name) && isStr(v.business) && oneOf(VOICE_LANGUAGES, v.language) && isStr(v.voiceId) &&
    oneOf(TONES, v.tone) && oneOf(VOICE_SPEEDS, v.speed) && oneOf(GOALS, v.goal) && isStr(v.goalDetail) &&
    isStr(v.businessInfo) && isStr(v.greeting) && isStrArray(v.kbIds) && isCallRules(v.rules)
  );
}

// ---------------------------------------------------------------------------
// Validación suave
// ---------------------------------------------------------------------------

export interface StepIssue {
  field: string;
  message: string;
  /** `error` bloquea el avance; `warn` solo avisa. */
  level: 'error' | 'warn';
}

const PHONE_RE = /^\+?[0-9][0-9\s().-]{6,19}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const hasBlocking = (issues: readonly StepIssue[]): boolean => issues.some((i) => i.level === 'error');

function nameIssues(name: string): StepIssue[] {
  const n = name.trim();
  if (n.length < 2) return [{ field: 'name', message: 'Ponle un nombre al agente (mínimo 2 caracteres).', level: 'error' }];
  if (n.length > 60) return [{ field: 'name', message: 'El nombre es muy largo (máximo 60 caracteres).', level: 'error' }];
  return [];
}

export function validateChatStep(stepId: string, d: ChatDraft): StepIssue[] {
  const out: StepIssue[] = [];
  if (stepId === 'identidad') {
    out.push(...nameIssues(d.name));
    if (!d.business.trim()) out.push({ field: 'business', message: 'Indica el negocio para que el agente se presente bien.', level: 'warn' });
  }
  if (stepId === 'objetivo' && d.goalDetail.trim().length < 20) {
    out.push({ field: 'goalDetail', message: 'Describe con más detalle qué debe lograr; así responde con más precisión.', level: 'warn' });
  }
  if (stepId === 'entrenamiento') {
    if (d.kbIds.length === 0 && d.businessInfo.trim().length < 20) {
      out.push({ field: 'kbIds', message: 'Sin base de conocimiento ni datos del negocio, el agente solo podrá dar respuestas generales.', level: 'warn' });
    }
    if (!d.welcome.trim()) out.push({ field: 'welcome', message: 'Escribe un mensaje de bienvenida.', level: 'warn' });
  }
  if (stepId === 'canales' && d.channels.length === 0) {
    out.push({ field: 'channels', message: 'Elige al menos un canal para que el agente pueda responder.', level: 'warn' });
  }
  return out;
}

export function validateVoiceStep(stepId: string, d: VoiceDraft): StepIssue[] {
  const out: StepIssue[] = [];
  const r = d.rules;
  if (stepId === 'voz') {
    out.push(...nameIssues(d.name));
    if (!d.business.trim()) out.push({ field: 'business', message: 'Indica la empresa: el agente la menciona al contestar.', level: 'warn' });
  }
  if (stepId === 'objetivo') {
    if (d.greeting.trim().length < 10) out.push({ field: 'greeting', message: 'El saludo inicial es muy corto para una llamada.', level: 'warn' });
    if (d.greeting.length > 280) out.push({ field: 'greeting', message: 'Un saludo largo cansa al llamante: intenta bajar de 280 caracteres.', level: 'warn' });
    if (d.goalDetail.trim().length < 20) out.push({ field: 'goalDetail', message: 'Cuenta qué debe lograr en la llamada para guiar mejor la conversación.', level: 'warn' });
  }
  if (stepId === 'conocimiento' && d.kbIds.length === 0 && d.businessInfo.trim().length < 20) {
    out.push({ field: 'kbIds', message: 'Sin base de conocimiento, el agente no podrá responder preguntas de la empresa.', level: 'warn' });
  }
  if (stepId === 'reglas') {
    if (r.transferEnabled && !PHONE_RE.test(r.transferPhone.trim())) {
      out.push({ field: 'transferPhone', message: 'Indica un número válido para la transferencia (con código de país).', level: 'warn' });
    }
    if (r.hoursEnabled && (!TIME_RE.test(r.hoursFrom) || !TIME_RE.test(r.hoursTo) || r.hoursFrom >= r.hoursTo)) {
      out.push({ field: 'hours', message: 'La hora de inicio debe ser anterior a la de cierre.', level: 'warn' });
    }
    if (r.hoursEnabled && r.days.length === 0) out.push({ field: 'days', message: 'Marca al menos un día de atención.', level: 'warn' });
    if (r.maxMinutes < 1 || r.maxMinutes > 60) out.push({ field: 'maxMinutes', message: 'El límite de duración debe estar entre 1 y 60 minutos.', level: 'warn' });
    if (r.recording && !r.consent) out.push({ field: 'consent', message: 'Si grabas llamadas, pide consentimiento al llamante.', level: 'warn' });
    if (!r.aiDisclosure) out.push({ field: 'aiDisclosure', message: 'Conviene avisar que quien atiende es una IA: es una buena práctica y puede ser exigible.', level: 'warn' });
  }
  return out;
}

/** Problemas de todos los pasos: solo los bloqueantes impiden crear el agente. */
export function validateAll(kind: AgentKind, draft: ChatDraft | VoiceDraft): StepIssue[] {
  const steps = stepsFor(kind);
  return steps.flatMap((s) =>
    kind === 'voice' ? validateVoiceStep(s.id, draft as VoiceDraft) : validateChatStep(s.id, draft as ChatDraft),
  );
}

// ---------------------------------------------------------------------------
// Composición del agente (campos existentes de AIAgent)
// ---------------------------------------------------------------------------

export interface AgentPayload {
  name: string;
  channels: string[];
  personality: string;
  objective: string;
  additionalInfo: string;
  welcomeMessage: string;
  fallbackMessage: string;
}

const label = (list: readonly Choice[], id: string): string => list.find((x) => x.id === id)?.label ?? id;
const toneText: Record<ToneId, string> = {
  cercano: 'cercano y natural, tuteando con amabilidad',
  profesional: 'profesional, claro y seguro',
  formal: 'formal y respetuoso, tratando de usted',
  entusiasta: 'entusiasta y positivo',
  sereno: 'sereno, pausado y empático',
};
const goalText: Record<GoalId, string> = {
  atencion: 'Atender consultas de clientes y resolver dudas frecuentes con información verificada.',
  ventas: 'Captar interesados, calificarlos, presentar la oferta y recoger sus datos de contacto.',
  reservas: 'Consultar disponibilidad y agendar reservas o citas confirmando fecha, hora y datos del cliente.',
  soporte: 'Atender incidencias posventa, dar seguimiento y escalar al equipo cuando haga falta.',
};

function formatDays(days: readonly number[]): string {
  const names = WEEK_DAYS.filter((d) => days.includes(d.id)).map((d) => d.label.toLowerCase());
  return names.length ? names.join(', ') : 'sin días definidos';
}

/** Texto de las reglas de llamada, redactado como instrucciones para el modelo. */
export function composeCallRules(r: CallRules): string {
  const lines: string[] = ['REGLAS DE LLAMADA'];
  lines.push(
    r.hoursEnabled
      ? `- Horario de atención: ${formatDays(r.days)}, de ${r.hoursFrom} a ${r.hoursTo}. Fuera de horario di: "${r.afterHoursMessage.trim()}"`
      : '- Atiende las llamadas a cualquier hora.',
  );
  lines.push(
    r.transferEnabled
      ? `- Transferencia a una persona: ${r.transferWhen.trim()} Número de destino: ${r.transferPhone.trim() || 'por definir'}.`
      : '- No transfieras la llamada; si no puedes resolver, ofrece tomar un mensaje.',
  );
  if (r.voicemailEnabled) lines.push(`- Buzón de voz: si no hay solución inmediata, indica: "${r.voicemailMessage.trim()}"`);
  lines.push(`- Duración máxima de la llamada: ${r.maxMinutes} minutos; avisa con cortesía antes de cerrar.`);
  if (r.aiDisclosure) lines.push('- Al inicio, informa que eres un asistente de inteligencia artificial.');
  if (r.recording) {
    lines.push(
      r.consent
        ? '- La llamada puede grabarse: pide el consentimiento del llamante antes de continuar y respeta su negativa.'
        : '- La llamada puede grabarse.',
    );
  }
  return lines.join('\n');
}

export function composeAgentPayload(kind: AgentKind, draft: ChatDraft | VoiceDraft): AgentPayload {
  const name = draft.name.trim();
  const business = draft.business.trim();
  const goal = draft.goal;
  const detail = draft.goalDetail.trim();
  const goalLine = `🎯 OBJETIVO PRINCIPAL: ${label(GOALS, goal)}\n${goalText[goal]}${detail ? `\n\nDetalle: ${detail}` : ''}`;
  const objective = `SECCIÓN 1 — INTENCIONES Y FLUJOS DE CONVERSACIÓN\n\n${goalLine}`;
  const tone = toneText[draft.tone];

  if (kind === 'voice') {
    const d = draft as VoiceDraft;
    const personality = [
      'SECCIÓN 1 — IDENTIDAD Y PERSONALIDAD DEL AGENTE',
      '',
      `Nombre del agente: ${name}`,
      business ? `Empresa: ${business}` : null,
      `Rol: Agente de voz que atiende llamadas telefónicas${business ? ` de ${business}` : ''}.`,
      `Idioma: ${label(VOICE_LANGUAGES, d.language)}.`,
      `Tono: ${tone}.`,
      'Estilo de voz: frases cortas, máximo dos por turno; sin emojis, listas ni formato; repite datos importantes (nombres, fechas, números) para confirmarlos.',
    ].filter((l): l is string => l !== null).join('\n');
    const info = [d.businessInfo.trim(), composeCallRules(d.rules)].filter(Boolean).join('\n\n');
    return {
      name,
      channels: ['Llamadas de voz'],
      personality,
      objective,
      additionalInfo: info,
      welcomeMessage: d.greeting.trim(),
      fallbackMessage: d.rules.transferEnabled
        ? 'No tengo esa información, pero te comunico con una persona del equipo para que te ayude.'
        : 'No tengo esa información a la mano. Déjame tus datos y el equipo te devolverá la llamada.',
    };
  }

  const c = draft as ChatDraft;
  const personality = [
    'SECCIÓN 1 — IDENTIDAD Y PERSONALIDAD DEL AGENTE',
    '',
    `Nombre del agente: ${name}`,
    business ? `Negocio: ${business}` : null,
    `Rol: Asistente virtual de ${label(GOALS, goal).toLowerCase()}${business ? ` de ${business}` : ''}.`,
    `Tono: ${tone}.`,
  ].filter((l): l is string => l !== null).join('\n');
  return {
    name,
    channels: c.channels,
    personality,
    objective,
    additionalInfo: c.businessInfo.trim(),
    welcomeMessage: c.welcome.trim(),
    fallbackMessage: c.fallback.trim(),
  };
}

/** Duración legible: 1 → «1 minuto», 10 → «10 minutos». */
export const formatMinutes = (n: number): string => `${n} ${n === 1 ? 'minuto' : 'minutos'}`;

/** Velocidad de habla como factor (para la vista previa de voz). */
export const SPEED_FACTOR: Record<VoiceSpeedId, number> = { lenta: 0.9, normal: 1, rapida: 1.15 };

// ---------------------------------------------------------------------------
// Configuración de voz local (hasta conectar la telefonía real)
// ---------------------------------------------------------------------------

/** Lo que el modelo del agente aún no guarda: se conserva en este navegador. */
export interface VoiceLocalConfig {
  language: VoiceLanguageId;
  voiceId: string;
  speed: VoiceSpeedId;
  tone: ToneId;
  savedAt: number;
}

export function toVoiceLocalConfig(d: VoiceDraft, now: number = Date.now()): VoiceLocalConfig {
  return { language: d.language, voiceId: d.voiceId, speed: d.speed, tone: d.tone, savedAt: now };
}

export function parseVoiceLocalConfig(raw: string | null): VoiceLocalConfig | null {
  if (!raw) return null;
  try {
    const v: unknown = JSON.parse(raw);
    if (!isRecord(v)) return null;
    if (!oneOf(VOICE_LANGUAGES, v.language) || !isStr(v.voiceId) || !oneOf(VOICE_SPEEDS, v.speed)) return null;
    if (!oneOf(TONES, v.tone) || typeof v.savedAt !== 'number') return null;
    return v as unknown as VoiceLocalConfig;
  } catch {
    return null;
  }
}

export const voiceLabel = (id: string): string => VOICES.find((v) => v.id === id)?.label ?? id;
export const languageLabel = (id: string): string => VOICE_LANGUAGES.find((l) => l.id === id)?.label ?? id;
export const toneLabel = (id: string): string => TONES.find((t) => t.id === id)?.label ?? id;
export const goalLabel = (id: string): string => GOALS.find((g) => g.id === id)?.label ?? id;
export const speedLabel = (id: string): string => VOICE_SPEEDS.find((s) => s.id === id)?.label ?? id;
