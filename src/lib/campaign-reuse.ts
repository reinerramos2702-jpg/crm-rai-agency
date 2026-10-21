import { PIPELINE_TYPES, PROVIDERS } from './campaign-new-options';

/** Campaña anterior reducida a lo que sirve para reutilizar su configuración. */
export interface PastCampaign {
  id: string;
  name: string;
  pipelineType: string;
  provider: string | null;
  modelId: string | null;
  updatedAt: string;
  messages: number;
  status: string;
}

export const MAX_NAME_LENGTH = 120;

/** Convierte la respuesta de /api/campaigns (ya ordenada por actividad) en una lista liviana. */
export function toPastCampaigns(raw: unknown): PastCampaign[] {
  const list = (raw as { campaigns?: unknown } | null)?.campaigns;
  if (!Array.isArray(list)) return [];
  const out: PastCampaign[] = [];
  for (const item of list) {
    if (typeof item !== 'object' || item === null) continue;
    const c = item as Record<string, unknown>;
    if (typeof c.id !== 'string' || typeof c.name !== 'string') continue;
    out.push({
      id: c.id,
      name: c.name,
      pipelineType: typeof c.pipelineType === 'string' ? c.pipelineType : 'ugc',
      provider: typeof c.llmProvider === 'string' ? c.llmProvider : null,
      modelId: typeof c.llmModel === 'string' ? c.llmModel : null,
      updatedAt: typeof c.updatedAt === 'string' ? c.updatedAt : '',
      messages: Array.isArray(c.chatHistory) ? c.chatHistory.length : 0,
      status: typeof c.status === 'string' ? c.status : 'planning',
    });
  }
  return out;
}

/** «Mayo» → «Mayo (copia)»; «Mayo (copia)» → «Mayo (copia 2)»; sin superar el tope de longitud. */
export function copyName(name: string): string {
  const base = name.trim() || 'Campaña';
  const numbered = /^(.*) \(copia (\d+)\)$/.exec(base);
  const plain = /^(.*) \(copia\)$/.exec(base);
  const next = numbered
    ? `${numbered[1]} (copia ${Number(numbered[2]) + 1})`
    : plain
      ? `${plain[1]} (copia 2)`
      : `${base} (copia)`;
  if (next.length <= MAX_NAME_LENGTH) return next;
  const suffix = next.slice(next.lastIndexOf(' ('));
  return `${next.slice(0, MAX_NAME_LENGTH - suffix.length - 1).trimEnd()}…${suffix}`;
}

export interface ReusePatch {
  name: string;
  pipelineType: string;
  provider: string;
  modelId: string;
}

/** Configuración reutilizable; descarta proveedor/modelo que ya no existen para no romper el formulario. */
export function reusePatch(c: PastCampaign, fallback: { provider: string; modelId: string }): ReusePatch {
  const pipelineType = PIPELINE_TYPES.some((p) => p.value === c.pipelineType) ? c.pipelineType : 'ugc';
  const prov = PROVIDERS.find((p) => p.provider === c.provider);
  const validModel = prov && c.modelId && prov.models.includes(c.modelId);
  return {
    name: copyName(c.name),
    pipelineType,
    provider: validModel ? prov.provider : fallback.provider,
    modelId: validModel ? (c.modelId as string) : fallback.modelId,
  };
}
