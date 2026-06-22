import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { runCompetitorResearch } from '@/agents/competitor-researcher';
import { resolveApiKey } from '@/lib/llm-providers';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

export const runtime = 'nodejs';
export const maxDuration = 120; // Playwright puede tardar hasta 2 min

/**
 * POST /api/research/competitors
 * Body: { urls: string[], campaignId?: string }
 * Responde con CompetitorInsights
 *
 * El resultado se guarda en Campaign.masterJson.competitorInsights (si campaignId presente)
 * y también se devuelve en la respuesta para que el chat lo reciba inmediatamente
 */
export async function POST(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { urls, campaignId } = await req.json();

  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return NextResponse.json({ error: 'Se requiere al menos una URL' }, { status: 400 });
  }

  // Obtener API key de Anthropic para Claude
  const anthropicKey =
    (await resolveApiKey(auth.userId, 'anthropic')) ||
    process.env.ANTHROPIC_API_KEY;

  if (!anthropicKey) {
    return NextResponse.json(
      { error: 'Se requiere una API key de Anthropic para el análisis de competencia' },
      { status: 422 }
    );
  }

  // Ejecutar investigación
  const insights = await runCompetitorResearch(urls, anthropicKey);

  // Si hay campaignId, persistir insights en masterJson
  if (campaignId) {
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, userId: auth.userId },
    });

    if (campaign) {
      const currentMaster = (campaign.masterJson as Record<string, unknown>) || {};
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          masterJson: {
            ...currentMaster,
            competitorInsights: insights,
            competitorUrls: urls,
          } as unknown as Prisma.InputJsonValue,
        },
      });
    }
  }

  return NextResponse.json({ insights, urlCount: urls.length });
}
