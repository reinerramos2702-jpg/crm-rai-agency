/**
 * Publicadores de Instagram para posts programados (Corte B).
 *
 * - SimulatedPublisher: no toca Meta. Es el modo por defecto (IG_PUBLISH_MODE != 'live').
 * - MetaPublisher: Graph API real. Imagen = contenedor + media_publish;
 *   carrusel = contenedores hijo (is_carousel_item) + contenedor padre + media_publish.
 *   Pendiente de verificar en la documentación vigente de Meta antes de activar 'live'
 *   (versión de Graph, límites, formato JPEG). Ver SPEC §2.
 *
 * Idempotencia: `onContainer` se llama apenas existe el contenedor padre; si el post
 * se reintenta con `igContainerId`, NO se crea otro contenedor, solo se publica.
 */
import { decrypt } from './crypto';
import { getMetaConnectionRaw } from '@/repositories/workspaceMetaRepository';
import { safeError, type MediaType, type PublishMode } from './scheduled-posts';

/** Error que no se reintenta (token vencido, sin conexión, media inválida). */
export class NonRetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NonRetryableError';
  }
}

export interface PublishInput {
  id: string;
  caption: string;
  mediaUrls: string[];
  mediaType: MediaType;
  igContainerId: string | null;
}

export interface PublishResult {
  igMediaId: string;
  permalink: string | null;
  simulated: boolean;
}

export interface IgPublisher {
  publish(input: PublishInput, onContainer: (containerId: string) => Promise<void>): Promise<PublishResult>;
}

export class SimulatedPublisher implements IgPublisher {
  async publish(input: PublishInput, onContainer: (id: string) => Promise<void>): Promise<PublishResult> {
    const container = input.igContainerId ?? `sim_container_${input.id}`;
    if (!input.igContainerId) await onContainer(container);
    return { igMediaId: `sim_${input.id}`, permalink: null, simulated: true };
  }
}

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v19.0';
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;

async function graph<T>(path: string, init: { method: 'GET' | 'POST'; body?: Record<string, unknown> }, token: string): Promise<T> {
  const url = init.method === 'GET' ? `${GRAPH}${path}${path.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(token)}` : `${GRAPH}${path}`;
  const res = await fetch(url, {
    method: init.method,
    headers: { 'Content-Type': 'application/json' },
    body: init.method === 'POST' ? JSON.stringify({ ...init.body, access_token: token }) : undefined,
    signal: AbortSignal.timeout(30_000),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: { message?: string; code?: number; type?: string } } & T;
  if (!res.ok || data.error) {
    const code = data.error?.code;
    const msg = `Meta ${res.status}: ${data.error?.message ?? 'error desconocido'}`;
    // 190 = token inválido/vencido; 10/200 = permisos; 100 = parámetro inválido (media)
    if (code === 190 || code === 10 || code === 200 || code === 100) throw new NonRetryableError(msg);
    throw new Error(msg);
  }
  return data;
}

async function waitFinished(containerId: string, token: string, tries = 6): Promise<void> {
  for (let i = 0; i < tries; i++) {
    const s = await graph<{ status_code?: string }>(`/${containerId}?fields=status_code`, { method: 'GET' }, token);
    if (s.status_code === 'FINISHED' || s.status_code === undefined) return;
    if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') throw new NonRetryableError(`Contenedor en estado ${s.status_code}`);
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error('El contenedor aún se está procesando; se reintentará');
}

export class MetaPublisher implements IgPublisher {
  constructor(private readonly igBusinessId: string, private readonly token: string) {}

  async publish(input: PublishInput, onContainer: (id: string) => Promise<void>): Promise<PublishResult> {
    const { igBusinessId: ig, token } = this;
    let containerId = input.igContainerId;

    if (!containerId) {
      if (input.mediaUrls.length === 0) throw new NonRetryableError('El post no tiene imágenes con URL pública');
      if (input.mediaType === 'carousel') {
        if (input.mediaUrls.length < 2) throw new NonRetryableError('Un carrusel necesita al menos 2 imágenes');
        const children: string[] = [];
        for (const url of input.mediaUrls) {
          const c = await graph<{ id: string }>(`/${ig}/media`, { method: 'POST', body: { image_url: url, is_carousel_item: true } }, token);
          children.push(c.id);
        }
        const parent = await graph<{ id: string }>(
          `/${ig}/media`,
          { method: 'POST', body: { media_type: 'CAROUSEL', children: children.join(','), caption: input.caption } },
          token,
        );
        containerId = parent.id;
      } else {
        const c = await graph<{ id: string }>(`/${ig}/media`, { method: 'POST', body: { image_url: input.mediaUrls[0], caption: input.caption } }, token);
        containerId = c.id;
      }
      await onContainer(containerId);
    }

    await waitFinished(containerId, token);
    const pub = await graph<{ id: string }>(`/${ig}/media_publish`, { method: 'POST', body: { creation_id: containerId } }, token);
    let permalink: string | null = null;
    try {
      const p = await graph<{ permalink?: string }>(`/${pub.id}?fields=permalink`, { method: 'GET' }, token);
      permalink = p.permalink ?? null;
    } catch {
      /* el permalink es informativo: no tumba una publicación ya hecha */
    }
    return { igMediaId: pub.id, permalink, simulated: false };
  }
}

/** Crea el publicador del workspace según el modo. En 'live' exige conexión Meta vigente. */
export async function createPublisherFor(workspaceId: string, mode: PublishMode): Promise<IgPublisher> {
  if (mode === 'simulated') return new SimulatedPublisher();
  const conn = await getMetaConnectionRaw(workspaceId);
  if (!conn?.accessTokenCipher || !conn.accessTokenIv || !conn.accessTokenTag || !conn.igBusinessId) {
    throw new NonRetryableError('Este workspace no tiene Instagram conectado');
  }
  if (conn.tokenExpiresAt && conn.tokenExpiresAt.getTime() < Date.now()) {
    throw new NonRetryableError('El token de Instagram expiró; reconecta la cuenta');
  }
  try {
    const token = decrypt(conn.accessTokenCipher, conn.accessTokenIv, conn.accessTokenTag);
    return new MetaPublisher(conn.igBusinessId, token);
  } catch (e) {
    throw new NonRetryableError(safeError(e));
  }
}
