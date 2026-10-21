import { pipelineHasVideo, providerLabel } from './campaign-new-options';

export type ReadinessStatus = 'ok' | 'warn' | 'pending' | 'unknown';

export interface ReadinessItem {
  id: 'name' | 'llm-key' | 'media-keys' | 'brand' | 'instagram';
  label: string;
  status: ReadinessStatus;
  detail: string;
  /** Enlace directo para resolver el punto. */
  href?: string;
  cta?: string;
  /** Acción interna del formulario (en lugar de navegar). */
  action?: 'focus-name' | 'load-brand';
}

/** Estado de una consulta: aún cargando, falló (p. ej. sin permiso) o con datos. */
export type Probe<T> = { state: 'loading' } | { state: 'error' } | { state: 'ready'; data: T };

export interface PlannerSnapshot {
  igHandle: string;
  brandDocContent: string;
  brandDocName: string;
  businessName: string;
}

export interface ReadinessInput {
  name: string;
  brandInput: string;
  provider: string;
  imageProvider: string;
  pipelineType: string;
  keys: Probe<string[]>;
  planner: Probe<PlannerSnapshot>;
  igMode: Probe<'simulated' | 'live'>;
}

const IMAGE_KEY: Record<string, string | null> = { gemini: 'google', openai: 'openai', stabilityai: null };
const KEY_LABEL: Record<string, string> = { google: 'Google', openai: 'OpenAI', elevenlabs: 'ElevenLabs' };

function keyItems(i: ReadinessInput): ReadinessItem[] {
  const llmLabel = `Clave de IA (${providerLabel(i.provider)})`;
  const mediaLabel = 'Claves de imagen y voz';
  if (i.keys.state === 'loading') {
    return [
      { id: 'llm-key', label: llmLabel, status: 'pending', detail: 'Verificando…' },
      { id: 'media-keys', label: mediaLabel, status: 'pending', detail: 'Verificando…' },
    ];
  }
  if (i.keys.state === 'error') {
    const detail = 'Tu rol no permite verificar las claves; si falla, pide a un administrador revisarlas.';
    return [
      { id: 'llm-key', label: llmLabel, status: 'unknown', detail },
      { id: 'media-keys', label: mediaLabel, status: 'unknown', detail },
    ];
  }
  const have = new Set(i.keys.data);
  const llm: ReadinessItem = have.has(i.provider)
    ? { id: 'llm-key', label: llmLabel, status: 'ok', detail: 'Clave configurada.' }
    : {
        id: 'llm-key',
        label: llmLabel,
        status: 'warn',
        detail: 'No hay clave propia; solo funcionará si el sistema tiene una por defecto.',
        href: '/keys',
        cta: 'Agregar clave',
      };

  const needed: string[] = [];
  const imageKey = IMAGE_KEY[i.imageProvider] ?? null;
  if (imageKey) needed.push(imageKey);
  if (pipelineHasVideo(i.pipelineType)) needed.push('google', 'elevenlabs');
  const missing = Array.from(new Set(needed)).filter((k) => !have.has(k));
  const media: ReadinessItem =
    needed.length === 0
      ? { id: 'media-keys', label: mediaLabel, status: 'unknown', detail: 'Este proveedor de imágenes no se verifica aquí.' }
      : missing.length === 0
        ? { id: 'media-keys', label: mediaLabel, status: 'ok', detail: 'Todo configurado para este pipeline.' }
        : {
            id: 'media-keys',
            label: mediaLabel,
            status: 'warn',
            detail: `Faltan: ${missing.map((k) => KEY_LABEL[k] ?? k).join(', ')}. Se necesitan al procesar, no para planificar.`,
            href: '/keys',
            cta: 'Agregar clave',
          };
  return [llm, media];
}

function brandItem(i: ReadinessInput): ReadinessItem {
  const label = 'Manual de marca';
  if (i.brandInput.trim()) {
    return { id: 'brand', label, status: 'ok', detail: 'Usarás el texto que pegaste en esta campaña.' };
  }
  if (i.planner.state === 'loading') return { id: 'brand', label, status: 'pending', detail: 'Verificando…' };
  if (i.planner.state === 'ready') {
    const p = i.planner.data;
    if (p.brandDocContent.trim() || p.businessName.trim()) {
      return {
        id: 'brand',
        label,
        status: 'warn',
        detail: p.brandDocName
          ? `Tienes «${p.brandDocName}» en Configuración; cárgalo para que la IA lo use.`
          : 'Tienes datos de marca en Configuración; cárgalos para que la IA los use.',
        action: 'load-brand',
        cta: 'Cargar mi marca',
      };
    }
  }
  return {
    id: 'brand',
    label,
    status: 'warn',
    detail: 'Sin manual de marca la IA preguntará más. Pégalo abajo o complétalo en Automatización.',
    href: '/automatizacion',
    cta: 'Configurar marca',
  };
}

function instagramItem(i: ReadinessInput): ReadinessItem {
  const label = 'Instagram';
  if (i.planner.state === 'loading') return { id: 'instagram', label, status: 'pending', detail: 'Verificando…' };
  if (i.planner.state === 'error') {
    return { id: 'instagram', label, status: 'unknown', detail: 'Tu rol no permite verificar la conexión.' };
  }
  const handle = i.planner.data.igHandle.trim();
  if (!handle) {
    return {
      id: 'instagram',
      label,
      status: 'warn',
      detail: 'Aún no indicas la cuenta. Podrás generar el plan, pero no programar publicaciones.',
      href: '/automatizacion',
      cta: 'Indicar cuenta',
    };
  }
  const simulated = i.igMode.state === 'ready' && i.igMode.data === 'simulated';
  return {
    id: 'instagram',
    label,
    status: 'ok',
    detail: simulated
      ? `${handle} en modo simulado: el ciclo completo funciona sin publicar en la cuenta real.`
      : i.igMode.state === 'ready'
        ? `${handle} lista para publicar.`
        : `${handle} configurada.`,
  };
}

export function buildReadiness(i: ReadinessInput): ReadinessItem[] {
  const named = i.name.trim().length > 0;
  const name: ReadinessItem = {
    id: 'name',
    label: 'Nombre de la campaña',
    status: named ? 'ok' : 'warn',
    detail: named ? 'Listo.' : 'Necesitas un nombre para empezar a conversar.',
    ...(named ? {} : { action: 'focus-name' as const, cta: 'Escribir nombre' }),
  };
  return [name, ...keyItems(i), brandItem(i), instagramItem(i)];
}

export function readinessSummary(items: ReadinessItem[]): { ok: number; total: number; attention: number } {
  return {
    ok: items.filter((x) => x.status === 'ok').length,
    total: items.length,
    attention: items.filter((x) => x.status === 'warn').length,
  };
}
