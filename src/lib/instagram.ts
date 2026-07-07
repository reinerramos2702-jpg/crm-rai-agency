/**
 * Instagram Graph API — motor de publicación y automatización de DMs.
 * Server-only (usa crypto + Prisma). NUNCA importar desde componentes cliente.
 *
 * Credenciales: primero SocialAccount en DB (token cifrado AES-256-GCM),
 * fallback a variables de entorno:
 *   INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_BUSINESS_ID, FACEBOOK_PAGE_ID
 *
 * Requisitos Meta (app tipo Business):
 *   - Publicación: instagram_basic + instagram_content_publish + pages_read_engagement
 *   - Reply a comentarios: instagram_manage_comments
 *   - DM privado (private reply): instagram_manage_messages (requiere App Review)
 */
import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/crypto';

const GRAPH = 'https://graph.facebook.com/v21.0';

export type IgConfig = {
  token: string;
  igUserId: string;
  pageId: string | null;
  accountId: string | null; // id de SocialAccount si viene de DB
};

export type PublishResult = {
  ok: boolean;
  igMediaId?: string;
  permalink?: string;
  error?: string;
};

type GraphError = { message?: string; code?: number; error_subcode?: number; type?: string };

export class InstagramApiError extends Error {
  code?: number;
  constructor(message: string, code?: number) {
    super(message);
    this.name = 'InstagramApiError';
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Config / credenciales
// ---------------------------------------------------------------------------

export async function getIgConfig(workspaceId: string): Promise<IgConfig | null> {
  const account = await prisma.socialAccount.findUnique({
    where: { workspaceId_platform: { workspaceId, platform: 'instagram' } },
  });

  if (account?.tokenCiphertext && account.tokenIv && account.tokenAuthTag && account.igUserId) {
    try {
      const token = decrypt(account.tokenCiphertext, account.tokenIv, account.tokenAuthTag);
      return {
        token,
        igUserId: account.igUserId,
        pageId: account.pageId || process.env.FACEBOOK_PAGE_ID || null,
        accountId: account.id,
      };
    } catch {
      // token corrupto o KEYS_ENCRYPTION_KEY cambiada → probar env fallback
    }
  }

  const envToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const envIgId = process.env.INSTAGRAM_BUSINESS_ID;
  if (envToken && envIgId) {
    return {
      token: envToken,
      igUserId: envIgId,
      pageId: process.env.FACEBOOK_PAGE_ID || null,
      accountId: account?.id ?? null,
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------

async function igFetch<T = Record<string, unknown>>(
  path: string,
  opts: { method?: 'GET' | 'POST' | 'DELETE'; params?: Record<string, string>; token: string }
): Promise<T> {
  const url = new URL(`${GRAPH}${path}`);
  const method = opts.method || 'GET';
  const params = { ...(opts.params || {}), access_token: opts.token };

  let init: RequestInit = { method };
  if (method === 'GET' || method === 'DELETE') {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  } else {
    init = {
      method,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params).toString(),
    };
  }

  const res = await fetch(url.toString(), init);
  const json = (await res.json().catch(() => ({}))) as T & { error?: GraphError };
  if (!res.ok || json.error) {
    const err = json.error || {};
    throw new InstagramApiError(
      err.message || `Graph API HTTP ${res.status}`,
      err.code
    );
  }
  return json;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Cuenta
// ---------------------------------------------------------------------------

export async function verifyIgAccount(token: string, igUserId: string) {
  return igFetch<{ id: string; username: string; name?: string; profile_picture_url?: string; followers_count?: number; media_count?: number }>(
    `/${igUserId}`,
    { token, params: { fields: 'id,username,name,profile_picture_url,followers_count,media_count' } }
  );
}

// ---------------------------------------------------------------------------
// Contenedores de media
// ---------------------------------------------------------------------------

async function createContainer(
  cfg: IgConfig,
  params: Record<string, string>
): Promise<string> {
  const json = await igFetch<{ id: string }>(`/${cfg.igUserId}/media`, {
    method: 'POST',
    token: cfg.token,
    params,
  });
  return json.id;
}

/** Espera a que un contenedor (video/reel/carrusel) esté FINISHED. */
async function waitForContainer(cfg: IgConfig, creationId: string, maxAttempts = 20): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    const json = await igFetch<{ status_code?: string }>(`/${creationId}`, {
      token: cfg.token,
      params: { fields: 'status_code' },
    });
    const status = json.status_code || 'FINISHED';
    if (status === 'FINISHED') return;
    if (status === 'ERROR' || status === 'EXPIRED') {
      throw new InstagramApiError(`Contenedor en estado ${status}`);
    }
    await sleep(2500);
  }
  throw new InstagramApiError('Timeout esperando procesamiento del contenedor');
}

async function publishContainer(cfg: IgConfig, creationId: string): Promise<string> {
  const json = await igFetch<{ id: string }>(`/${cfg.igUserId}/media_publish`, {
    method: 'POST',
    token: cfg.token,
    params: { creation_id: creationId },
  });
  return json.id;
}

async function fetchPermalink(cfg: IgConfig, mediaId: string): Promise<string | undefined> {
  try {
    const json = await igFetch<{ permalink?: string }>(`/${mediaId}`, {
      token: cfg.token,
      params: { fields: 'permalink' },
    });
    return json.permalink;
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Publicación por tipo
// ---------------------------------------------------------------------------

export type PublishablePost = {
  type: string; // 'image' | 'carousel' | 'reel' | 'story'
  caption: string;
  mediaUrls: string[];
  coverUrl?: string | null;
};

const isVideoUrl = (u: string) => /\.(mp4|mov)(\?|$)/i.test(u);

/** Publica un post en Instagram según su tipo. Lanza InstagramApiError si falla. */
export async function publishToInstagram(cfg: IgConfig, post: PublishablePost): Promise<PublishResult> {
  const urls = (post.mediaUrls || []).filter(Boolean);
  if (urls.length === 0) return { ok: false, error: 'El post no tiene URLs de media' };

  let creationId: string;

  switch (post.type) {
    case 'carousel': {
      if (urls.length < 2 || urls.length > 10) {
        return { ok: false, error: 'Un carrusel necesita entre 2 y 10 imágenes/videos' };
      }
      const children: string[] = [];
      for (const u of urls) {
        const childParams: Record<string, string> = { is_carousel_item: 'true' };
        if (isVideoUrl(u)) {
          childParams.media_type = 'VIDEO';
          childParams.video_url = u;
        } else {
          childParams.image_url = u;
        }
        children.push(await createContainer(cfg, childParams));
      }
      // los hijos de video necesitan procesamiento
      if (urls.some(isVideoUrl)) {
        for (const child of children) await waitForContainer(cfg, child, 24);
      }
      creationId = await createContainer(cfg, {
        media_type: 'CAROUSEL',
        children: children.join(','),
        caption: post.caption || '',
      });
      await waitForContainer(cfg, creationId, 12);
      break;
    }
    case 'reel': {
      const params: Record<string, string> = {
        media_type: 'REELS',
        video_url: urls[0],
        caption: post.caption || '',
      };
      if (post.coverUrl) params.cover_url = post.coverUrl;
      creationId = await createContainer(cfg, params);
      await waitForContainer(cfg, creationId, 24);
      break;
    }
    case 'story': {
      const params: Record<string, string> = { media_type: 'STORIES' };
      if (isVideoUrl(urls[0])) params.video_url = urls[0];
      else params.image_url = urls[0];
      creationId = await createContainer(cfg, params);
      if (isVideoUrl(urls[0])) await waitForContainer(cfg, creationId, 24);
      break;
    }
    default: {
      // 'image'
      creationId = await createContainer(cfg, {
        image_url: urls[0],
        caption: post.caption || '',
      });
      break;
    }
  }

  const igMediaId = await publishContainer(cfg, creationId);
  const permalink = await fetchPermalink(cfg, igMediaId);
  return { ok: true, igMediaId, permalink };
}

// ---------------------------------------------------------------------------
// Comentarios y DMs (private replies)
// ---------------------------------------------------------------------------

/** Respuesta pública a un comentario. */
export async function replyToComment(cfg: IgConfig, commentId: string, message: string) {
  return igFetch<{ id: string }>(`/${commentId}/replies`, {
    method: 'POST',
    token: cfg.token,
    params: { message },
  });
}

/**
 * DM privado en respuesta a un comentario (Instagram Private Replies).
 * Ventana de 7 días desde el comentario. Requiere instagram_manage_messages
 * aprobado en App Review + FACEBOOK_PAGE_ID configurado.
 */
export async function sendPrivateReply(cfg: IgConfig, commentId: string, text: string) {
  const pageId = cfg.pageId;
  if (!pageId) {
    throw new InstagramApiError('FACEBOOK_PAGE_ID no configurado (necesario para DMs)');
  }
  return igFetch<{ recipient_id?: string; message_id?: string }>(`/${pageId}/messages`, {
    method: 'POST',
    token: cfg.token,
    params: {
      recipient: JSON.stringify({ comment_id: commentId }),
      message: JSON.stringify({ text }),
      messaging_type: 'RESPONSE',
    },
  });
}

// ---------------------------------------------------------------------------
// Motor de publicación programada (para cron)
// ---------------------------------------------------------------------------

const MAX_ATTEMPTS = 3;

/**
 * Publica los posts programados vencidos (todas las workspaces).
 * Devuelve resumen para el log del cron.
 */
export async function processScheduledPosts(limit = 5) {
  const now = new Date();
  const due = await prisma.socialPost.findMany({
    where: { status: 'scheduled', scheduledAt: { lte: now } },
    orderBy: { scheduledAt: 'asc' },
    take: limit,
  });

  const results: Array<{ id: string; ok: boolean; error?: string }> = [];

  for (const post of due) {
    // lock optimista: solo procesar si sigue 'scheduled'
    const locked = await prisma.socialPost.updateMany({
      where: { id: post.id, status: 'scheduled' },
      data: { status: 'publishing', attemptCount: { increment: 1 } },
    });
    if (locked.count === 0) continue;

    const cfg = await getIgConfig(post.workspaceId);
    if (!cfg) {
      await failPost(post.id, post.workspaceId, post.attemptCount + 1, 'Instagram no conectado (sin token)');
      results.push({ id: post.id, ok: false, error: 'sin token' });
      continue;
    }

    try {
      const res = await publishToInstagram(cfg, post);
      if (!res.ok) throw new InstagramApiError(res.error || 'Fallo desconocido');
      await prisma.socialPost.update({
        where: { id: post.id },
        data: {
          status: 'published',
          publishedAt: new Date(),
          igMediaId: res.igMediaId,
          permalink: res.permalink,
          errorMessage: null,
        },
      });
      await logAction(post.workspaceId, {
        kind: 'publish',
        status: 'ok',
        postId: post.id,
        detail: `Publicado ${post.type} → ${res.permalink || res.igMediaId}`,
      });
      results.push({ id: post.id, ok: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await failPost(post.id, post.workspaceId, post.attemptCount + 1, msg);
      results.push({ id: post.id, ok: false, error: msg });
    }
  }

  return { processed: results.length, results };
}

async function failPost(postId: string, workspaceId: string, attempts: number, error: string) {
  // reintento automático en el próximo tick del cron hasta MAX_ATTEMPTS
  const final = attempts >= MAX_ATTEMPTS;
  await prisma.socialPost.update({
    where: { id: postId },
    data: { status: final ? 'failed' : 'scheduled', errorMessage: error },
  });
  await logAction(workspaceId, {
    kind: final ? 'error' : 'publish',
    status: 'failed',
    postId,
    detail: `Intento ${attempts}/${MAX_ATTEMPTS}: ${error}`,
  });
}

// ---------------------------------------------------------------------------
// Motor de keywords (para webhook de comentarios)
// ---------------------------------------------------------------------------

export type IncomingComment = {
  commentId: string;
  mediaId?: string;
  text: string;
  fromId?: string;
  fromUsername?: string;
  igAccountId?: string; // ig user id dueño de la cuenta (entry.id del webhook)
};

function matchesRule(text: string, keyword: string, matchType: string): boolean {
  const t = text.toLowerCase().trim();
  const k = keyword.toLowerCase().trim();
  if (!k) return false;
  if (matchType === 'exact') return t === k;
  // 'contains' con borde de palabra para evitar falsos positivos tipo "crm" en "macramé"
  return new RegExp(`(^|[^\\p{L}\\p{N}])${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\\p{L}\\p{N}]|$)`, 'iu').test(t);
}

/**
 * Procesa un comentario entrante: busca reglas de keyword del workspace,
 * responde al comentario y/o envía DM. Dedupe por igCommentId.
 */
export async function processIncomingComment(workspaceId: string, comment: IncomingComment) {
  // no responderse a sí mismo (evita loops con las replies propias)
  if (comment.fromId && comment.igAccountId && comment.fromId === comment.igAccountId) {
    return { skipped: 'own_comment' };
  }

  // dedupe: ¿ya procesamos este comentario?
  const already = await prisma.socialActionLog.findFirst({
    where: { igCommentId: comment.commentId, kind: { in: ['comment_reply', 'dm_sent'] } },
    select: { id: true },
  });
  if (already) return { skipped: 'duplicate' };

  const rules = await prisma.keywordRule.findMany({
    where: { workspaceId, enabled: true },
    orderBy: { createdAt: 'asc' },
  });

  const rule = rules.find((r) => {
    if (!matchesRule(comment.text, r.keyword, r.matchType)) return false;
    if (r.mediaScope === 'specific' && comment.mediaId) {
      return r.mediaIds.includes(comment.mediaId);
    }
    return true;
  });
  if (!rule) return { skipped: 'no_match' };

  const cfg = await getIgConfig(workspaceId);
  if (!cfg) {
    await logAction(workspaceId, {
      kind: 'webhook', status: 'failed', ruleId: rule.id,
      igCommentId: comment.commentId,
      detail: 'Keyword detectada pero Instagram no está conectado',
    });
    return { error: 'no_config' };
  }

  const outcome: Record<string, unknown> = { rule: rule.keyword };

  // 1) Respuesta pública al comentario
  if (rule.replyToComment && rule.commentReplies.length > 0) {
    const msg = rule.commentReplies[Math.floor(Math.random() * rule.commentReplies.length)];
    try {
      await replyToComment(cfg, comment.commentId, msg);
      outcome.commentReply = true;
      await logAction(workspaceId, {
        kind: 'comment_reply', status: 'ok', ruleId: rule.id, igCommentId: comment.commentId,
        igUserId: comment.fromId, igUsername: comment.fromUsername,
        detail: `Reply a "${comment.text.slice(0, 80)}" → "${msg.slice(0, 80)}"`,
      });
    } catch (e) {
      outcome.commentReplyError = e instanceof Error ? e.message : String(e);
      await logAction(workspaceId, {
        kind: 'comment_reply', status: 'failed', ruleId: rule.id, igCommentId: comment.commentId,
        detail: String(outcome.commentReplyError),
      });
    }
  }

  // 2) DM privado (private reply) — pendiente de Meta App Review hasta aprobar permisos
  if (rule.dmEnabled && rule.dmMessage) {
    const text = rule.dmLink ? `${rule.dmMessage}\n\n${rule.dmLink}` : rule.dmMessage;
    try {
      await sendPrivateReply(cfg, comment.commentId, text);
      outcome.dm = true;
      await logAction(workspaceId, {
        kind: 'dm_sent', status: 'ok', ruleId: rule.id, igCommentId: comment.commentId,
        igUserId: comment.fromId, igUsername: comment.fromUsername,
        detail: `DM enviado (keyword "${rule.keyword}")`,
      });
    } catch (e) {
      outcome.dmError = e instanceof Error ? e.message : String(e);
      await logAction(workspaceId, {
        kind: 'dm_sent', status: 'failed', ruleId: rule.id, igCommentId: comment.commentId,
        detail: `DM falló (¿permiso instagram_manage_messages sin aprobar?): ${outcome.dmError}`,
      });
    }
  }

  await prisma.keywordRule.update({
    where: { id: rule.id },
    data: { triggerCount: { increment: 1 }, lastTriggeredAt: new Date() },
  });

  return outcome;
}

// ---------------------------------------------------------------------------
// Log helper
// ---------------------------------------------------------------------------

export async function logAction(
  workspaceId: string,
  data: {
    kind: string;
    status?: string;
    ruleId?: string | null;
    postId?: string | null;
    igCommentId?: string | null;
    igUserId?: string | null;
    igUsername?: string | null;
    detail?: string;
    meta?: Record<string, unknown>;
  }
) {
  try {
    await prisma.socialActionLog.create({
      data: {
        workspaceId,
        kind: data.kind,
        status: data.status || 'ok',
        ruleId: data.ruleId || null,
        postId: data.postId || null,
        igCommentId: data.igCommentId || null,
        igUserId: data.igUserId || null,
        igUsername: data.igUsername || null,
        detail: data.detail || '',
        meta: (data.meta || {}) as object,
      },
    });
  } catch {
    // el log nunca debe romper el flujo principal
  }
}
