import { NextRequest } from 'next/server';
import { getAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ingestUrl } from '@/lib/r2';
import { generateImage } from '@/agents/visual-agent';

export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * POST /api/content-grids/[id]/generate-image
 * Body: { themeIndex, slideNumber, prompt, provider? }
 *
 * NODO 3 del wizard "Generador Imágenes" — genera una imagen para un slide
 * específico reutilizando la infraestructura de `visual-agent.ts` (Gemini
 * Imagen 3 / OpenAI / Stability AI), la sube a R2 vía `ingestUrl` y crea un
 * `ContentGridAsset`. Si ya existía un asset para ese (themeIndex, slideNumber)
 * se reemplaza (permite regenerar tras corrección del usuario).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth(req);
  if (!auth) return new Response('Unauthorized', { status: 401 });

  const { id } = await params;
  const grid = await prisma.contentGrid.findFirst({ where: { id, userId: auth.userId } });
  if (!grid) return new Response('Grid not found', { status: 404 });

  let body: { themeIndex: number; slideNumber: number; prompt: string; provider?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Body inválido (JSON malformado).' }, { status: 400 });
  }

  const { themeIndex, slideNumber, prompt } = body;
  if (typeof themeIndex !== 'number' || typeof slideNumber !== 'number' || !prompt?.trim()) {
    return Response.json({ error: 'Faltan themeIndex, slideNumber o prompt.' }, { status: 400 });
  }

  const provider = body.provider || grid.imageProvider || 'gemini';

  let url: string;
  let cost: number;
  try {
    const result = await generateImage(auth.userId, provider, prompt);
    url = result.url;
    cost = result.cost;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Error generando la imagen';
    return Response.json({ error: message }, { status: 502 });
  }

  let stored;
  try {
    stored = await ingestUrl(url, {
      executionId: `grid-${grid.id}`,
      taskId: `theme-${themeIndex}-slide-${slideNumber}`,
      kind: 'image',
      ext: 'png',
      contentType: 'image/png',
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Error subiendo la imagen a R2';
    return Response.json({ error: message }, { status: 502 });
  }

  // Reemplaza el asset anterior de este slide si existe (regeneración)
  await prisma.contentGridAsset.deleteMany({
    where: { gridId: grid.id, themeIndex, slideNumber },
  });

  const asset = await prisma.contentGridAsset.create({
    data: {
      gridId: grid.id,
      themeIndex,
      slideNumber,
      kind: 'image',
      prompt,
      r2Key: stored.r2Key,
      publicUrl: stored.publicUrl,
      metadata: { provider, costUsd: cost },
    },
  });

  return Response.json({ asset, costUsd: cost });
}
