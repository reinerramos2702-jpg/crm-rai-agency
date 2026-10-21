import { isCampaignBrief, type CampaignBrief } from './campaign-brief';
import { IMAGE_PROVIDERS, PIPELINE_TYPES, PROVIDERS } from './campaign-new-options';

/** Preajustes de configuración guardados por la persona (solo en su navegador). */
export const PRESETS_KEY = 'rai-campaign-presets-v1';
export const MAX_PRESETS = 8;
export const MAX_PRESET_NAME = 40;
const MAX_BRAND_TEXT = 20_000;

export interface CampaignPreset {
  id: string;
  name: string;
  savedAt: number;
  pipelineType: string;
  provider: string;
  modelId: string;
  imageProvider: string;
  brandInput: string;
  brief: CampaignBrief;
}

export function isPreset(value: unknown): value is CampaignPreset {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== 'string' || v.id.length === 0 || v.id.length > 64) return false;
  if (typeof v.name !== 'string' || !v.name.trim() || v.name.length > MAX_PRESET_NAME) return false;
  if (typeof v.savedAt !== 'number' || !Number.isFinite(v.savedAt)) return false;
  if (typeof v.brandInput !== 'string' || v.brandInput.length > MAX_BRAND_TEXT) return false;
  if (!PIPELINE_TYPES.some((p) => p.value === v.pipelineType)) return false;
  if (!IMAGE_PROVIDERS.some((p) => p.value === v.imageProvider)) return false;
  if (!isCampaignBrief(v.brief)) return false;
  const provider = PROVIDERS.find((p) => p.provider === v.provider);
  return provider !== undefined && provider.models.includes(v.modelId as string);
}

/** Lee la lista guardada; ignora lo que no tenga la forma esperada (nunca lanza). */
export function parsePresets(raw: string | null): CampaignPreset[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isPreset).slice(0, MAX_PRESETS);
  } catch {
    return [];
  }
}

export function serializePresets(list: CampaignPreset[]): string {
  return JSON.stringify(list.slice(0, MAX_PRESETS));
}

export function makePreset(
  name: string,
  config: Omit<CampaignPreset, 'id' | 'name' | 'savedAt'>,
  now: number = Date.now(),
): CampaignPreset {
  return {
    ...config,
    id: `p${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    name: name.trim().slice(0, MAX_PRESET_NAME),
    savedAt: now,
  };
}

/** Inserta al principio; si ya existe un preajuste con el mismo nombre (sin distinguir mayúsculas) lo reemplaza. */
export function upsertPreset(list: CampaignPreset[], preset: CampaignPreset): CampaignPreset[] {
  const key = preset.name.trim().toLowerCase();
  const rest = list.filter((p) => p.name.trim().toLowerCase() !== key);
  return [preset, ...rest].slice(0, MAX_PRESETS);
}

export function removePreset(list: CampaignPreset[], id: string): CampaignPreset[] {
  return list.filter((p) => p.id !== id);
}
