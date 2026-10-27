/**
 * Nombres visibles de los proveedores de IA (OpenAI, Anthropic…). Archivo puro: lo usan el servidor y los
 * componentes de cliente sin arrastrar los SDK de cada proveedor.
 */
export const PROVIDER_NAMES = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  deepseek: 'DeepSeek',
} as const;

export type ProviderId = keyof typeof PROVIDER_NAMES;

/** Nombre visible del proveedor; si no se conoce, devuelve el identificador tal cual. */
export function providerName(provider: string): string {
  return (PROVIDER_NAMES as Record<string, string>)[provider] ?? provider;
}
