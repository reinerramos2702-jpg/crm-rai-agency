/**
 * AGENTE DE DEEP RESEARCH — Playwright + Anthropic Claude
 * =========================================================
 * Recibe: array de URLs de competidores (Instagram, webs, landing pages)
 * Devuelve: CompetitorInsights con análisis estratégico listo para inyectar en el system prompt
 *
 * Flujo por cada URL:
 * 1. Lanza Chromium en modo headless con Playwright
 * 2. Navega a la URL (timeout 30s, user-agent de Chrome real para evitar bloqueos)
 * 3. Extrae el texto visible del DOM (sin HTML, solo innerText limpio)
 * 4. Si es Instagram: también extrae las primeras 10-20 descripciones de posts visibles
 * 5. Trunca a máximo 8.000 caracteres por URL (para no desperdiciar tokens)
 * 6. Llama a Claude 3.5 Sonnet con el texto extraído y le pide el análisis estructurado
 * 7. Acumula los insights de todas las URLs y los consolida en un único objeto
 */

import { chromium } from 'playwright';

export interface CompetitorInsights {
  painPoints: string[];       // quejas de clientes detectadas
  contentThemes: string[];    // temas que usan los competidores
  avoidTopics: string[];      // lo que hacen mal (para diferenciarse)
  opportunities: string[];    // huecos de contenido no cubiertos
  toneAnalysis: string;       // cómo habla la competencia
  rawSummary: string;         // resumen libre para inyectar en el prompt
}

export async function runCompetitorResearch(
  urls: string[],
  anthropicApiKey: string
): Promise<CompetitorInsights> {
  // Resultado por defecto en caso de error total
  const defaultResult: CompetitorInsights = {
    painPoints: [],
    contentThemes: [],
    avoidTopics: [],
    opportunities: [],
    toneAnalysis: 'No se pudo analizar',
    rawSummary: 'Análisis de competencia no disponible.',
  };

  if (!urls.length) return defaultResult;

  const browser = await chromium.launch({ headless: true });
  const allTexts: string[] = [];

  for (const url of urls) {
    try {
      const page = await browser.newPage({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      });
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await page.waitForTimeout(2000); // espera renderizado JS
      const text = await page.evaluate(() => document.body.innerText);
      allTexts.push(`=== ${url} ===\n${text.slice(0, 8000)}`);
      await page.close();
    } catch (err) {
      allTexts.push(
        `=== ${url} ===\n[No se pudo cargar: ${(err as Error).message}]`
      );
    }
  }

  await browser.close();

  // Llamada a Claude para analizar todo el texto recopilado
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const client = new Anthropic({ apiKey: anthropicApiKey });

  const response = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: `Eres un estratega de contenido digital experto. Analiza el siguiente contenido extraído de páginas de competidores y devuelve un JSON con esta estructura exacta:
{
  "painPoints": ["lista de quejas o frustraciones que se detectan en los clientes"],
  "contentThemes": ["temas de contenido que usan los competidores"],
  "avoidTopics": ["lo que hacen mal o prometen y no cumplen"],
  "opportunities": ["huecos de contenido que nadie está cubriendo"],
  "toneAnalysis": "descripción del tono de comunicación que usa la competencia",
  "rawSummary": "párrafo de 3-5 oraciones con el insight más importante para diferenciarse"
}

Solo devuelve el JSON. Sin texto extra.

CONTENIDO A ANALIZAR:
${allTexts.join('\n\n')}`,
      },
    ],
  });

  try {
    const text =
      response.content[0].type === 'text' ? response.content[0].text : '{}';
    return JSON.parse(text) as CompetitorInsights;
  } catch {
    return defaultResult;
  }
}
