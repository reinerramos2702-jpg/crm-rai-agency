import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isRoleContext, requireRole } from '@/lib/roles';
import {
  getSettings,
  checkDayCapacity,
  postsInDayRange,
  postToDTO,
  logPostEvent,
  POST_INCLUDE,
} from '@/lib/content-calendar/service';
import { dayKey } from '@/lib/content-calendar/timezone';
import { MEDIA_TYPE_LABELS, NETWORKS, type MediaType, type Network } from '@/lib/content-calendar/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET  /api/content-posts?from=YYYY-MM-DD&to=YYYY-MM-DD → posts programados en el rango
 * POST /api/content-posts → crea una tarjeta (borrador o programada)
 *
 * NOTA de roles: `roles-shared.ts` en este worktree todavía no trae
 * `canManageContent` (Bloque 1 no está mergeado aquí). Por decisión de la
 * noche del 3-sep-2026 de NO forzar refactors cruzados, se usa
 * `requireRole(req, ['admin', 'gerente', 'agente'])` igual que el resto del
 * módulo — mismo criterio que `settings/route.ts` usa para sus propias rutas.
 */

const VALID_NETWORKS = new Set(NETWORKS.map((n) => n.id));
const VALID_MEDIA_TYPES = new Set(Object.keys(MEDIA_TYPE_LABELS));
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest) {
  const ctx = await requireRole(req, ['admin', 'gerente', 'agente', 'viewer']);
  if (!isRoleContext(ctx)) return ctx;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!from || !to || !DAY.test(from) || !DAY.test(to)) {
    return NextResponse.json(
      { error: 'Parámetros "from" y "to" son requeridos, formato YYYY-MM-DD.' },
      { status: 400 }
    );
  }

  const settings = await getSettings(ctx.workspace.id);
  const posts = await postsInDayRange(ctx.workspace.id, from, to, settings.timezone);

  return NextResponse.json({
    posts: posts.map((p) => postToDTO(p, settings.timezone)),
  });
}

export async function POST(req: NextRequest) {
  const ctx = await requireRole(req, ['admin', 'gerente', 'agente']);
  if (!isRoleContext(ctx)) return ctx;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const caption = typeof body.caption === 'string' ? body.caption : null;

  const mediaUrls = Array.isArray(body.mediaUrls)
    ? body.mediaUrls.filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
    : [];

  const networksInput = Array.isArray(body.networks) ? body.networks : [];
  if (
    networksInput.length === 0 ||
    !networksInput.every((n) => typeof n === 'string' && VALID_NETWORKS.has(n as Network))
  ) {
    return NextResponse.json(
      { error: `"networks" debe ser un arreglo no vacío con valores válidos: ${Array.from(VALID_NETWORKS).join(', ')}.` },
      { status: 400 }
    );
  }
  const networks = networksInput as Network[];

  const mediaType = typeof body.mediaType === 'string' ? body.mediaType : 'image';
  if (!VALID_MEDIA_TYPES.has(mediaType)) {
    return NextResponse.json(
      { error: `"mediaType" debe ser uno de: ${Array.from(VALID_MEDIA_TYPES).join(', ')}.` },
      { status: 400 }
    );
  }

  let scheduledFor: Date | null = null;
  if (body.scheduledFor !== undefined && body.scheduledFor !== null) {
    if (typeof body.scheduledFor !== 'string') {
      return NextResponse.json({ error: '"scheduledFor" debe ser una fecha ISO.' }, { status: 400 });
    }
    const parsed = new Date(body.scheduledFor);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json({ error: '"scheduledFor" no es una fecha válida.' }, { status: 400 });
    }
    scheduledFor = parsed;
  }

  const settings = await getSettings(ctx.workspace.id);

  let status: string = 'draft';
  if (scheduledFor) {
    const day = dayKey(scheduledFor, settings.timezone);
    const capacity = await checkDayCapacity({
      workspaceId: ctx.workspace.id,
      day,
      timezone: settings.timezone,
      maxPostsPerDay: settings.maxPostsPerDay,
    });
    if (!capacity.ok) {
      return NextResponse.json({ error: capacity.message, reason: capacity.reason }, { status: 422 });
    }
    status = settings.requireApproval ? 'pending_approval' : 'scheduled';
  }

  const created = await prisma.contentPost.create({
    data: {
      workspaceId: ctx.workspace.id,
      caption,
      networks,
      mediaType,
      scheduledFor,
      status,
      createdById: ctx.auth.userId,
      media: {
        create: mediaUrls.map((url, i) => ({
          url,
          kind: mediaType === 'reel' || mediaType === 'video' ? 'video' : 'image',
          sortIndex: i,
        })),
      },
    },
    include: POST_INCLUDE,
  });

  await logPostEvent({
    workspaceId: ctx.workspace.id,
    postId: created.id,
    actorUserId: ctx.auth.userId,
    action: 'created',
    detail: scheduledFor ? `Creada y programada para ${scheduledFor.toISOString()}` : 'Creada como borrador',
  });

  return NextResponse.json({ post: postToDTO(created, settings.timezone) }, { status: 201 });
}
