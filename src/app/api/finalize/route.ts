import { generateText } from 'ai';
import { NextRequest } from 'next/server';
import { getAuth } from '@/lib/auth';
import { getLLM, type Provider } from '@/lib/llm-providers';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { MasterJsonSchema } from '@/lib/master-json-schema';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/finalize
 * Body: { campaignId }
 *
 * Lee chatHistory de la campaign, llama LLM dedicado para extraer el Master JSON v2.0
 * estructurado. Lo persiste en campaign.masterJson y marca status='ready'.
 */
export async function POST(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return new Response('Unauthorized', { status: 401 });

  const { campaignId } = await req.json();

  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, userId: auth.userId },
  });
  if (!campaign) return new Response('Campaign not found', { status: 404 });

  const provider = (campaign.llmProvider || 'deepseek') as Provider;
  const modelId = campaign.llmModel || 'deepseek-chat';

  const model = await getLLM(auth.userId, provider, modelId);

  const transcript = (campaign.chatHistory as Array<{ role: string; content: unknown }>)
    .map((m) => `${m.role.toUpperCase()}: ${typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}`)
    .join('\n\n');

  const extractionPrompt = `Lee este historial de planificación y devuelve el JSON maestro EXACTO según el schema v2.0.

SCHEMA REQUERIDO (TypeScript):
${JSON.stringify(schemaHint(), null, 2)}

Reglas:
- Output JSON puro, sin markdown, sin comentarios.
- Si falta información, usa defaults sensatos para esta marca y pipeline.
- campaignId = "${campaign.id}"
- workspaceId = "${campaign.workspaceId}"
- pipelineType = "${campaign.pipelineType}"
- version = "2.0"
- createdAt = "${new Date().toISOString()}"
- batchSize = items.length
- modelConfig defaults si no se especificó: copy=deepseek/deepseek-chat, visual.imageProvider=gemini, audio.ttsProvider=elevenlabs, video.provider=gemini.
- Para cada item: generar un dayNumber del 1 al N según su posición.
- publicationMode default = "manual_push".
- agentAction default = "create".

HISTORIAL:
${transcript}`;

  const { text } = await generateText({
    model,
    prompt: extractionPrompt,
    maxTokens: 4000,
  });

  const cleaned = text.replace(/```json|```/g, '').trim();
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return new Response(
      JSON.stringify({ error: 'El LLM no devolvió JSON válido', raw: text }),
      { status: 422, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Validar con Zod v2.0
  const validation = MasterJsonSchema.safeParse(parsed);
  if (!validation.success) {
    return new Response(
      JSON.stringify({
        error: 'Master JSON falló validación de schema v2.0',
        issues: validation.error.issues,
        raw: parsed,
      }),
      { status: 422, headers: { 'Content-Type': 'application/json' } }
    );
  }

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { masterJson: validation.data as unknown as Prisma.InputJsonValue, status: 'ready' },
  });

  return Response.json({ masterJson: validation.data });
}

function schemaHint() {
  return {
    version: '2.0',
    campaignId: 'string',
    workspaceId: 'string',
    inventoryPath: 'string (opcional)',
    brand: {
      name: 'string',
      tone: 'string',
      voice: 'string',
      colors: ['#hex'],
      audience: 'string',
      products: 'string',
      forbiddenTopics: 'string (opcional)',
      instagramHandle: '@handle (opcional)',
    },
    pipelineType: 'ugc | avatar_reel | static_ads | carousel',
    batchSize: 'number',
    items: [
      {
        id: 'day-01',
        dayNumber: 1,
        scheduledFor: 'ISO datetime (opcional)',
        angle: 'hook de comunicación',
        goal: 'venta | awareness | educación',
        scriptBrief: 'qué debe decir el guión',
        visualBrief: 'descripción visual',
        durationSec: 30,
        pipelineType: 'ugc | avatar_reel | static_ads | carousel',
        publicationMode: 'manual_push | auto_instagram | schedule_only',
        agentAction: 'create | enhance | skip',
        caption: 'copy para Instagram (opcional)',
        hashtags: ['#tag1'],
        callToAction: 'texto CTA (opcional)',
      },
    ],
    modelConfig: {
      copyAgent: { provider: 'deepseek', modelId: 'deepseek-chat' },
      visualAgent: { imageProvider: 'gemini | openai | stabilityai', modelId: 'opcional' },
      audioAgent: { ttsProvider: 'elevenlabs | openai | google' },
      videoAgent: { provider: 'gemini | runway | pika' },
      musicAgent: { provider: 'suno (opcional)' },
    },
    n8nWebhookUrl: 'https://... (opcional)',
    igPageId: '12345678 (opcional)',
    createdAt: 'ISO datetime',
  };
}
