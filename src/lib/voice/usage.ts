/** Consumo mensual de voz: ventana del mes en hora de Caracas y suma contra el tope. */
import { estimateVoiceCost, usageLevel, type CostAssumptions, type UsageLevel } from './cost';
import type { VoiceCallMeta } from './call-meta';

/** Caracas es UTC-4 todo el año (sin horario de verano). */
const CARACAS_OFFSET_MS = 4 * 60 * 60 * 1000;

export function monthRange(now: Date = new Date()): { startMs: number; endMs: number; label: string } {
  const local = new Date(now.getTime() - CARACAS_OFFSET_MS);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  return {
    startMs: Date.UTC(y, m, 1) + CARACAS_OFFSET_MS,
    endMs: Date.UTC(y, m + 1, 1) + CARACAS_OFFSET_MS,
    label: `${y}-${String(m + 1).padStart(2, '0')}`,
  };
}

export interface UsageSummary {
  month: string;
  calls: number;
  minutes: number;
  /** Suma de lo que el proveedor reportó como costo real. */
  reportedUsd: number;
  /** Lo que se estimó para llamadas sin costo reportado todavía. */
  estimatedUsd: number;
  /** Número telefónico del mes (estimado), 0 si aún no hay uno. */
  numberUsd: number;
  spentUsd: number;
  capUsd: number;
  ratio: number;
  level: UsageLevel;
}

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function summarizeUsage(
  metas: readonly VoiceCallMeta[],
  opts: { capUsd: number; assumptions: CostAssumptions; includeNumber: boolean; month: string },
): UsageSummary {
  let seconds = 0;
  let reported = 0;
  let estimated = 0;
  for (const m of metas) {
    seconds += m.durationSec;
    if (m.costUsd !== null) reported += m.costUsd;
    else if (m.status !== 'ongoing') estimated += estimateVoiceCost(m.durationSec / 60, opts.assumptions, { includeNumber: false }).usageUsd;
  }
  const numberUsd = opts.includeNumber ? opts.assumptions.numberUsdPerMonth : 0;
  const spentUsd = r2(reported + estimated + numberUsd);
  const { ratio, level } = usageLevel(spentUsd, opts.capUsd);
  return {
    month: opts.month,
    calls: metas.length,
    minutes: r2(seconds / 60),
    reportedUsd: r2(reported),
    estimatedUsd: r2(estimated),
    numberUsd: r2(numberUsd),
    spentUsd,
    capUsd: opts.capUsd,
    ratio,
    level,
  };
}

/** Tope efectivo: el ajuste del workspace nunca puede superar el tope duro del entorno. */
export function effectiveCap(envCapUsd: number, workspaceCapUsd: number | null | undefined): number {
  return workspaceCapUsd && workspaceCapUsd > 0 ? Math.min(workspaceCapUsd, envCapUsd) : envCapUsd;
}
