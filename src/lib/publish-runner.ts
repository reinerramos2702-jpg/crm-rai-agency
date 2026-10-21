/**
 * Ejecutor de publicaciones programadas (Corte B).
 *
 * Garantías:
 *  - Un post nunca se publica dos veces: el "claim" es un updateMany condicionado
 *    a status='scheduled' (atómico en Postgres); solo gana quien obtiene count===1.
 *  - Reanudación sin duplicar: igContainerId se guarda apenas existe.
 *  - Errores no reintentables → failed; reintentables → scheduled con espera creciente
 *    hasta MAX_ATTEMPTS.
 *  - Locks vencidos (proceso muerto a mitad) se recuperan a 'scheduled'.
 * La BD y el publicador se inyectan para poder probarlo sin red ni Postgres.
 */
import {
  MAX_ATTEMPTS,
  STALE_LOCK_MS,
  retryDelayMs,
  safeError,
  type MediaType,
  type PublishMode,
} from './scheduled-posts';
import { NonRetryableError, type IgPublisher } from './instagram-publisher';

export interface PostRow {
  id: string;
  workspaceId: string;
  caption: string;
  mediaUrls: string[];
  mediaType: string;
  scheduledAt: Date;
  status: string;
  attempts: number;
  igContainerId: string | null;
  createdByUserId: string | null;
  dayNumber: number | null;
  lastError?: string | null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface RunnerDb {
  scheduledPost: {
    findMany(args: any): Promise<PostRow[]>;
    findFirst(args: any): Promise<PostRow | null>;
    updateMany(args: any): Promise<{ count: number }>;
    update(args: any): Promise<unknown>;
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export interface RunnerDeps {
  db: RunnerDb;
  publisherFor: (workspaceId: string, mode: PublishMode) => Promise<IgPublisher>;
  audit: (e: { workspaceId: string; userId: string; action: string; entityId: string; meta: Record<string, unknown> }) => Promise<void>;
  mode: PublishMode;
  now?: () => Date;
}

export interface RunSummary {
  recovered: number;
  due: number;
  claimed: number;
  published: number;
  retried: number;
  failed: number;
}

async function processClaimed(post: PostRow, deps: RunnerDeps, summary: RunSummary): Promise<void> {
  const { db, mode } = deps;
  const now = (deps.now ?? (() => new Date()))();
  const userId = post.createdByUserId ?? 'system';
  try {
    if (mode === 'live' && post.mediaUrls.length === 0) {
      throw new NonRetryableError('El post no tiene imágenes con URL pública');
    }
    const publisher = await deps.publisherFor(post.workspaceId, mode);
    const result = await publisher.publish(
      {
        id: post.id,
        caption: post.caption,
        mediaUrls: post.mediaUrls,
        mediaType: (post.mediaType === 'carousel' ? 'carousel' : 'image') as MediaType,
        igContainerId: post.igContainerId,
      },
      async (containerId) => {
        await db.scheduledPost.update({ where: { id: post.id }, data: { igContainerId: containerId } });
      },
    );
    await db.scheduledPost.update({
      where: { id: post.id },
      data: {
        status: 'published',
        igMediaId: result.igMediaId,
        permalink: result.permalink,
        simulated: result.simulated,
        publishedAt: now,
        lockedAt: null,
        lastError: null,
      },
    });
    summary.published++;
    await deps.audit({
      workspaceId: post.workspaceId,
      userId,
      action: 'content.schedule.published',
      entityId: post.id,
      meta: { igMediaId: result.igMediaId, simulated: result.simulated, day: post.dayNumber },
    });
  } catch (e) {
    const message = safeError(e);
    const terminal = e instanceof NonRetryableError || post.attempts >= MAX_ATTEMPTS;
    if (terminal) {
      await db.scheduledPost.update({
        where: { id: post.id },
        data: { status: 'failed', lockedAt: null, lastError: message },
      });
      summary.failed++;
    } else {
      await db.scheduledPost.update({
        where: { id: post.id },
        data: {
          status: 'scheduled',
          lockedAt: null,
          scheduledAt: new Date(now.getTime() + retryDelayMs(post.attempts)),
          lastError: `Intento ${post.attempts}/${MAX_ATTEMPTS} falló: ${message}`,
        },
      });
      summary.retried++;
    }
    await deps.audit({
      workspaceId: post.workspaceId,
      userId,
      action: terminal ? 'content.schedule.failed' : 'content.schedule.retry',
      entityId: post.id,
      meta: { error: message, attempts: post.attempts, day: post.dayNumber },
    });
  }
}

/** Intenta tomar el post (scheduled → publishing). Devuelve la fila con attempts ya incrementado. */
async function claim(post: PostRow, deps: RunnerDeps): Promise<PostRow | null> {
  const now = (deps.now ?? (() => new Date()))();
  const res = await deps.db.scheduledPost.updateMany({
    where: { id: post.id, status: 'scheduled' },
    data: { status: 'publishing', lockedAt: now, attempts: { increment: 1 } },
  });
  if (res.count !== 1) return null;
  return { ...post, status: 'publishing', attempts: post.attempts + 1 };
}

/** Publica los posts vencidos de TODOS los workspaces (lo invoca el cron protegido). */
export async function runDuePosts(deps: RunnerDeps, limit = 20): Promise<RunSummary> {
  const now = (deps.now ?? (() => new Date()))();
  const summary: RunSummary = { recovered: 0, due: 0, claimed: 0, published: 0, retried: 0, failed: 0 };

  const rec = await deps.db.scheduledPost.updateMany({
    where: { status: 'publishing', lockedAt: { lt: new Date(now.getTime() - STALE_LOCK_MS) } },
    data: { status: 'scheduled', lockedAt: null, lastError: 'Bloqueo expirado: se reanuda' },
  });
  summary.recovered = rec.count;

  const due = await deps.db.scheduledPost.findMany({
    where: { status: 'scheduled', scheduledAt: { lte: now } },
    orderBy: { scheduledAt: 'asc' },
    take: limit,
  });
  summary.due = due.length;

  for (const post of due) {
    const claimed = await claim(post, deps);
    if (!claimed) continue;
    summary.claimed++;
    await processClaimed(claimed, deps, summary);
  }
  return summary;
}

/** "Publicar ahora": un post concreto del workspace, sin esperar a su hora. */
export async function publishPostNow(
  deps: RunnerDeps,
  workspaceId: string,
  postId: string,
): Promise<{ ok: boolean; status: string; error?: string }> {
  const now = (deps.now ?? (() => new Date()))();
  const post = await deps.db.scheduledPost.findFirst({ where: { id: postId, workspaceId } });
  if (!post) return { ok: false, status: 'not_found', error: 'Publicación no encontrada' };
  if (!['scheduled', 'failed', 'draft'].includes(post.status)) {
    return { ok: false, status: post.status, error: `No se puede publicar un post en estado ${post.status}` };
  }
  // reabre (failed/draft → scheduled) solo si sigue en ese estado y es de este workspace
  const reopen = await deps.db.scheduledPost.updateMany({
    where: { id: postId, workspaceId, status: { in: ['scheduled', 'failed', 'draft'] } },
    data: { status: 'scheduled', scheduledAt: now, attempts: 0, lastError: null },
  });
  if (reopen.count !== 1) return { ok: false, status: 'conflict', error: 'La publicación cambió de estado' };

  const claimed = await claim({ ...post, status: 'scheduled', attempts: 0 }, deps);
  if (!claimed) return { ok: false, status: 'conflict', error: 'Otro proceso ya la está publicando' };
  const summary: RunSummary = { recovered: 0, due: 1, claimed: 1, published: 0, retried: 0, failed: 0 };
  await processClaimed(claimed, deps, summary);
  const ok = summary.published === 1;
  const after = await deps.db.scheduledPost.findFirst({ where: { id: postId, workspaceId } });
  return { ok, status: after?.status ?? 'unknown', error: ok ? undefined : after?.lastError ?? 'Falló' };
}
