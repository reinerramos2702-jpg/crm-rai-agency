'use client';

import { useCachedJson } from '@/lib/use-cached-json';
import {
  buildReadiness,
  readinessSummary,
  type PlannerSnapshot,
  type Probe,
  type ReadinessItem,
} from '@/lib/campaign-readiness';
import type { ContentPlannerConfig } from '@/lib/content-planner-config';

const TTL = 60_000;
export const PLANNER_URL = '/api/content-planner/config';
const KEYS_URL = '/api/keys';
/** Un `campaignRef` inexistente devuelve lista vacía y el modo de publicación, sin traer publicaciones. */
const IG_MODE_URL = '/api/content-planner/schedule?campaignRef=__nueva-campana__';

function probe<T, R>(r: { data: T | undefined; error: string | null }, pick: (d: T) => R): Probe<R> {
  if (r.data !== undefined) return { state: 'ready', data: pick(r.data) };
  return r.error !== null ? { state: 'error' } : { state: 'loading' };
}

interface ReadinessArgs {
  name: string;
  brandInput: string;
  provider: string;
  imageProvider: string;
  pipelineType: string;
}

/** Datos del planificador compartidos (checklist y «Cargar mi marca»): una sola petición con caché. */
export function usePlannerConfig() {
  return useCachedJson<{ configured: boolean; config: ContentPlannerConfig }>(PLANNER_URL, { ttlMs: TTL });
}

/** Comprueba claves, marca e Instagram con datos reales; nunca bloquea el render. */
export function useReadiness(args: ReadinessArgs): { items: ReadinessItem[]; ok: number; total: number; attention: number } {
  const keys = useCachedJson<{ keys: Array<{ provider: string }> }>(KEYS_URL, { ttlMs: TTL });
  const planner = usePlannerConfig();
  const igMode = useCachedJson<{ mode: 'simulated' | 'live' }>(IG_MODE_URL, { ttlMs: TTL });

  const { name, brandInput, provider, imageProvider, pipelineType } = args;
  const keysProbe = probe(keys, (d) => d.keys.map((k) => k.provider));
  const plannerProbe: Probe<PlannerSnapshot> = probe(planner, (d) => ({
    igHandle: d.config.igHandle,
    brandDocContent: d.config.brandDocContent,
    brandDocName: d.config.brandDocName,
    businessName: d.config.businessName,
  }));
  const igProbe = probe(igMode, (d) => d.mode);

  // Cálculo barato (cinco elementos): no necesita memoización.
  const items = buildReadiness({
    name,
    brandInput,
    provider,
    imageProvider,
    pipelineType,
    keys: keysProbe,
    planner: plannerProbe,
    igMode: igProbe,
  });
  const { ok, total, attention } = readinessSummary(items);
  return { items, ok, total, attention };
}
