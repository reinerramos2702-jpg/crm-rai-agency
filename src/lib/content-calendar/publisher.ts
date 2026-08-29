import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/crypto';
import { logPostEvent, POST_INCLUDE } from './service';
import {
  MAX_PUBLISH_ATTEMPTS,
  NOTIFY_AFTER_ATTEMPTS,
  RETRY_BACKOFF_MINUTES,
  type Network,
} from './types';

/**
 * Publicación del Calendario de Contenido vía Meta Graph API.
 *
 * CREDENCIALES (modelo actual, single-workspace):
 * se reutiliza el mecanismo que YA existe en el repo —
 *   - Instagram: `ApiKey(provider='instagram', validated=true)` del owner del
 *     workspace (BYOK cifrado con `src/lib/crypto.ts`) + `Settings.igBusinessId`.
 *   - Facebook:  `ApiKey(provider='facebook', validated=true)` + `Settings.fbPageId`.
 *
 * Cuando aterrice el Bloque 1 (Meta por cliente), lo único que cambia es
 * `resolveCredentials()`: pasa a leer las credenciales cifradas del tenant en
 * vez del BYOK global. El resto del flujo —contenedores, publicación,
 * reintentos, estados— queda igual.
 *
 * IMPORTANTE PARA EL DEMO: el tenant de datos de prueba NO tiene credenciales
 * reales conectadas a propósito. El intento de publicar falla de forma
 * controlada y la tarjeta queda en estado 'error' con el motivo visible.
 * Nunca se simula un éxito falso.
 */

const GRAPH = 'https://graph.facebook.com/v19.0';

export interface NetworkResult {
  mediaId?: string;
  permalink?: string;
  error?: string;
}

export type PublishResults = Partial<Record<Network, NetworkResult>>;

interface Credentials {
  instagram?: { token: string; igBusinessId: string };
  facebook?: { token: string; pageId: string };
  missing: Partial<Record<Network, string>>;
}

/** Resuelve las credenciales disponibles para el workspace. */
export async function resolveCredentials(ownerId: string): Promise<Credentials> {
  const out: Credentials = { missing: {} };
  const settings = await prisma.settings.findUnique({ where: { id: 'global' } });

  const igKey = await prisma.apiKey.findFirst({
    where: { userId: ownerId, provider: 'instagram', validated: true },
    orderBy: { createdAt: 'desc' },
  });
  if (!igKey) {
    out.missing.instagram =
      'No hay un Access Token de Instagram conectado. Ve a "Claves de IA" y agrega el token de la cuenta.';
  } else if (!settings || !settings.igBusinessId) {
    out.missing.instagram =
      'Falta el Instagram Business Account ID. Configúralo en Configuración antes de publicar.';
  } else {
    out.instagram = {
      token: decrypt(igKey.ciphertext, igKey.iv, igKey.authTag),
      igBusinessId: settings.igBusinessId,
    };
  }

  const fbKey = await prisma.apiKey.findFirst({
    where: { userId: ownerId, provider: 'facebook', validated: true },
    orderBy: { createdAt: 'desc' },
  });
  const fbPageId = settings ? (settings as { fbPageId?: string | null }).fbPageId : null;
  if (!fbKey) {
    out.missing.facebook =
      'No hay un Access Token de Facebook conectado. Ve a "Claves de IA" y agrega el token de la página.';
  } else if (!fbPageId) {
    out.missing.facebook =
      'Falta el ID de la página de Facebook. Configúralo en Configuración antes de publicar.';
  } else {
    out.facebook = { token: decrypt(fbKey.ciphertext, fbKey.iv, fbKey.authTag), pageId: fbPageId };
  }

  return out;
}

async function graphError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: { message?: string; code?: number } };
    if (data.error && data.error.message) {
      return `Meta Graph API (${res.status}): ${data.error.message}`;
    }
    return `Meta Graph API respondió ${res.status}`;
  } catch {
    return `Meta Graph API respondió ${res.status}`;
  }
}

/** Espera a que Meta termine de procesar un contenedor de video. */
async function waitForContainer(containerId: string, token: string): Promise<void> {
  for (let i = 0; i < 12; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const res = await fetch(
      `${GRAPH}/${containerId}?fields=status_code&access_token=${encodeURIComponent(token)}`,
      { signal: AbortSignal.timeout(10_000) }
    );
    if (!res.ok) continue;
    const data = (await res.json()) as { status_code?: string };
    if (data.status_code === 'FINISHED') return;
    if (data.status_code === 'ERROR') {
      throw new Error('Meta reportó un error procesando el video.');
    }
  }
  throw new Error(
    'Meta no terminó de procesar el video a tiempo (más de 60s). Reintentaremos automáticamente.'
  );
}

interface MediaItem {
  url: string;
  kind: string;
}

/** Publica una tarjeta en Instagram (imagen simple, carrusel o reel). */
async function publishInstagram(args: {
  cred: { token: string; igBusinessId: string };
  caption: string;
  media: MediaItem[];
  mediaType: string;
}): Promise<NetworkResult> {
  const { token, igBusinessId } = args.cred;

  if (args.media.length === 0) {
    return { error: 'La tarjeta no tiene ningún archivo montado.' };
  }

  const createContainer = async (body: Record<string, string>): Promise<string> => {
    const res = await fetch(`${GRAPH}/${igBusinessId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, access_token: token }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(await graphError(res));
    const data = (await res.json()) as { id: string };
    return data.id;
  };

  let creationId: string;

  if (args.mediaType === 'carousel' && args.media.length > 1) {
    // Carrusel: un contenedor hijo por pieza, luego uno padre.
    const children: string[] = [];
    for (const m of args.media.slice(0, 10)) {
      const child =
        m.kind === 'video'
          ? await createContainer({ media_type: 'VIDEO', video_url: m.url, is_carousel_item: 'true' })
          : await createContainer({ image_url: m.url, is_carousel_item: 'true' });
      if (m.kind === 'video') await waitForContainer(child, token);
      children.push(child);
    }
    creationId = await createContainer({
      media_type: 'CAROUSEL',
      children: children.join(','),
      caption: args.caption,
    });
  } else {
    const first = args.media[0];
    if (first.kind === 'video') {
      creationId = await createContainer({
        media_type: 'REELS',
        video_url: first.url,
        share_to_feed: 'true',
        caption: args.caption,
      });
      await waitForContainer(creationId, token);
    } else {
      creationId = await createContainer({ image_url: first.url, caption: args.caption });
    }
  }

  const res = await fetch(`${GRAPH}/${igBusinessId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: creationId, access_token: token }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(await graphError(res));

  const published = (await res.json()) as { id: string };

  // Pedimos el permalink real en vez de construirlo a mano (el media id no es
  // el shortcode del post, así que /p/<id>/ no resuelve).
  let permalink: string | undefined;
  try {
    const permRes = await fetch(
      `${GRAPH}/${published.id}?fields=permalink&access_token=${encodeURIComponent(token)}`,
      { signal: AbortSignal.timeout(10_000) }
    );
    if (permRes.ok) {
      const permData = (await permRes.json()) as { permalink?: string };
      permalink = permData.permalink;
    }
  } catch {
    // El permalink es informativo: si falla, la publicación sigue siendo válida.
  }

  return { mediaId: published.id, permalink };
}

/** Publica una tarjeta en la página de Facebook. */
async function publishFacebook(args: {
  cred: { token: string; pageId: string };
  caption: string;
  media: MediaItem[];
}): Promise<NetworkResult> {
  const { token, pageId } = args.cred;
  if (args.media.length === 0) {
    return { error: 'La tarjeta no tiene ningún archivo montado.' };
  }
  const first = args.media[0];

  const endpoint = first.kind === 'video' ? `${GRAPH}/${pageId}/videos` : `${GRAPH}/${pageId}/photos`;
  const body: Record<string, string> =
    first.kind === 'video'
      ? { file_url: first.url, description: args.caption, access_token: token }
      : { url: first.url, caption: args.caption, access_token: token };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(await graphError(res));

  const data = (await res.json()) as { id?: string; post_id?: string };
  const id = data.post_id || data.id;
  return { mediaId: id, permalink: id ? `https://www.facebook.com/${id}` : undefined };
}

/**
 * Publica una tarjeta en todas sus redes.
 *
 * - Marca la tarjeta como 'publishing' mientras corre.
 * - Si TODAS las redes salen bien → 'published'.
 * - Si alguna falla → 'error', con `lastError` legible y `nextRetryAt` si
 *   todavía quedan intentos (#9). Solo se marca `failureNotified` (y por tanto
 *   se avisa al usuario) a partir del segundo fallo.
 */
export async function publishPost(args: {
  postId: string;
  workspaceId: string;
  ownerId: string;
  actorUserId?: string | null;
  /** true = disparado por el cron; cuenta para el backoff de reintentos. */
  automatic?: boolean;
}): Promise<{ ok: boolean; status: string; results: PublishResults; error?: string }> {
  const post = await prisma.contentPost.findFirst({
    where: { id: args.postId, workspaceId: args.workspaceId },
    include: POST_INCLUDE,
  });
  if (!post) return { ok: false, status: 'error', results: {}, error: 'Tarjeta no encontrada.' };

  if (post.status === 'published') {
    return { ok: true, status: 'published', results: (post.publishResult as PublishResults) || {} };
  }
  if (post.status === 'pending_approval') {
    return {
      ok: false,
      status: post.status,
      results: {},
      error: 'La tarjeta todavía no fue aprobada. Apruébala antes de publicar.',
    };
  }

  await prisma.contentPost.update({ where: { id: post.id }, data: { status: 'publishing' } });
  await logPostEvent({
    workspaceId: args.workspaceId,
    postId: post.id,
    actorUserId: args.actorUserId,
    action: 'publish_started',
    detail: args.automatic ? 'Publicación automática por calendario' : 'Publicación manual',
    isDemo: post.isDemo,
  });

  const cred = await resolveCredentials(args.ownerId);
  const media: MediaItem[] = post.media.map((m) => ({ url: m.url, kind: m.kind }));
  const caption = post.caption || '';
  const networks = (post.networks as Network[]).length
    ? (post.networks as Network[])
    : (['instagram'] as Network[]);

  const results: PublishResults = {};
  for (const net of networks) {
    try {
      if (net === 'instagram') {
        if (!cred.instagram) {
          results.instagram = { error: cred.missing.instagram || 'Instagram no está conectado.' };
        } else {
          results.instagram = await publishInstagram({
            cred: cred.instagram,
            caption,
            media,
            mediaType: post.mediaType,
          });
        }
      } else if (net === 'facebook') {
        if (!cred.facebook) {
          results.facebook = { error: cred.missing.facebook || 'Facebook no está conectado.' };
        } else {
          results.facebook = await publishFacebook({ cred: cred.facebook, caption, media });
        }
      }
    } catch (e) {
      results[net] = { error: e instanceof Error ? e.message : 'Error desconocido al publicar.' };
    }
  }

  const failed = networks.filter((n) => !results[n] || results[n]?.error);
  const allOk = failed.length === 0;

  if (allOk) {
    await prisma.contentPost.update({
      where: { id: post.id },
      data: {
        status: 'published',
        publishedAt: new Date(),
        publishResult: results as never,
        lastError: null,
        nextRetryAt: null,
        failureNotified: false,
      },
    });
    await logPostEvent({
      workspaceId: args.workspaceId,
      postId: post.id,
      actorUserId: args.actorUserId,
      action: 'published',
      detail: `Publicado en ${networks.join(', ')}`,
      meta: results as Record<string, unknown>,
      isDemo: post.isDemo,
    });
    return { ok: true, status: 'published', results };
  }

  const attempts = post.publishAttempts + 1;
  const errorText = failed
    .map((n) => `${n}: ${results[n]?.error || 'error desconocido'}`)
    .join(' · ');

  const willRetry = attempts < MAX_PUBLISH_ATTEMPTS;
  const backoffMin = RETRY_BACKOFF_MINUTES[Math.min(attempts - 1, RETRY_BACKOFF_MINUTES.length - 1)];
  const nextRetryAt = willRetry ? new Date(Date.now() + backoffMin * 60_000) : null;

  await prisma.contentPost.update({
    where: { id: post.id },
    data: {
      status: 'error',
      publishAttempts: attempts,
      lastError: errorText,
      nextRetryAt,
      publishResult: results as never,
      // #9: solo se considera "avisable" a partir del segundo fallo.
      failureNotified: attempts >= NOTIFY_AFTER_ATTEMPTS,
    },
  });

  await logPostEvent({
    workspaceId: args.workspaceId,
    postId: post.id,
    actorUserId: args.actorUserId,
    action: willRetry ? 'retry_scheduled' : 'publish_failed',
    detail: willRetry
      ? `Intento ${attempts}/${MAX_PUBLISH_ATTEMPTS} falló. Reintento en ${backoffMin} min. ${errorText}`
      : `Intento ${attempts}/${MAX_PUBLISH_ATTEMPTS} falló (último). ${errorText}`,
    meta: results as Record<string, unknown>,
    isDemo: post.isDemo,
  });

  return { ok: false, status: 'error', results, error: errorText };
}

/**
 * Barrido del cron: publica lo que ya venció y reintenta lo que quedó en error
 * con `nextRetryAt` vencido.
 *
 * NOTA (plan Hobby de Vercel): los cron jobs del plan gratuito corren como
 * máximo 1 vez/día sin importar el `schedule` de `vercel.json`. Ver la sección
 * correspondiente del PR — mientras no se resuelva, la hora exacta de
 * publicación NO se cumple en producción.
 */
export async function runDueContentPosts(limit = 25): Promise<{
  published: number;
  failed: number;
  processed: string[];
}> {
  const now = new Date();

  const due = await prisma.contentPost.findMany({
    where: {
      inBank: false,
      OR: [
        { status: 'scheduled', scheduledFor: { lte: now } },
        { status: 'error', nextRetryAt: { not: null, lte: now }, publishAttempts: { lt: MAX_PUBLISH_ATTEMPTS } },
      ],
    },
    select: { id: true, workspaceId: true },
    orderBy: { scheduledFor: 'asc' },
    take: limit,
  });

  let published = 0;
  let failed = 0;
  const processed: string[] = [];

  for (const row of due) {
    const ws = await prisma.workspace.findUnique({
      where: { id: row.workspaceId },
      select: { ownerId: true },
    });
    if (!ws) continue;

    const res = await publishPost({
      postId: row.id,
      workspaceId: row.workspaceId,
      ownerId: ws.ownerId,
      automatic: true,
    });
    processed.push(row.id);
    if (res.ok) published++;
    else failed++;
  }

  return { published, failed, processed };
}
