import {
  COMPETITOR_MODES,
  COUNTRY_OPTIONS,
  IMAGE_PROVIDERS,
  PIPELINE_TYPES,
  PROVIDERS,
  type CompetitorMode,
} from './campaign-new-options';

/** Clave versionada: si cambia la forma del borrador, se sube la versión y el anterior se ignora. */
export const CAMPAIGN_DRAFT_KEY = 'rai-draft-campaign-new-v1';

/** Tope por campo de texto: protege el almacenamiento de contenido desmedido o manipulado. */
export const MAX_DRAFT_TEXT = 20_000;

/**
 * Solo texto y selecciones del formulario. Nunca se guardan claves, archivos
 * adjuntos ni el historial del chat (ese vive en el servidor).
 */
export interface CampaignDraft {
  name: string;
  pipelineType: string;
  provider: string;
  modelId: string;
  imageProvider: string;
  brandInput: string;
  inventoryPath: string;
  competitorMode: CompetitorMode;
  competitorUrls: string;
  adsLibraryBrand: string;
  adsLibraryCountry: string;
}

export const INITIAL_CAMPAIGN_DRAFT: CampaignDraft = {
  name: '',
  pipelineType: 'ugc',
  provider: 'deepseek',
  modelId: 'deepseek-chat',
  imageProvider: 'gemini',
  brandInput: '',
  inventoryPath: '',
  competitorMode: 'urls',
  competitorUrls: '',
  adsLibraryBrand: '',
  adsLibraryCountry: 'ALL',
};

const TEXT_FIELDS = [
  'name',
  'brandInput',
  'inventoryPath',
  'competitorUrls',
  'adsLibraryBrand',
] as const satisfies ReadonlyArray<keyof CampaignDraft>;

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.length <= MAX_DRAFT_TEXT;
}

/** Valida la forma completa: textos acotados y selecciones que existen en las listas actuales. */
export function isCampaignDraft(value: unknown): value is CampaignDraft {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;

  if (!TEXT_FIELDS.every((field) => isText(v[field]))) return false;
  if (!PIPELINE_TYPES.some((p) => p.value === v.pipelineType)) return false;
  if (!IMAGE_PROVIDERS.some((p) => p.value === v.imageProvider)) return false;
  if (!COUNTRY_OPTIONS.some((c) => c.value === v.adsLibraryCountry)) return false;
  if (!COMPETITOR_MODES.includes(v.competitorMode as CompetitorMode)) return false;

  const provider = PROVIDERS.find((p) => p.provider === v.provider);
  return provider !== undefined && provider.models.includes(v.modelId as string);
}
