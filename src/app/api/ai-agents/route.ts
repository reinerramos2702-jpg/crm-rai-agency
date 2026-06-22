import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOrCreateWorkspace } from '@/lib/workspace';
import { isRoleContext, requireRole } from '@/lib/roles';
import { SUPPORTED_MODELS, type Provider } from '@/lib/llm-providers';

export const runtime = 'nodejs';

/**
 * GET  /api/ai-agents — lista los agentes de IA del workspace (Conversation AI + Voz)
 *      con conteo de conversaciones y bases de conocimiento vinculadas.
 * POST /api/ai-agents  body: { name?, kind? } — crea un agente nuevo (borrador "Sugerido").
 */

export async function GET(req: NextRequest) {
  const ctx = await requireRole(req, ['admin', 'gerente', 'agente', 'viewer']);
  if (!isRoleContext(ctx)) return ctx;
  const ws = ctx.workspace;

  const agents = await prisma.aIAgent.findMany({
    where: { workspaceId: ws.id },
    orderBy: [{ isPrimary: 'desc' }, { updatedAt: 'desc' }],
    include: {
      _count: { select: { conversations: true, triggers: true } },
    },
  });

  return NextResponse.json({ agents });
}

export async function POST(req: NextRequest) {
  const ctx = await requireRole(req, ['admin', 'gerente', 'agente']);
  if (!isRoleContext(ctx)) return ctx;
  const ws = ctx.workspace;

  let body: { name?: string; kind?: string } = {};
  try {
    body = await req.json();
  } catch {
    // body opcional
  }

  const kind = body.kind === 'voice' ? 'voice' : 'chat';

  const count = await prisma.aIAgent.count({ where: { workspaceId: ws.id, kind } });
  const defaultName =
    kind === 'voice' ? `Agente de Voz ${count + 1}` : `${count + 1} - Asistente Virtual`;
  const name = body.name?.trim() || defaultName;

  // El primer agente de chat creado en el workspace queda como principal automáticamente.
  const existingPrimary = await prisma.aIAgent.findFirst({ where: { workspaceId: ws.id, isPrimary: true } });

  const defaultProvider: Provider = 'openai';
  const defaultModel = SUPPORTED_MODELS[defaultProvider][1]?.id || SUPPORTED_MODELS[defaultProvider][0].id;

  const agent = await prisma.aIAgent.create({
    data: {
      workspaceId: ws.id,
      name,
      kind,
      isPrimary: !existingPrimary,
      channels: kind === 'voice' ? ['Llamadas de voz'] : ['Widget de chat (SMS chat)', 'Chat en tiempo real'],
      llmProvider: defaultProvider,
      llmModel: defaultModel,
      personality:
        kind === 'voice'
          ? `SECCIÓN 1 — IDENTIDAD Y PERSONALIDAD DEL AGENTE\n\nNombre del agente: ${name}\nRol: Agente de voz para atención y reservas.`
          : `SECCIÓN 1 — IDENTIDAD Y PERSONALIDAD DEL AGENTE\n\nNombre del agente: ${name}\nRol: Asistente virtual de atención al cliente.`,
      objective:
        'SECCIÓN 1 — INTENCIONES Y FLUJOS DE CONVERSACIÓN\n\n🎯 INTENCIÓN 1: Consulta general\nCuando el cliente escriba, saluda, identifica su necesidad y ofrece ayuda concreta.',
      welcomeMessage: '¡Hola! 👋 Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?',
      fallbackMessage: 'No tengo esa información a la mano, pero la transfiero con el equipo para que te ayude.',
    },
  });

  return NextResponse.json({ agent }, { status: 201 });
}
