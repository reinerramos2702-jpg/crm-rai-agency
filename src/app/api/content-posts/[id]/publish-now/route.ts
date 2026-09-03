import { NextRequest, NextResponse } from 'next/server';
import { requireRole, isRoleContext } from '@/lib/roles';
import { publishPost } from '@/lib/content-calendar/publisher';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/content-posts/:id/publish-now
 * Dispara la publicación inmediata de una tarjeta (sin esperar `scheduledFor`),
 * botón "Publicar ahora" de PostEditor (Bloque 2B, núcleo). Usa el motor de
 * publicación ya existente (`publisher.ts`) — contenedores Graph API,
 * reintento inteligente (#09) y estados por color quedan iguales al flujo
 * automático (`runDueContentPosts`, corrido por el cron/worker).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, ['admin', 'gerente', 'agente']);
  if (!isRoleContext(ctx)) return ctx;
  const { id } = await params;

  const result = await publishPost({
    postId: id,
    workspaceId: ctx.workspace.id,
    ownerId: ctx.workspace.ownerId,
    actorUserId: ctx.auth.userId,
    automatic: false,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error || 'No se pudo publicar.', status: result.status, results: result.results },
      { status: 422 }
    );
  }

  return NextResponse.json(result);
}
