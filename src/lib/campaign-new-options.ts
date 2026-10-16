/**
 * Opciones del formulario «Nueva Campaña». Datos puros, compartidos por la
 * página, las tarjetas de pipeline y la validación del borrador.
 */

export const PROVIDERS = [
  { provider: 'deepseek', label: 'DeepSeek (Barato)', models: ['deepseek-chat', 'deepseek-reasoner'] },
  { provider: 'anthropic', label: 'Claude', models: ['claude-sonnet-4-5', 'claude-opus-4-7'] },
  { provider: 'google', label: 'Gemini', models: ['gemini-2.5-pro', 'gemini-2.5-flash'] },
  { provider: 'openai', label: 'GPT-4', models: ['gpt-4o', 'gpt-4o-mini'] },
];

export const PIPELINE_TYPES = [
  { value: 'ugc', name: 'UGC', description: 'Videos de personaje + producto' },
  { value: 'avatar_reel', name: 'Avatar Reel', description: 'Reacción a noticias' },
  { value: 'static_ads', name: 'Anuncios Estáticos', description: 'Anuncios con imagen fija' },
  { value: 'carousel', name: 'Carruseles', description: 'Piezas de varias imágenes' },
];

/** Los pipelines con video llevan además voz narrada (mismo criterio que el estimado de costos). */
export function pipelineHasVideo(pipelineType: string): boolean {
  return pipelineType === 'ugc' || pipelineType === 'avatar_reel';
}

export const IMAGE_PROVIDERS = [
  { value: 'gemini', label: 'Gemini Imagen 3 (defecto)' },
  { value: 'openai', label: 'DALL-E 3 / gpt-image-1' },
  { value: 'stabilityai', label: 'Stability AI' },
];

export const COUNTRY_OPTIONS = [
  { value: 'ALL', label: 'Todos los países' },
  { value: 'MX', label: 'México' },
  { value: 'US', label: 'Estados Unidos' },
  { value: 'ES', label: 'España' },
  { value: 'AR', label: 'Argentina' },
  { value: 'CO', label: 'Colombia' },
  { value: 'CL', label: 'Chile' },
  { value: 'PE', label: 'Perú' },
  { value: 'BR', label: 'Brasil' },
];

export const COMPETITOR_MODES = ['urls', 'ads-library'] as const;
export type CompetitorMode = (typeof COMPETITOR_MODES)[number];

/** Precio y velocidad relativos de cada modelo de planificación (orientativos; sirven para comparar). */
export interface ModelInfo {
  /** 1 = económico … 4 = premium. */
  cost: 1 | 2 | 3 | 4;
  /** 1 = lento … 3 = rápido. */
  speed: 1 | 2 | 3;
  blurb: string;
}

export const MODEL_INFO: Record<string, ModelInfo> = {
  'deepseek-chat': { cost: 1, speed: 3, blurb: 'La opción más barata y rápida: ideal para planificar y redactar a diario.' },
  'deepseek-reasoner': { cost: 1, speed: 1, blurb: 'Razona paso a paso: más lento, útil para estrategias con muchas variables.' },
  'claude-sonnet-4-5': { cost: 3, speed: 2, blurb: 'Redacción cuidada y muy buen seguimiento de instrucciones.' },
  'claude-opus-4-7': { cost: 4, speed: 1, blurb: 'Máxima calidad; es el más caro y el más lento.' },
  'gemini-2.5-pro': { cost: 3, speed: 2, blurb: 'Buen equilibrio para planes largos con mucho contexto.' },
  'gemini-2.5-flash': { cost: 1, speed: 3, blurb: 'Muy rápido y económico; suficiente para la mayoría de planes.' },
  'gpt-4o': { cost: 3, speed: 2, blurb: 'Versátil y estable; costo medio.' },
  'gpt-4o-mini': { cost: 1, speed: 3, blurb: 'Rápido y económico para tareas de redacción corta.' },
};

const FALLBACK_MODEL_INFO: ModelInfo = { cost: 2, speed: 2, blurb: 'Modelo personalizado.' };

export function modelInfo(modelId: string): ModelInfo {
  return MODEL_INFO[modelId] ?? FALLBACK_MODEL_INFO;
}

export const COST_TIER_LABELS = ['', 'Económico', 'Moderado', 'Alto', 'Premium'] as const;
export const SPEED_LABELS = ['', 'Lento', 'Medio', 'Rápido'] as const;

export function providerLabel(provider: string): string {
  const found = PROVIDERS.find((p) => p.provider === provider);
  return found ? found.label.replace(/\s*\(.*\)\s*$/, '') : provider;
}

export function modelsOf(provider: string): string[] {
  return PROVIDERS.find((p) => p.provider === provider)?.models ?? [];
}
