import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { CONTENT_GENERATOR_WRITE_ROLES, MODULE_ACCESS, isRoleContext, requireRole } from '@/lib/roles';
import { isMissingTableError } from '@/lib/scheduled-posts';
import { TtlCache } from '@/lib/ttl-cache';
import {
  MEDIA_TAKE,
  buildMediaPayload,
  type CampaignAssetRow,
  type GridAssetRow,
  type PlannedPostRow,
} from '@/lib/media-build';
import type { MediaPayload } from '@/lib/media-types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MEDIA_ROLES = MODULE_ACCESS['/contenido-multimedia'];

/** Caché corta por workspace: dos pestañas o un doble clic comparten la misma lectura. */
const cache = new TtlCache<MediaPayload>(20_000, 100);

async function loadPayload(workspaceId: string): Promise<MediaPayload> {
  const [grid, campaign, planned, brand] = await Promise.all([
    prisma.contentGridAsset.findMany({
      where: { grid: { workspaceId } },
      orderBy: { createdAt: 'desc' },
      take: MEDIA_TAKE.grid,
      select: {
        id: true,
        themeIndex: true,
        slideNumber: true,
        kind: true,
        prompt: true,
        publicUrl: true,
        createdAt: true,
        grid: { select: { id: true, name: true } },
      },
    }),
    prisma.asset.findMany({
      where: { task: { execution: { campaign: { workspaceId } } } },
      orderBy: { createdAt: 'desc' },
      take: MEDIA_TAKE.campaign,
      select: {
        id: true,
        kind: true,
        publicUrl: true,
        createdAt: true,
        task: {
          select: { index: true, execution: { select: { campaign: { select: { id: true, name: true } } } } },
        },
      },
    }),
    // La tabla ScheduledPost puede no existir todavía en una base sin migrar: esa fuente queda vacía.
    prisma.scheduledPost
      .findMany({
        where: { workspaceId, mediaUrls: { isEmpty: false } },
        orderBy: { scheduledAt: 'desc' },
        take: MEDIA_TAKE.planned,
        select: { id: true, dayNumber: true, caption: true, mediaUrls: true, scheduledAt: true, status: true },
      })
      .catch((e: unknown) => {
        if (isMissingTableError(e)) return [] as PlannedPostRow[];
        throw e;
      }),
    prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { brandDocName: true, brandDocUpdatedAt: true },
    }),
  ]);

  return buildMediaPayload({
    grid: grid as GridAssetRow[],
    campaign: campaign as CampaignAssetRow[],
    planned: planned as PlannedPostRow[],
    brand,
  });
}

/**
 * GET /api/media            → activos que ya existen en el workspace activo (nunca de otro).
 * GET /api/media?fresh=1    → ignora la caché corta (tras subir el documento de marca).
 *
 * No hay subida libre de archivos: no existe una tabla que guarde archivos sueltos por
 * workspace. Aquí solo se agrega lo generado por el Generador, las campañas, la
 * programación y el documento de marca.
 */
export async function GET(req: NextRequest) {
  const ctx = await requireRole(req, MEDIA_ROLES);
  if (!isRoleContext(ctx)) return ctx;

  const workspaceId = ctx.workspace.id;
  const fresh = req.nextUrl.searchParams.get('fresh') === '1';
  if (fresh) cache.delete(workspaceId);

  try {
    const payload = await cache.getOrCompute(workspaceId, () => loadPayload(workspaceId));
    return NextResponse.json(
      { ...payload, canUploadBrandDoc: CONTENT_GENERATOR_WRITE_ROLES.includes(ctx.role) },
      { headers: { 'Cache-Control': fresh ? 'no-store' : 'private, max-age=5, stale-while-revalidate=30' } },
    );
  } catch {
    return NextResponse.json({ error: 'No se pudo cargar la biblioteca. Inténtalo de nuevo.' }, { status: 500 });
  }
}
