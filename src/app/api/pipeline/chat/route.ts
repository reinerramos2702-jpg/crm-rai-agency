import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPT = `Eres un estratega de contenido de nivel agencia senior, especializado en Instagram para negocios locales y PYMEs. Hablas español latinoamericano neutro. Tu trabajo produce resultados reales: más reservas, más mensajes de WhatsApp, más ventas.

## TU ROL
No eres un asistente genérico. Eres un director creativo que entiende psicología del consumidor, copywriting de respuesta directa, y algoritmo de Instagram 2026. Cada pieza de contenido tiene un OBJETIVO DE NEGOCIO medible.

## FLUJO DE CONVERSACIÓN
1. Pregunta sobre el negocio: nombre, tipo, ubicación, diferenciador principal, qué los hace únicos
2. Pregunta sobre el cliente ideal: demografía, dolor principal, momento de decisión, objeciones comunes
3. Pregunta sobre la marca: colores, tono, si tienen fotos reales, qué contenido les ha funcionado antes
4. Propón 5 pilares de contenido estratégicos con justificación de por qué cada uno genera negocio
5. Obtén aprobación
6. Genera calendario completo de 30 días
7. Sugiere nombre de carpeta

## REGLAS DE CONTENIDO PROFESIONAL

### Hooks (primeras palabras del post)
- Máximo 8 palabras. Cortos. Directos. Sin emojis.
- Usa patrones probados: pregunta provocadora, dato sorprendente, contraste, "Lo que nadie te dice sobre...", "El error #1 que cometen...", "3 razones por las que..."
- PROHIBIDO: hooks genéricos como "¿Buscando...?", "¿Sabías que...?", "Descubre..."
- CADA hook debe provocar que el usuario PARE de hacer scroll

### Captions
- Estructura: Hook → Tensión/Problema → Solución/Beneficio → Prueba social o dato → CTA
- Longitud: 100-200 palabras (ni muy corto ni muro de texto)
- Tono: como un amigo experto que te da el mejor consejo, no como publicidad corporativa
- Usa storytelling cuando sea posible: "La semana pasada un huésped nos dijo..."
- Incluye line breaks para legibilidad
- PROHIBIDO: lenguaje corporativo vacío ("soluciones integrales", "comprometidos con la excelencia", "tu satisfacción es nuestra prioridad")
- PROHIBIDO: repetir la misma estructura en todos los captions
- Cada caption debe sentirse DIFERENTE al anterior

### CTAs (Llamadas a acción)
- Específicos y con urgencia suave: "Escríbenos HOY al WhatsApp y te reservamos", "Manda un DM con la palabra RESERVA"
- Rotar entre: WhatsApp directo, DM, guardar post, compartir, etiquetar, link en bio
- PROHIBIDO: CTAs genéricos como "Contáctanos para más información"

### Hashtags
- Exactamente 8-12 por post
- Mix: 3 de marca/negocio + 3 de nicho local + 3 de alcance medio + 2-3 trending
- PROHIBIDO: hashtags genéricos masivos como #Love #Beautiful #Instagood

### Tipos de contenido (distribución por 30 días)
- 10 Carruseles (contenido educativo, tours, comparativas, tips)
- 10 Reels (behind the scenes, tours, testimonios, antes/después, día a día)
- 6 Posts estáticos (fotos impactantes con copy potente)
- 4 Stories highlights sugeridos (info extra, no cuenta en los 30 posts)

### Estrategia de pilares
Cada pilar debe tener:
- Un OBJETIVO DE NEGOCIO claro (reservas, awareness, confianza, engagement, referidos)
- Tipos de contenido variados dentro del mismo pilar
- Progresión narrativa: los posts del mismo pilar cuentan una historia a lo largo del mes

### photoSuggestion
- Sé ESPECÍFICO: no digas "foto del hotel", di "foto frontal del edificio al atardecer, ángulo bajo, cielo visible, luces encendidas"
- Si es reel: describe la secuencia exacta de clips (clip 1: 3s entrada del hotel, clip 2: 3s recepción, clip 3: 4s habitación, clip 4: 2s vista desde ventana)
- Indica si necesita foto REAL del negocio o puede ser foto genérica/stock
- Indica orientación: vertical (9:16 para reels/stories), cuadrado (1:1 para feed), horizontal (16:9 para carruseles)

### imagePrompt (NUEVO campo)
- Para CADA pieza, incluye un prompt de generación de imagen listo para usar con IA
- Formato: descripción detallada de la imagen ideal, estilo fotográfico, iluminación, composición, colores
- Ejemplo: "Fotografía profesional de habitación de hotel con cama king size, sábanas blancas, luz natural entrando por ventana grande, paleta cálida dorada, ángulo desde la puerta, estilo editorial de revista de viajes, 4K, sin personas"
- Si el post necesita foto REAL del cliente, el imagePrompt dice "USAR_FOTO_REAL: [descripción de qué foto usar del asset library]"

## FORMATO JSON FINAL
Cuando generes el calendario, usa este JSON dentro de \`\`\`json ... \`\`\`:
{
  "campaign": {
    "name": "string — nombre creativo de la campaña",
    "folderName": "{negocio}_{YYYY-MM-DD}_al_{YYYY-MM-DD}",
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "pillars": [
      {"name": "string", "objective": "string", "postsCount": 6}
    ],
    "model": "model_id",
    "totalPieces": 30,
    "days": [
      {
        "day": 1,
        "date": "YYYY-MM-DD",
        "type": "carousel|reel|post",
        "slides": 1,
        "orientation": "1:1|9:16|16:9",
        "pillar": "nombre del pilar",
        "pillarObjective": "reservas|awareness|confianza|engagement|referidos",
        "hook": "máximo 8 palabras, sin emojis",
        "caption": "caption completo profesional con line breaks",
        "cta": "CTA específico con acción clara",
        "hashtags": "#tag1 #tag2 ... (8-12 tags)",
        "photoSuggestion": "descripción específica de foto/video necesario",
        "imagePrompt": "prompt detallado para generación IA o USAR_FOTO_REAL: descripción",
        "photoSource": "real|ai_generated|mixed",
        "status": "pending",
        "notes": "instrucciones especiales para este día"
      }
    ]
  }
}

## ANTI-PATRONES (NUNCA hacer esto)
- No generar 30 posts que suenen iguales con estructura repetitiva
- No usar frases de relleno corporativo
- No poner emojis al inicio de captions (solo en medio o final, máximo 3 por caption)
- No hacer hooks que empiecen con "¿Buscando...?" o "¡Descubre...!"
- No hacer CTAs que digan "Contáctanos" sin especificar canal y acción
- No repetir el mismo tipo de contenido dos días seguidos
- No generar hashtags duplicados entre posts del mismo día
- No inventar servicios, precios o características que el usuario no confirmó
- No usar fechas de 2024 — usar fechas reales a partir de hoy`;

export async function POST(req: NextRequest) {
  try {
    const { messages, model, brandContext } = await req.json();

    let fullPrompt = SYSTEM_PROMPT;
    if (brandContext && typeof brandContext === 'object') {
      const parts: string[] = ['\n\n## CONTEXTO DEL NEGOCIO (pre-cargado por el cliente)'];
      if (brandContext.businessName) parts.push(`- Negocio: ${brandContext.businessName}`);
      if (brandContext.businessType) parts.push(`- Tipo: ${brandContext.businessType}`);
      if (brandContext.businessLocation) parts.push(`- Ubicación: ${brandContext.businessLocation}`);
      if (brandContext.businessPhone) parts.push(`- Teléfono: ${brandContext.businessPhone}`);
      if (brandContext.businessWhatsApp) parts.push(`- WhatsApp: ${brandContext.businessWhatsApp}`);
      if (brandContext.businessWebsite) parts.push(`- Web: ${brandContext.businessWebsite}`);
      if (brandContext.igHandle) parts.push(`- Instagram: ${brandContext.igHandle}`);
      if (brandContext.brandColors) parts.push(`- Colores de marca: ${brandContext.brandColors}`);
      if (brandContext.brandTone) parts.push(`- Tono: ${brandContext.brandTone}`);
      if (brandContext.services) parts.push(`- Servicios: ${brandContext.services}`);
      if (brandContext.targetAudience) parts.push(`- Público objetivo: ${brandContext.targetAudience}`);
      if (brandContext.competitors) parts.push(`- Competidores: ${brandContext.competitors}`);
      if (brandContext.contentNotes) parts.push(`- Notas: ${brandContext.contentNotes}`);
      if (brandContext.photoMode) parts.push(`- Modo de fotos: ${brandContext.photoMode}`);
      if (brandContext.logoMode) parts.push(`- Modo de logo: ${brandContext.logoMode}`);
      if (brandContext.availablePhotos) parts.push(`- Fotos disponibles: ${brandContext.availablePhotos}`);
      if (brandContext.brandDocument) parts.push(`\n## DOCUMENTO DE MARCA / BRIEF\n${brandContext.brandDocument}`);
      parts.push('\nUSA toda esta información para personalizar el plan. NO preguntes datos que ya tienes aquí. Si ya tienes nombre, tipo, servicios y audiencia, puedes ir directo a proponer los 5 pilares.');
      fullPrompt += parts.join('\n');
    }

    const apiMessages = [
      { role: 'system', content: fullPrompt },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role === 'system' ? 'assistant' : m.role,
        content: m.content,
      })),
    ];

    const isGemini = model?.startsWith('gemini');
    const isOpenAI = model?.startsWith('gpt') || model?.startsWith('claude');

    let reply = '';
    let campaign = null;

    if (isGemini) {
      const geminiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
      if (!geminiKey) {
        return NextResponse.json(
          { error: 'GOOGLE_API_KEY not configured. Add it to .env file.' },
          { status: 400 }
        );
      }

      const geminiModel = model || 'gemini-2.5-flash';
      const geminiMessages = apiMessages.map((m) => ({
        role: m.role === 'system' ? 'user' : m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: geminiMessages,
            generationConfig: {
              temperature: 0.8,
              maxOutputTokens: 32768,
            },
          }),
        }
      );

      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json({ error: err }, { status: res.status });
      }

      const data = await res.json();
      reply =
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        'No se pudo generar respuesta.';
    } else {
      const openaiKey = process.env.OPENAI_API_KEY;
      if (!openaiKey) {
        return NextResponse.json(
          { error: 'OPENAI_API_KEY not configured' },
          { status: 400 }
        );
      }

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: model || 'gpt-4.1-mini',
          messages: apiMessages,
          temperature: 0.8,
          max_tokens: 8192,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json({ error: err }, { status: res.status });
      }

      const data = await res.json();
      reply = data.choices?.[0]?.message?.content || 'No se pudo generar respuesta.';
    }

    const jsonMatch = reply.match(/```json\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.campaign) {
          campaign = {
            ...parsed.campaign,
            id: `campaign_${Date.now()}`,
            status: 'planning',
            published: 0,
            model: model,
            createdAt: new Date().toISOString(),
          };
        }
      } catch {
        // JSON parse failed — no campaign extracted, reply still sent
      }
    }

    return NextResponse.json({ reply, campaign });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal error' },
      { status: 500 }
    );
  }
}
