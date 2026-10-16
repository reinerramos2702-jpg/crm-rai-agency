import type { LlmProviderId } from '../types';

export const LLM_PROVIDERS: Array<{ provider: LlmProviderId; label: string; models: string[] }> = [
  { provider: 'deepseek', label: 'DeepSeek (Barato)', models: ['deepseek-chat', 'deepseek-reasoner'] },
  { provider: 'anthropic', label: 'Claude', models: ['claude-sonnet-4-5', 'claude-opus-4-7'] },
  { provider: 'google', label: 'Gemini', models: ['gemini-2.5-pro', 'gemini-2.5-flash'] },
  { provider: 'openai', label: 'GPT-4', models: ['gpt-4o', 'gpt-4o-mini'] },
];

export const IMAGE_PROVIDERS = [
  { value: 'gemini', label: 'Gemini Imagen 3 ($0.03/img)' },
  { value: 'openai', label: 'DALL-E 3 / gpt-image-1 ($0.04/img)' },
  { value: 'stabilityai', label: 'Stability AI ($0.08/img)' },
];

export const NODES = [
  { n: 1, title: 'Ideación de grilla semanal', hint: 'Define los 7 temas de la semana' },
  { n: 2, title: 'Arquitectura narrativa', hint: 'Estilos visuales + estructura de slides (PAS)' },
  { n: 3, title: 'Generación de imágenes', hint: 'Prompt y generación slide por slide' },
  { n: 4, title: 'Ciclaje entre temas', hint: 'Repite 2→3→4 hasta completar la grilla' },
  { n: 5, title: 'Síntesis de copywriting', hint: 'Captions, CTAs y hashtags finales' },
];

export const SLIDE_SLOTS = [1, 2, 3, 4, 5];
