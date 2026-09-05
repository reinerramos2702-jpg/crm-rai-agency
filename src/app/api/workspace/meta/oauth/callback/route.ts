import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { encrypt } from '@/lib/crypto';
import { logAudit } from '@/lib/audit';
import { GRAPH_VERSION, decodeOAuthState, resolveAppSecret } from '@/lib/meta-oauth';
import { getMetaConnectionRaw, saveMetaTokenConnection } from '@/repositories/workspaceMetaRepository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/workspace/meta/oauth/callback
 * Meta redirige aquí con `code` + `state` tras la pantalla de autorización.
 * Sin Authorization header (es un redirect de browser, no un fetch autenticado)
 * — el workspace destino viene del `state` firmado por /oauth/start, ver
 * src/lib/meta-oauth.ts. connectedByUserId queda como el owner del workspace
 * (best-effort: el JWT-bearer-header no viaja en un redirect de Meta) — mejora
 * futura documentada: cookie firmada de corta vida durante el roundtrip OAuth
 * para identificar al usuario exacto que conectó, no solo el workspace.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const oauthError = searchParams.get('error_description') || searchParams.get('error');

  if (oauthError) {
    return NextResponse.json({ error: `Meta rechazó la autorización: ${oauthError}` }, { status: 400 });
  }
  if (!code) {
    return NextResponse.json({ error: 'Falta "code" en el callback de Meta' }, { status: 400 });
  }

  const decoded = decodeOAuthState(state);
  if (!decoded) {
    return NextResponse.json({ error: 'state inválido, ausente o alterado — no se puede identificar el workspace' }, { status: 400 });
  }
  const { workspaceId } = decoded;

  const connection = await getMetaConnectionRaw(workspaceId);
  const metaMode = connection?.metaMode ?? 'shared_app';
  const appId = metaMode === 'own_app' ? connection?.ownAppId : process.env.META_SHARED_APP_ID;
  const appSecret = resolveAppSecret(metaMode, connection?.ownAppSecretCipher, connection?.ownAppSecretIv, connection?.ownAppSecretTag);
  const redirectUri = process.env.META_OAUTH_REDIRECT_URI;

  if (!appId || !appSecret || !redirectUri) {
    return NextResponse.json(
      { error: 'Credenciales de la app de Meta (compartida u own_app) o redirect URI no configuradas.' },
      { status: 500 }
    );
  }

  try {
    // 1) Code → access token de corta duración
    const tokenUrl = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`);
    tokenUrl.searchParams.set('client_id', appId);
    tokenUrl.searchParams.set('client_secret', appSecret);
    tokenUrl.searchParams.set('redirect_uri', redirectUri);
    tokenUrl.searchParams.set('code', code);
    const tokenRes = await fetch(tokenUrl.toString(), { signal: AbortSignal.timeout(20_000) });
    if (!tokenRes.ok) {
      const details = await tokenRes.json().catch(() => ({}));
      return NextResponse.json({ error: 'No se pudo canjear el code por un access token', details }, { status: 502 });
    }
    const { access_token: shortLivedToken } = (await tokenRes.json()) as { access_token: string };

    // 2) Canje a token de larga duración (~60 días)
    const longLivedUrl = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`);
    longLivedUrl.searchParams.set('grant_type', 'fb_exchange_token');
    longLivedUrl.searchParams.set('client_id', appId);
    longLivedUrl.searchParams.set('client_secret', appSecret);
    longLivedUrl.searchParams.set('fb_exchange_token', shortLivedToken);
    const longLivedRes = await fetch(longLivedUrl.toString(), { signal: AbortSignal.timeout(20_000) });
    if (!longLivedRes.ok) {
      const details = await longLivedRes.json().catch(() => ({}));
      return NextResponse.json({ error: 'No se pudo obtener el token de larga duración', details }, { status: 502 });
    }
    const longLived = (await longLivedRes.json()) as { access_token: string; expires_in?: number };
    const accessToken = longLived.access_token;
    const expiresAt = longLived.expires_in ? new Date(Date.now() + longLived.expires_in * 1000) : undefined;

    // 3) Página + cuenta de Instagram Business conectada
    const accountsUrl = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/me/accounts`);
    accountsUrl.searchParams.set('fields', 'id,name,instagram_business_account');
    accountsUrl.searchParams.set('access_token', accessToken);
    const accountsRes = await fetch(accountsUrl.toString(), { signal: AbortSignal.timeout(20_000) });
    if (!accountsRes.ok) {
      const details = await accountsRes.json().catch(() => ({}));
      return NextResponse.json({ error: 'No se pudieron listar las páginas conectadas', details }, { status: 502 });
    }
    const accounts = (await accountsRes.json()) as {
      data: Array<{ id: string; instagram_business_account?: { id: string } }>;
    };
    const pageWithIg = accounts.data.find((p) => p.instagram_business_account?.id);
    if (!pageWithIg?.instagram_business_account?.id) {
      return NextResponse.json(
        { error: 'Ninguna página conectada tiene una cuenta de Instagram Business vinculada' },
        { status: 422 }
      );
    }

    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { ownerId: true } });
    const connectedByUserId = workspace?.ownerId ?? 'unknown';

    const cipher = encrypt(accessToken);
    await saveMetaTokenConnection(workspaceId, {
      igBusinessId: pageWithIg.instagram_business_account.id,
      pageId: pageWithIg.id,
      accessToken: cipher,
      tokenExpiresAt: expiresAt,
      connectedByUserId,
    });

    await logAudit({
      workspaceId,
      userId: connectedByUserId,
      action: 'workspace.meta.connected',
      entityType: 'workspace_meta_connection',
      entityId: workspaceId,
      meta: { igBusinessId: pageWithIg.instagram_business_account.id, metaMode },
    });

    return NextResponse.redirect(new URL('/settings?meta=connected', req.url));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido conectando Meta';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
