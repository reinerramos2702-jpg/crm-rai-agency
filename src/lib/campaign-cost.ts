import { pipelineHasVideo } from './campaign-new-options';

/**
 * Estimador de costo en vivo de «Nueva Campaña». Replica las tablas aproximadas de
 * `cost-estimator.ts` (el estimado real de /api/cost-estimate necesita el plan ya
 * generado) y añade el costo de la conversación de planificación según el modelo.
 * Valores orientativos en USD; verificar con los precios oficiales de cada proveedor.
 */

export const BATCH_SIZES = [7, 15, 30] as const;
export const DEFAULT_BATCH = 7;

/** USD por token de entrada y de salida. */
const LLM_PRICES: Record<string, { input: number; output: number }> = {
  'deepseek-chat': { input: 0.14 / 1e6, output: 0.28 / 1e6 },
  'deepseek-reasoner': { input: 0.55 / 1e6, output: 2.19 / 1e6 },
  'gpt-4o-mini': { input: 0.15 / 1e6, output: 0.6 / 1e6 },
  'gpt-4o': { input: 2.5 / 1e6, output: 10 / 1e6 },
  'claude-sonnet-4-5': { input: 3 / 1e6, output: 15 / 1e6 },
  'claude-opus-4-7': { input: 15 / 1e6, output: 75 / 1e6 },
  'gemini-2.5-flash': { input: 0.3 / 1e6, output: 2.5 / 1e6 },
  'gemini-2.5-pro': { input: 1.25 / 1e6, output: 10 / 1e6 },
};
const DEFAULT_PRICE = LLM_PRICES['deepseek-chat'];

const IMAGE_USD: Record<string, number> = { gemini: 0.03, openai: 0.04, stabilityai: 0.04 };
const IMAGES_PER_PIECE: Record<string, number> = { ugc: 5, avatar_reel: 3, static_ads: 1, carousel: 8 };
const VIDEO_SECONDS: Record<string, number> = { ugc: 30, avatar_reel: 45, static_ads: 0, carousel: 0 };
const VIDEO_USD_PER_SECOND = 0.4;
const VOICE_USD_PER_CHAR = 0.18 / 1000;
const VOICE_CHARS_PER_PIECE = 600;
const COPY_TOKENS_PER_PIECE = 800;

/** Conversación típica de planificación: ~10 turnos acumulando contexto. */
const PLAN_INPUT_TOKENS = 30_000;
const PLAN_OUTPUT_TOKENS = 10_000;

export type CostLineId = 'plan' | 'copy' | 'image' | 'voice' | 'video';

export interface CostLine {
  id: CostLineId;
  label: string;
  usd: number;
}

export interface CostResult {
  lines: CostLine[];
  totalUsd: number;
  perPieceUsd: number;
}

export interface CostInput {
  pipelineType: string;
  modelId: string;
  imageProvider: string;
  pieces: number;
}

export function estimateCampaignCost(input: CostInput): CostResult {
  const pieces = Math.max(1, Math.floor(input.pieces));
  const price = LLM_PRICES[input.modelId] ?? DEFAULT_PRICE;
  const lines: CostLine[] = [
    {
      id: 'plan',
      label: 'Planificación con IA',
      usd: PLAN_INPUT_TOKENS * price.input + PLAN_OUTPUT_TOKENS * price.output,
    },
    {
      id: 'copy',
      label: 'Textos de cada pieza',
      usd: pieces * COPY_TOKENS_PER_PIECE * (price.input + price.output) * 0.5,
    },
    {
      id: 'image',
      label: 'Imágenes',
      usd: pieces * (IMAGES_PER_PIECE[input.pipelineType] ?? 1) * (IMAGE_USD[input.imageProvider] ?? IMAGE_USD.openai),
    },
  ];
  if (pipelineHasVideo(input.pipelineType)) {
    lines.push({ id: 'voice', label: 'Voz narrada', usd: pieces * VOICE_CHARS_PER_PIECE * VOICE_USD_PER_CHAR });
    lines.push({
      id: 'video',
      label: 'Video',
      usd: pieces * (VIDEO_SECONDS[input.pipelineType] ?? 0) * VIDEO_USD_PER_SECOND,
    });
  }
  const totalUsd = lines.reduce((sum, l) => sum + l.usd, 0);
  return { lines, totalUsd, perPieceUsd: totalUsd / pieces };
}

/** Importes pequeños con 3 decimales para que «$0.007» no se muestre como «$0.01». */
export function formatUsd(value: number): string {
  if (value > 0 && value < 0.01) return `$${value.toFixed(3)}`;
  return `$${value.toFixed(2)}`;
}
