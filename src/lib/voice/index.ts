import { readVoiceConfig, type VoiceConfig } from './config';
import { RetellProvider } from './retell';
import type { VoiceProvider } from './types';

/** Proveedor real solo en modo `live` con llave; en modo simulado devuelve null (cero gasto). */
export function getVoiceProvider(cfg: VoiceConfig = readVoiceConfig()): VoiceProvider | null {
  if (cfg.mode !== 'live' || !cfg.retellApiKey) return null;
  return new RetellProvider({ apiKey: cfg.retellApiKey });
}
