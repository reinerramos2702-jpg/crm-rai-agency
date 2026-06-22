import { streamText, convertToCoreMessages } from 'ai';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { isRoleContext, requireRole } from '@/lib/roles';
import { getLLM, type Provider } from '@/lib/llm-providers';

export const runtime = 'nodejs';
export const maxDuration = 60;

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * POST /api/ai-agents/[id]/test
 * Body: { messages: CoreMessage[] }
 *
 * Chat de prueba del bot (panel "Probar bot" en Objetivos del bot).
 * Construye el system prompt a partir de la configuración del agente
 * (personalidad, objetivo, info adicional, mensajes de bienvenida/fallback)
 * más el contenido de las bases de conocimiento vinculadas (FAQs, texto,
 * tablas, URLs) para que el modelo responda como lo haría en producción.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, ['admin', 'gerente', 'agente']);
  if (!isRoleContext(ctx)) return ctx;

  const { id } = await params;

  const agent = await prisma.aIAgent.findFirst({
    where: { id, workspaceId: ctx.workspace.id },
    include: {
      triggers: {
        include: { knowledgeBase: { include: { items: true } } },
      },
    },
  });
  if (!agent) return jsonError('Agente no encontrado', 404);

  let body: { messages?: unknown[] } = {};
  try {
    body = await req.json();
  } catch {
    return jsonError('Body inválido (JSON malformado).', 400);
  }
  const messages = Array.isArray(body.messages) ? body.messages : [];

  let model;
  try {
    model = await getLLM(ctx.auth.userId, agent.llmProvider as Provider, agent.llmModel);
  } catch (e) {
    return jsonError(
      `${(e as Error).message}. Configura una API key para ${agent.llmProvider} en Ajustes → Integraciones.`,
      400
    );
  }

  const systemPrompt = buildSystemPrompt(agent);

  try {
    const result = streamText({
      model,
      system: systemPrompt,
      messages: convertToCoreMessages(messages as never),
      maxTokens: 1200,
      onError: ({ error }) => {
        console.error('ai-agents/test: error durante streaming', error);
      },
    });

    return result.toDataStreamResponse({
      getErrorMessage: (error) => {
        const msg = error instanceof Error ? error.message : String(error);
        return `Error de la IA (${agent.llmProvider}/${agent.llmModel}): ${msg}`;
      },
    });
  } catch (e) {
    return jsonError(`Error iniciando stream de IA: ${(e as Error).message}`, 502);
  }
}

type AgentWithTriggers = {
  name: string;
  kind: string;
  personality: string | null;
  objective: string | null;
  additionalInfo: string | null;
  welcomeMessage: string | null;
  fallbackMessage: string | null;
  triggers: {
    triggerCondition: string | null;
    knowledgeBase: {
      name: string;
      description: string | null;
      items: {
        type: string;
        question: string | null;
        answer: string | null;
        title: string | null;
        content: string | null;
        data: unknown;
      }[];
    };
  }[];
};

function buildSystemPrompt(agent: AgentWithTriggers): string {
  const parts: string[] = [];

  parts.push(
    `Eres "${agent.name}", un ${agent.kind === 'voice' ? 'agente de voz' : 'agente de chat'} de atención al cliente impulsado por IA. Responde siempre en español, de forma natural, breve y útil.`
  );

  if (agent.personality) {
    parts.push(`## PERSONALIDAD\n${agent.personality}`);
  }
  if (agent.objective) {
    parts.push(`## OBJETIVOS Y FLUJOS DE CONVERSACIÓN\n${agent.objective}`);
  }
  if (agent.additionalInfo) {
    parts.push(`## INFORMACIÓN ADICIONAL\n${agent.additionalInfo}`);
  }
  if (agent.welcomeMessage) {
    parts.push(`## MENSAJE DE BIENVENIDA SUGERIDO\n${agent.welcomeMessage}`);
  }
  if (agent.fallbackMessage) {
    parts.push(
      `## MENSAJE DE RESPALDO\nSi no encuentras la respuesta en la base de conocimiento, responde con algo similar a: "${agent.fallbackMessage}"`
    );
  }

  if (agent.triggers.length) {
    const kbBlocks = agent.triggers.map((t) => {
      const kb = t.knowledgeBase;
      const lines: string[] = [`### Base de conocimiento: ${kb.name}`];
      if (kb.description) lines.push(kb.description);
      if (t.triggerCondition) lines.push(`Condición de activación: ${t.triggerCondition}`);

      for (const item of kb.items) {
        if (item.type === 'faq' && item.question) {
          lines.push(`P: ${item.question}\nR: ${item.answer ?? ''}`);
        } else if (item.type === 'text' && item.content) {
          lines.push(`Texto "${item.title ?? 'sin título'}": ${item.content}`);
        } else if (item.type === 'url' && item.content) {
          lines.push(`Fuente rastreada (${item.title ?? item.content}): contenido indexado disponible.`);
        } else if (item.type === 'table' && item.data) {
          lines.push(`Tabla "${item.title ?? 'sin título'}": ${JSON.stringify(item.data)}`);
        } else if (item.type === 'file' && item.title) {
          lines.push(`Archivo adjunto: ${item.title}`);
        }
      }
      return lines.join('\n');
    });

    parts.push(`## BASES DE CONOCIMIENTO\nUsa esta información para responder con precisión. Si la respuesta no está aquí, usa el mensaje de respaldo.\n\n${kbBlocks.join('\n\n')}`);
  }

  parts.push(
    'Reglas finales: no inventes información que contradiga la base de conocimiento. Sé conciso. Si el usuario pide hablar con un humano, ofrece transferir la conversación.'
  );

  return parts.join('\n\n');
}
