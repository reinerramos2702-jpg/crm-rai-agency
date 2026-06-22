import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { WORKFLOW_TEMPLATES } from '@/lib/automations/templates';

export const runtime = 'nodejs';

/**
 * GET /api/automations/templates — las 15 plantillas (5 servicios, 5 retail, 5 mayoreo)
 */
export async function GET(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json({ templates: WORKFLOW_TEMPLATES });
}
