import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, isRoleContext } from '@/lib/roles';
import { getMetaConnectionRaw } from '@/repositories/workspaceMetaRepository';
import { GRAPH_VERSION, OAUTH_SCOPES, encodeOAuthState } from '@/lib/meta-oauth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/workspace/meta/oauth/start
 * Arranca el flujo OAuth de Meta para el workspace actual — modo híbrido:
 * usa la app compartida de RAI (env vars) o la app propia del tenant
 * (ya guardada vía PATCH /api/workspace/meta) según su `metaMode`.
 *
 * Requiere en .env (app compartida): META_SHARED_APP_ID, META_SHARED_APP_SECRET,
 * META_OAUTH_REDIRECT_URI. Sin estas variables reales de una app de Meta
 * verificada, este flujo no puede completarse end-to-end — documentado en el
 * PR del Bloque 1 como no probado en vivo esta noche (falta credencial externa
 * real, no es un bug de código).
 */
export async function GET(req: NextRequest) {
  const ctx = await requirePermission(req, 'canConnectMeta');
  if (!isRoleContext(ctx)) return ctx;

  const connection = await getMetaConnectionRaw(ctx.workspace.id);
  const metaMode = connection?.metaMode ?? 'shared_app';

  let appId: string | undefined;

  if (metaMode === 'own_app') {
    if (!connection?.ownAppId || !connection.ownAppSecretCipher) {
      return NextResponse.json(
        { error: "Workspace en modo 'own_app' pero sin credenciales guardadas. Configúralas primero vía PATCH /api/workspace/meta." },
        { status: 422 }
      );
    }
    appId = connection.ownAppId;
  } else {
    appId = process.env.META_SHARED_APP_ID;
    if (!appId) {
      return NextResponse.json(
        { error: 'META_SHARED_APP_ID no configurado en el entorno — requerido para el modo shared_app.' },
        { status: 500 }
      );
    }
  }

  const redirectUri = process.env.META_OAUTH_REDIRECT_URI;
  if (!redirectUri) {
    return NextResponse.json(
      { error: 'META_OAUTH_REDIRECT_URI no configurado en el entorno.' },
      { status: 500 }
    );
  }

  // state = workspaceId, para que el callback sepa a qué tenant conectar el
  // token sin depender de una sesión de cookies compartida entre requests.
  const state = Buffer.from(JSON.stringify({ workspaceId: ctx.workspace.id })).toString('base64url');

  const authUrl = new URL(`https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`);
  authUrl.searchParams.set('client_id', appId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('scope', OAUTH_SCOPES);
  authUrl.searchParams.set('response_type', 'code');

  return NextResponse.redirect(authUrl.toString());
}
