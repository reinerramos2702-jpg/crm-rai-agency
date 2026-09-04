import { streamText, generateText, convertToCoreMessages } from 'ai';
import { NextRequest } from 'next/server';
import { getAuth } from '@/lib/auth';
import { getLLM, type Provider } from '@/lib/llm-providers';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const maxDuration = 60;

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * POST /api/content-grids/[id]/chat
 * Body: { messages, provider, modelId }
 *
 * Chat del wizard "Generador Imágenes" — guía al usuario por el pipeline de
 * 5 nodos secuenciales (ver Workspace.brandDocText, sección "Sistema Operativo
 * de Contenido"). Cada nodo termina con un "ALTO TOTAL": el asistente presenta
 * resultados y espera validación explícita antes de avanzar. El frontend
 * detecta el avance de nodo (currentStep) por la respuesta del usuario y lo
 * persiste vía PATCH /api/content-grids/[id].
 *
 * El historial completo se persiste en ContentGrid.chatHistory.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth(req);
  if (!auth) return new Response('Unauthorized', { status: 401 });

  const { id } = await params;

  let body: { messages: any[]; provider: Provider; modelId: string };
  try {
    body = await req.json();
  } catch {
    return jsonError('Body inválido (JSON malformado).', 400);
  }
  const { messages, provider } = body;
  let modelId = body.modelId;

  const grid = await prisma.contentGrid.findFirst({
    where: { id, userId: auth.userId },
    include: { workspace: { select: { brandDocText: true, brandDocName: true } } },
  });
  if (!grid) return new Response('Grid not found', { status: 404 });

  let model;
  try {
    model = await getLLM(auth.userId, provider, modelId);
  } catch (e) {
    return jsonError((e as Error).message, 400);
  }

  // Fallback automático gemini-2.5-pro → gemini-2.5-flash si hay error de cuota/disponibilidad
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

  const systemPrompt = buildSystemPrompt({
    brandDocText: grid.workspace.brandDocText,
    brandDocName: grid.workspace.brandDocName,
    currentStep: grid.currentStep,
    activeThemeIndex: grid.activeThemeIndex,
    themesTotal: grid.themesTotal,
    imageProvider: grid.imageProvider,
    themes: grid.themes as unknown[],
  });

  try {
    const result = streamText({
      model,
      system: systemPrompt,
      messages: convertToCoreMessages(messages),
      maxTokens: 3000,
      onFinish: async ({ text }) => {
        const newHistory = [...messages, { role: 'assistant', content: text }];
        try {
          await prisma.contentGrid.update({
            where: { id },
            data: {
              chatHistory: newHistory,
              llmProvider: provider,
              llmModel: modelId,
            },
          });
        } catch (e) {
          console.error('content-grids chat: error persistiendo historial', e);
        }
      },
      onError: ({ error }) => {
        console.error('content-grids chat: error durante streaming', error);
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

function buildSystemPrompt(ctx: {
  brandDocText: string | null;
  brandDocName: string | null;
  currentStep: number;
  activeThemeIndex: number;
  themesTotal: number;
  imageProvider: string;
  themes: unknown[];
}): string {
  let prompt = `Eres el copiloto del módulo "Generador Imágenes" de CRM RAI Agency.
Guías al usuario PASO A PASO por un pipeline de 5 nodos secuenciales para crear una grilla
semanal de contenido (carruseles de Instagram/TikTok/LinkedIn). Usa siempre "IA" (no "AI").

REGLA ABSOLUTA — "ALTO TOTAL": cada nodo termina con un ALTO TOTAL. Presenta el resultado del
nodo actual de forma clara y ordenada (listas, tablas si ayuda) y ESPERA la validación explícita
del usuario (ej. "validado", "sí", "dale", "aprobado", "el tema 3") antes de continuar al
siguiente nodo. Nunca avances dos nodos en una sola respuesta. Sé directo, sin relleno,
castellano impecable.\n\n`;

  if (ctx.brandDocText) {
    prompt += `## SISTEMA OPERATIVO DE CONTENIDO DEL WORKSPACE (documento de marca: "${ctx.brandDocName || 'sin nombre'}")
Estas son las reglas de marca, narrativa y producción que DEBES seguir al pie de la letra
(paleta, tono, frameworks, estructura de slides, reglas de copywriting, etc.):

${ctx.brandDocText.slice(0, 12000)}

---\n\n`;
  } else {
    prompt += `## SIN DOC DE MARCA
El workspace todavía no cargó su "Sistema Operativo de Contenido". Usa buenas prácticas
generales de copywriting/diseño (framework PAS, paleta coherente, CTA claro) y sugiere al
usuario subir su documento de marca desde la galería para personalizar el pipeline.\n\n`;
  }

  prompt += `## PIPELINE — 5 NODOS\n
NODO 1 — IDEACIÓN DE GRILLA SEMANAL (trigger: "Hagamos la grilla de los 7 días")
Genera exactamente ${ctx.themesTotal} conceptos temáticos, uno por día, siguiendo la distribución
de categorías y reglas del documento de marca. Cada tema: título corto (<8 palabras), 1 línea de
ángulo + segmento target, categoría temática y paleta. ALTO TOTAL: presenta la lista completa y
espera validación. No generes nada más.

NODO 2 — ARQUITECTURA NARRATIVA POR TEMA (trigger: "Desarrolla el Tema X" / "Tema validado")
Paso A: propone 3 estilos visuales distintos (nombre, descripción 2 líneas, paleta hex,
referencias). Paso B: estructura narrativa de 4-5 slides con framework PAS (Hook, Agitation x2,
Solution opcional, Resolución+CTA). ALTO TOTAL: presenta la estructura y espera validación. No
generes imágenes todavía.

NODO 3 — GENERACIÓN DE IMÁGENES SLIDE POR SLIDE (trigger: "Dame el Slide X" / "Genera el Slide X")
Para cada slide, redacta un PROMPT DE IMAGEN detallado y autocontenido (composición, iluminación,
estética, tipografía in-image, paleta — todo según el doc de marca) listo para enviarlo al
generador de imágenes. Presenta el prompt y espera aprobación del usuario antes de pasar al
siguiente slide. Un slide por turno, sin excepciones. El usuario generará la imagen con el botón
correspondiente de la interfaz (proveedor configurado: ${ctx.imageProvider}).

NODO 4 — CICLAJE ENTRE TEMAS (trigger: aprobación del último slide del tema en curso)
Al aprobarse el último slide de un tema, procede automáticamente con el Nodo 2 del siguiente
tema de la grilla (propone estilos visuales) sin esperar más instrucción. Repite el ciclo
Nodo 2 → Nodo 3 → Nodo 4 hasta completar los ${ctx.themesTotal} temas.

NODO 5 — SÍNTESIS DE COPYWRITING (trigger: "Ahora genera el copy de todo ese contenido")
Redacta los ${ctx.themesTotal} captions (uno por carrusel), framework PAS, línea magnética inicial
(<10 palabras), cuerpo en 3-6 párrafos cortos con voz plural, cierre con al menos 2 CTAs
accionables, pregunta de anclaje, y bloque de mínimo 20 hashtags agrupados (nicho técnico,
negocio LatAm, alcance masivo). ALTO TOTAL final: presenta todo y espera validación de cierre.\n\n`;

  prompt += `## ESTADO ACTUAL DE ESTA GRILLA\n`;
  prompt += `Nodo activo: ${ctx.currentStep} de 5.\n`;
  prompt += `Tema activo (Nodos 2-4): ${ctx.activeThemeIndex + 1} de ${ctx.themesTotal}.\n`;
  if (ctx.themes?.length) {
    prompt += `Temas ya definidos (resumen JSON, no lo repitas tal cual salvo que el usuario lo pida):
${JSON.stringify(ctx.themes).slice(0, 4000)}\n`;
  }
  prompt += `\nContinúa la conversación desde aquí, respetando el nodo activo y el protocolo ALTO TOTAL.`;

  return prompt;
}
