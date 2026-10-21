/**
 * Costo ESTIMADO de la voz. Ninguna cifra de aquí es una cotización: son supuestos
 * configurables (variables `VOICE_COST_*`) para planear el tope de gasto.
 *
 * Fuentes (leídas el 16 oct 2026; revisar antes de contratar):
 *  - Retell, página de precios (retellai.com/pricing): ejemplo de 0,11 USD/min = LLM 0,04
 *    + infraestructura de voz 0,055 + voz (TTS) 0,015; telefonía Twilio/Telnyx de Retell
 *    0,015 USD/min; número de Retell 2,00 USD/mes; llamadas fallidas no se cobran; el
 *    silencio y la espera sí; la base de conocimiento suma 0,005 USD/min.
 *  - Twilio (página oficial de precios de voz de EE. UU.): entrante local 0,0085 USD/min;
 *    número local 1,15 USD/mes. Con troncal SIP propia, Retell no cobra telefonía.
 */

export interface CostAssumptions {
  /** Siempre true: recuerda que son supuestos y no tarifas contratadas. */
  readonly estimado: true;
  /** Motor de voz de Retell + voz (TTS): 0,055 + 0,015. */
  voiceEngineUsdPerMin: number;
  /** Modelo de lenguaje. Conservador: 0,04 (ejemplo de Retell); los modelos "mini" suelen costar menos. */
  llmUsdPerMin: number;
  /** Telefonía entrante vía Twilio (troncal SIP propia). */
  telephonyUsdPerMin: number;
  /** Búsqueda en base de conocimiento (add-on de Retell). Se usa nuestra herramienta propia, así que 0 por defecto. */
  knowledgeUsdPerMin: number;
  /** Número telefónico (Twilio local). */
  numberUsdPerMonth: number;
  /** Tramo extra por minuto, p. ej. el desvío desde un número venezolano. 0 por defecto. */
  forwardingUsdPerMin: number;
}

export const DEFAULT_COST_ASSUMPTIONS: CostAssumptions = {
  estimado: true,
  voiceEngineUsdPerMin: 0.07,
  llmUsdPerMin: 0.04,
  telephonyUsdPerMin: 0.0085,
  knowledgeUsdPerMin: 0,
  numberUsdPerMonth: 1.15,
  forwardingUsdPerMin: 0,
};

type Env = Record<string, string | undefined>;

function num(v: string | undefined, fallback: number): number {
  if (v === undefined || v.trim() === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** Permite ajustar los supuestos sin tocar código (`VOICE_COST_ENGINE_PER_MIN`, etc.). */
export function readCostAssumptions(env: Env = process.env): CostAssumptions {
  const d = DEFAULT_COST_ASSUMPTIONS;
  return {
    estimado: true,
    voiceEngineUsdPerMin: num(env.VOICE_COST_ENGINE_PER_MIN, d.voiceEngineUsdPerMin),
    llmUsdPerMin: num(env.VOICE_COST_LLM_PER_MIN, d.llmUsdPerMin),
    telephonyUsdPerMin: num(env.VOICE_COST_TELEPHONY_PER_MIN, d.telephonyUsdPerMin),
    knowledgeUsdPerMin: num(env.VOICE_COST_KB_PER_MIN, d.knowledgeUsdPerMin),
    numberUsdPerMonth: num(env.VOICE_COST_NUMBER_PER_MONTH, d.numberUsdPerMonth),
    forwardingUsdPerMin: num(env.VOICE_COST_FORWARDING_PER_MIN, d.forwardingUsdPerMin),
  };
}

const round = (n: number, digits = 2): number => {
  const f = 10 ** digits;
  return Math.round((n + Number.EPSILON) * f) / f;
};

export interface VoiceCostEstimate {
  estimado: true;
  minutes: number;
  perMinuteUsd: number;
  usageUsd: number;
  numberUsd: number;
  totalUsd: number;
  lines: Array<{ label: string; usd: number }>;
}

export function perMinuteUsd(a: CostAssumptions = DEFAULT_COST_ASSUMPTIONS): number {
  return round(
    a.voiceEngineUsdPerMin + a.llmUsdPerMin + a.telephonyUsdPerMin + a.knowledgeUsdPerMin + a.forwardingUsdPerMin,
    4,
  );
}

/** Costo mensual ESTIMADO para `minutes` minutos de llamada (negativos o inválidos cuentan como 0). */
export function estimateVoiceCost(
  minutes: number,
  assumptions: CostAssumptions = DEFAULT_COST_ASSUMPTIONS,
  opts: { includeNumber?: boolean } = {},
): VoiceCostEstimate {
  const mins = Number.isFinite(minutes) && minutes > 0 ? minutes : 0;
  const a = assumptions;
  const lines = [
    { label: 'Motor de voz', usd: round(mins * a.voiceEngineUsdPerMin) },
    { label: 'Modelo de lenguaje', usd: round(mins * a.llmUsdPerMin) },
    { label: 'Telefonía entrante', usd: round(mins * a.telephonyUsdPerMin) },
    { label: 'Base de conocimiento', usd: round(mins * a.knowledgeUsdPerMin) },
    { label: 'Desvío de número', usd: round(mins * a.forwardingUsdPerMin) },
  ].filter((l) => l.usd > 0);
  const usageUsd = round(mins * perMinuteUsd(a));
  const numberUsd = opts.includeNumber === false ? 0 : round(a.numberUsdPerMonth);
  if (numberUsd > 0) lines.push({ label: 'Número (mes)', usd: numberUsd });
  return {
    estimado: true,
    minutes: round(mins, 2),
    perMinuteUsd: perMinuteUsd(a),
    usageUsd,
    numberUsd,
    totalUsd: round(usageUsd + numberUsd),
    lines,
  };
}

/** Minutos que alcanza un tope (descontado el número). */
export function minutesForBudget(capUsd: number, assumptions: CostAssumptions = DEFAULT_COST_ASSUMPTIONS): number {
  const per = perMinuteUsd(assumptions);
  if (!(capUsd > 0) || per <= 0) return 0;
  return Math.max(0, Math.floor((capUsd - assumptions.numberUsdPerMonth) / per));
}

export type UsageLevel = 'ok' | 'warn' | 'cap';

/** Estado del consumo contra el tope: aviso al 80 %, tope al 100 %. */
export function usageLevel(spentUsd: number, capUsd: number): { ratio: number; level: UsageLevel } {
  if (!(capUsd > 0)) return { ratio: 0, level: 'ok' };
  const ratio = Math.max(0, spentUsd) / capUsd;
  return { ratio: round(ratio, 4), level: ratio >= 1 ? 'cap' : ratio >= 0.8 ? 'warn' : 'ok' };
}
