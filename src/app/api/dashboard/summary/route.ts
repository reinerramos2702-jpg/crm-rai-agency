import { NextRequest, NextResponse } from 'next/server';
import { MODULE_ACCESS, isRoleContext, requireRole } from '@/lib/roles';
import { buildDashboardSummary, invalidateDashboard } from '@/lib/dashboard-data';
import { parsePeriod } from '@/lib/dashboard-summary';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/dashboard/summary?days=7|30[&fresh=1]
 *
 * Resumen del Dashboard en UNA sola petición: «Hoy» (citas, tareas, conversaciones sin
 * responder, pagos por revisar, publicaciones de Instagram), indicadores del periodo con
 * variación contra el periodo anterior, Instagram, automatización y actividad reciente.
 * Todo con el workspace de la sesión y filtrado por permisos del rol (null = no aplica).
 * `fresh=1` descarta la caché de 10 s del servidor (botón «Actualizar»).
 */
export async function GET(req: NextRequest) {
  const ctx = await requireRole(req, MODULE_ACCESS['/']);
  if (!isRoleContext(ctx)) return ctx;

  const params = req.nextUrl.searchParams;
  if (params.get('fresh') === '1') invalidateDashboard(ctx.workspace.id);

  const summary = await buildDashboardSummary({
    workspaceId: ctx.workspace.id,
    role: ctx.role,
    days: parsePeriod(params.get('days')),
    me: { displayName: ctx.auth.displayName ?? null, workspaceName: ctx.workspace.name ?? null },
  });
  return NextResponse.json(summary, { headers: { 'Cache-Control': 'private, no-store' } });
}
