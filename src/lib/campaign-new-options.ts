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
