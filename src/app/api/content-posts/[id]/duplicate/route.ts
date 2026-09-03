import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isRoleContext, requireRole } from '@/lib/roles';
import { getSettings, postToDTO, logPostEvent, POST_INCLUDE } from '@/lib/content-calendar/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/content-posts/:id/duplicate → #05 Duplicar tarjeta.
 * Clona caption/media/networks/mediaType a un post nuevo en DRAFT, sin fecha.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireRole(req, ['admin', 'gerente', 'agente']);
  if (!isRoleContext(ctx)) return ctx;

  const source = await prisma.contentPost.findFirst({
    where: { id, workspaceId: ctx.workspace.id },
    include: POST_INCLUDE,
  });
  if (!source) {
    return NextResponse.json({ error: 'Publicación no encontrada.' }, { status: 404 });
  }

  const settings = await getSettings(ctx.workspace.id);

  const duplicated = await prisma.contentPost.create({
    data: {
      workspaceId: ctx.workspace.id,
      title: source.title,
      caption: source.caption,
      networks: source.networks,
      mediaType: source.mediaType,
      status: 'draft',
      inBank: false,
      scheduledFor: null,
      createdById: ctx.auth.userId,
      media: {
        create: source.media.map((m) => ({
          url: m.url,
          thumbUrl: m.thumbUrl,
          kind: m.kind,
          mimeType: m.mimeType,
          fileName: m.fileName,
          sizeBytes: m.sizeBytes,
          width: m.width,
          height: m.height,
          durationSec: m.durationSec,
          sortIndex: m.sortIndex,
          clipFromSec: m.clipFromSec,
          clipToSec: m.clipToSec,
          sourceUrl: m.sourceUrl,
        })),
      },
    },
    include: POST_INCLUDE,
  });

  await logPostEvent({
    workspaceId: ctx.workspace.id,
    postId: duplicated.id,
    actorUserId: ctx.auth.userId,
    action: 'duplicated',
    detail: `Duplicada desde ${source.id}`,
  });

  return NextResponse.json({ post: postToDTO(duplicated, settings.timezone) }, { status: 201 });
}
