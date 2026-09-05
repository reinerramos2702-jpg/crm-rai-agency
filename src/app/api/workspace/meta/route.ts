import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, isRoleContext } from '@/lib/roles';
import { logAudit } from '@/lib/audit';
import { encrypt } from '@/lib/crypto';
import {
  getMetaConnectionView,
  setMetaMode,
  saveOwnAppCredentials,
  disconnectMeta,
} from '@/repositories/workspaceMetaRepository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET    /api/workspace/meta   → estado de la conexión Meta del workspace (sin secretos)
 * PATCH  /api/workspace/meta   → cambia metaMode ('shared_app'|'own_app') y/o guarda credenciales own_app
 * DELETE /api/workspace/meta   → desconecta (borra el access token, conserva el modo configurado)
 *
 * Modelo híbrido (Bloque 1, decisión cerrada 1 sep 2026): 'shared_app' = app RAI
 * única + OAuth dinámico (default). 'own_app' = el tenant conecta su propia app
 * de Meta. Requiere permiso `canConnectMeta`. Reemplaza el patrón anterior
 * (Settings.igBusinessId global compartido entre tenants) — ver auditoría Bloque 0.5.
 */
export async function GET(req: NextRequest) {
  const ctx = await requirePermission(req, 'canConnectMeta');
  if (!isRoleContext(ctx)) return ctx;

  const view = await getMetaConnectionView(ctx.workspace.id);
  return NextResponse.json(view);
}

export async function PATCH(req: NextRequest) {
  const ctx = await requirePermission(req, 'canConnectMeta');
  if (!isRoleContext(ctx)) return ctx;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const metaMode = body.metaMode;
  if (metaMode !== undefined && metaMode !== 'shared_app' && metaMode !== 'own_app') {
    return NextResponse.json({ error: "metaMode debe ser 'shared_app' u 'own_app'" }, { status: 400 });
  }

  if (metaMode === 'own_app') {
    const ownAppId = String(body.ownAppId || '').trim();
    const ownAppSecret = String(body.ownAppSecret || '').trim();
    if (!ownAppId || !ownAppSecret) {
      return NextResponse.json(
        { error: "Modo 'own_app' requiere ownAppId y ownAppSecret" },
        { status: 400 }
      );
    }
    const secret = encrypt(ownAppSecret);
    const view = await saveOwnAppCredentials(ctx.workspace.id, ownAppId, secret);
    await logAudit({
      workspaceId: ctx.workspace.id,
      userId: ctx.auth.userId,
      action: 'workspace.meta.own_app_configured',
      entityType: 'workspace_meta_connection',
      entityId: ctx.workspace.id,
      meta: { ownAppId },
    });
    return NextResponse.json(view);
  }

  if (metaMode === 'shared_app') {
    const view = await setMetaMode(ctx.workspace.id, 'shared_app');
    await logAudit({
      workspaceId: ctx.workspace.id,
      userId: ctx.auth.userId,
      action: 'workspace.meta.mode_changed',
      entityType: 'workspace_meta_connection',
      entityId: ctx.workspace.id,
      meta: { metaMode: 'shared_app' },
    });
    return NextResponse.json(view);
  }

  return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const ctx = await requirePermission(req, 'canConnectMeta');
  if (!isRoleContext(ctx)) return ctx;

  await disconnectMeta(ctx.workspace.id);
  await logAudit({
    workspaceId: ctx.workspace.id,
    userId: ctx.auth.userId,
    action: 'workspace.meta.disconnected',
    entityType: 'workspace_meta_connection',
    entityId: ctx.workspace.id,
    meta: {},
  });
  return NextResponse.json({ ok: true });
}
