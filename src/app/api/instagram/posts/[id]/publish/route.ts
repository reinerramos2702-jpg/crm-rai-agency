import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isRoleContext, requireRole } from '@/lib/roles';
import { getIgConfig, publishToInstagram, logAction } from '@/lib/instagram';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** Publicar ahora (manual). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, ['admin', 'gerente', 'agente']);
  if (!isRoleContext(ctx)) return ctx;
  const { id } = await params;

  const post = await prisma.socialPost.findFirst({
    where: { id, workspaceId: ctx.workspace.id },
  });
  if (!post) return NextResponse.json({ error: 'Post no encontrado' }, { status: 404 });
  if (post.status === 'published') {
    return NextResponse.json({ error: 'Este post ya fue publicado' }, { status: 400 });
  }
  if (post.status === 'publishing') {
    return NextResponse.json({ error: 'Este post ya se está publicando' }, { status: 409 });
  }

  const cfg = await getIgConfig(ctx.workspace.id);
  if (!cfg) {
    return NextResponse.json(
      { error: 'Instagram no conectado. Configura el token en la pestaña Cuenta o en las variables de entorno.' },
      { status: 400 }
    );
  }

  await prisma.socialPost.update({
    where: { id },
    data: { status: 'publishing', attemptCount: { increment: 1 } },
  });

  try {
    const res = await publishToInstagram(cfg, post);
    if (!res.ok) throw new Error(res.error || 'Fallo desconocido');

    const updated = await prisma.socialPost.update({
      where: { id },
      data: {
        status: 'published',
        publishedAt: new Date(),
        igMediaId: res.igMediaId,
        permalink: res.permalink,
        errorMessage: null,
      },
    });
    await logAction(ctx.workspace.id, {
      kind: 'publish', status: 'ok', postId: id,
      detail: `Publicación manual ${post.type} → ${res.permalink || res.igMediaId}`,
    });
    return NextResponse.json({ ok: true, post: updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const updated = await prisma.socialPost.update({
      where: { id },
      data: { status: 'failed', errorMessage: msg },
    });
    await logAction(ctx.workspace.id, {
      kind: 'error', status: 'failed', postId: id,
      detail: `Publicación manual falló: ${msg}`,
    });
    return NextResponse.json({ error: msg, post: updated }, { status: 502 });
  }
}
