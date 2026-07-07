import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isRoleContext, requireRole } from '@/lib/roles';
import { encrypt } from '@/lib/crypto';
import { verifyIgAccount, getIgConfig } from '@/lib/instagram';

export const runtime = 'nodejs';

/** Estado de la conexión de Instagram del workspace. */
export async function GET(req: NextRequest) {
  const ctx = await requireRole(req, ['admin', 'gerente', 'agente', 'viewer']);
  if (!isRoleContext(ctx)) return ctx;

  const account = await prisma.socialAccount.findUnique({
    where: { workspaceId_platform: { workspaceId: ctx.workspace.id, platform: 'instagram' } },
  });

  const cfg = await getIgConfig(ctx.workspace.id);
  let live: { id: string; username: string; followers_count?: number; media_count?: number } | null = null;
  let liveError: string | null = null;

  if (cfg) {
    try {
      live = await verifyIgAccount(cfg.token, cfg.igUserId);
      if (account) {
        await prisma.socialAccount.update({
          where: { id: account.id },
          data: { status: 'connected', lastCheckedAt: new Date(), lastError: null, igUsername: live.username },
        });
      }
    } catch (e) {
      liveError = e instanceof Error ? e.message : String(e);
      if (account) {
        await prisma.socialAccount.update({
          where: { id: account.id },
          data: { status: 'error', lastCheckedAt: new Date(), lastError: liveError },
        });
      }
    }
  }

  return NextResponse.json({
    connected: Boolean(cfg) && !liveError,
    source: account?.tokenCiphertext ? 'db' : cfg ? 'env' : null,
    igUserId: cfg?.igUserId || null,
    pageId: cfg?.pageId || null,
    username: live?.username || account?.igUsername || null,
    followers: live?.followers_count ?? null,
    mediaCount: live?.media_count ?? null,
    lastError: liveError || account?.lastError || null,
    hasEnvToken: Boolean(process.env.INSTAGRAM_ACCESS_TOKEN && process.env.INSTAGRAM_BUSINESS_ID),
  });
}

/** Conectar/actualizar cuenta: guarda token cifrado + ids. Body: { accessToken, igUserId, pageId? } */
export async function POST(req: NextRequest) {
  const ctx = await requireRole(req, ['admin', 'gerente']);
  if (!isRoleContext(ctx)) return ctx;

  let body: { accessToken?: string; igUserId?: string; pageId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const accessToken = body.accessToken?.trim();
  const igUserId = body.igUserId?.trim();
  if (!accessToken || !igUserId) {
    return NextResponse.json({ error: 'accessToken e igUserId son obligatorios' }, { status: 400 });
  }

  // validar contra la Graph API antes de guardar
  let username = '';
  try {
    const live = await verifyIgAccount(accessToken, igUserId);
    username = live.username;
  } catch (e) {
    return NextResponse.json(
      { error: `Token o ID inválidos: ${e instanceof Error ? e.message : e}` },
      { status: 400 }
    );
  }

  const enc = encrypt(accessToken);
  const account = await prisma.socialAccount.upsert({
    where: { workspaceId_platform: { workspaceId: ctx.workspace.id, platform: 'instagram' } },
    create: {
      workspaceId: ctx.workspace.id,
      platform: 'instagram',
      igUserId,
      igUsername: username,
      pageId: body.pageId?.trim() || null,
      tokenCiphertext: enc.ciphertext,
      tokenIv: enc.iv,
      tokenAuthTag: enc.authTag,
      status: 'connected',
      lastCheckedAt: new Date(),
    },
    update: {
      igUserId,
      igUsername: username,
      pageId: body.pageId?.trim() || null,
      tokenCiphertext: enc.ciphertext,
      tokenIv: enc.iv,
      tokenAuthTag: enc.authTag,
      status: 'connected',
      lastCheckedAt: new Date(),
      lastError: null,
    },
  });

  return NextResponse.json({ ok: true, username, accountId: account.id });
}

/** Desconectar (borra token guardado; el fallback por env vars sigue activo si existe). */
export async function DELETE(req: NextRequest) {
  const ctx = await requireRole(req, ['admin']);
  if (!isRoleContext(ctx)) return ctx;

  await prisma.socialAccount.updateMany({
    where: { workspaceId: ctx.workspace.id, platform: 'instagram' },
    data: { tokenCiphertext: null, tokenIv: null, tokenAuthTag: null, status: 'disconnected' },
  });
  return NextResponse.json({ ok: true });
}
