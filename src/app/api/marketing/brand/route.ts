import { NextRequest, NextResponse } from 'next/server';
import { isRoleContext, requireRole, MODULE_ACCESS } from '@/lib/roles';
import { loadBrandSnapshot } from '@/lib/marketing-brand-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/marketing/brand — ficha de marca del workspace activo (solo lectura).
 * Agrega Workspace.brandProfile, el documento de marca y la configuración del planificador.
 * Nunca devuelve el texto completo del documento: solo extracto, tamaño y paleta.
 */
export async function GET(req: NextRequest) {
  const ctx = await requireRole(req, MODULE_ACCESS['/marketing']);
  if (!isRoleContext(ctx)) return ctx;
  const brand = await loadBrandSnapshot(ctx.workspace.id, true);
  return NextResponse.json({ brand });
}
