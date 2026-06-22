import { streamText, generateText, convertToCoreMessages } from 'ai';
import { NextRequest } from 'next/server';
import { getAuth } from '@/lib/auth';
import { getLLM, type Provider } from '@/lib/llm-providers';
import { prisma } from '@/lib/db';

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/chat
 * Body: { campaignId, messages, provider, modelId, contextSuffix?, imageProvider?, pipelineType? }
 * Streaming response (Vercel AI SDK protocol).
 *
 * Cada turno se persiste en Campaign.chatHistory.
 * Inyecta automáticamente competitorInsights del masterJson si existen.
 */
export async function POST(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return new Response('Unauthorized', { status: 401 });

  let body: {
    campaignId: string;
    messages: any[];
    provider: Provider;
    modelId: string;
    contextSuffix?: string;
    imageProvider?: string;
    pipelineType?: string;
  };
  try {
    body = await req.json();
  } catch {
    return jsonError('Body inválido (JSON malformado).', 400);
  }

  const { campaignId, messages, provider, contextSuffix, imageProvider, pipelineType } = body;
  let modelId = body.modelId;

  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, userId: auth.userId },
  });
  if (!campaign) return new Response('Campaign not found', { status: 404 });

  let model;
  try {
    model = await getLLM(auth.userId, provider, modelId);
  } catch (e) {
    return jsonError((e as Error).message, 400);
  }

  // Fallback automático: si gemini-2.5-pro falla (cuota/no disponible),
  // probamos con gemini-2.5-flash antes de iniciar el stream.
  if (provider === 'google' && modelId === 'gemini-2.5-pro') {
    try {
      await generateText({ model, prompt: 'ping', maxTokens: 5 });
    } catch (e) {
      const msg = (e as Error).message || '';
      const isQuotaOrAvail = /quota|429|rate limit|not found|404|unavailable|503/i.test(msg);
      if (isQuotaOrAvail) {
        try {
          modelId = 'gemini-2.5-flash';
          model = await getLLM(auth.userId, provider, modelId);
        } catch (e2) {
          return jsonError((e2 as Error).message, 502);
        }
      } else {
        return jsonError(msg, 502);
      }
    }
  }

  // Construir system prompt con todos los contextos
  let systemPrompt = BASE_SYSTEM_PROMPT;

  // Agregar tipo de pipeline y proveedor de imagen
  if (pipelineType) {
    systemPrompt += `\n\nPipeline seleccionado: ${pipelineType}. Genera el plan optimizado para este tipo.`;
  }
  if (imageProvider) {
    systemPrompt += `\nProveedor de imágenes configurado: ${imageProvider}.`;
  }

  // Agregar contexto adicional del formulario (inventario, marca, etc.)
  if (contextSuffix) {
    systemPrompt += contextSuffix;
  }

  // Inyectar competitor insights si existen en el masterJson de la campaña
  const masterJson = campaign.masterJson as Record<string, unknown> | null;
  const competitorInsights = masterJson?.competitorInsights as Record<string, unknown> | undefined;

  if (competitorInsights?.rawSummary) {
    const ci = competitorInsights as {
      painPoints?: string[];
      opportunities?: string[];
      toneAnalysis?: string;
      rawSummary?: string;
    };
    systemPrompt += `\n\n## ANÁLISIS DE COMPETENCIA (confidencial, usar para diferenciarse):
Dolores de clientes de la competencia: ${ci.painPoints?.join(', ') || '—'}
Oportunidades sin cubrir: ${ci.opportunities?.join(', ') || '—'}
Tono de la competencia (evitar imitarlo): ${ci.toneAnalysis || '—'}
Resumen estratégico: ${ci.rawSummary}
INSTRUCCIÓN: Usa estos insights para que el contenido planificado sea específico, diferenciado y ataque exactamente los dolores que la competencia no resuelve.`;
  }

  try {
    const result = streamText({
      model,
      system: systemPrompt,
      messages: convertToCoreMessages(messages),
      maxTokens: 2000,
      onFinish: async ({ text }) => {
        // Persistir historial completo
        const newHistory = [
          ...messages,
          { role: 'assistant', content: text },
        ];
        try {
          await prisma.campaign.update({
            where: { id: campaignId },
            data: {
              chatHistory: newHistory,
              llmProvider: provider,
              llmModel: modelId,
            },
          });
        } catch (e) {
          console.error('chat: error persistiendo historial', e);
        }
      },
      onError: ({ error }) => {
        console.error('chat: error durante streaming', error);
      },
    });

    return result.toDataStreamResponse({
      getErrorMessage: (error) => {
        const msg = error instanceof Error ? error.message : String(error);
        return `Error de la IA (${provider}/${modelId}): ${msg}`;
      },
    });
  } catch (e) {
    return jsonError(`Error iniciando stream de IA: ${(e as Error).message}`, 502);
  }
}

const BASE_SYSTEM_PROMPT = `Eres el copiloto de planificación del Pipeline de Automatización de Contenido de RAI Agency.
Usa siempre el término "IA" (no "AI") en todo momento.

Tu rol en la Secuencia 1: ayudar al operador a definir una campaña de contenido completa que luego se procesará en automático.

Datos que necesitas extraer del usuario (no en orden fijo, conversacional):
- Marca (nombre, tono, voz, audiencia, colores, productos, @instagramHandle)
- Tipo de pipeline: UGC, Avatar Reel, Anuncios Estáticos, o Carrusel
- Tamaño del batch (cuántas piezas: 7 días, 15 días, 30 días)
- Grilla editorial (ángulos / hooks por pieza) — un ángulo diferente por día
- Briefs visuales y de guión por pieza
- Modo de publicación por pieza: auto_instagram | manual_push | schedule_only
- Caption e hashtags sugeridos por pieza

Reglas:
- Sé directo, sin relleno. Castellano impecable.
- Si falta información crítica, pregunta UNA cosa por turno.
- Cuando el plan esté completo (al menos 7 días), sugiere al operador que toque "Generar Plan Maestro".
- Nunca pretendas estar procesando — eso lo hace el orquestador después del botón "Procesar".
- Si tienes assets de inventario disponibles (indicados en el contexto), úsalos como base para los días correspondientes.`;
