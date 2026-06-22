/**
 * VISION ANALYZER
 * ===============
 * Usa Gemini Vision (gemini-1.5-flash o gemini-2.0-flash-exp)
 * para analizar imágenes existentes y extraer:
 * - Paleta de colores dominante
 * - Estilo visual (minimalista, vibrante, dark, etc.)
 * - Tipo de contenido (producto, lifestyle, carrusel)
 * - Elementos de marca detectados
 *
 * Devuelve un objeto { palette, style, contentType, brandElements, description }
 */

import * as fs from 'fs';
import * as path from 'path';

export interface VisionAnalysis {
  palette: string[];       // colores dominantes detectados
  style: string;           // estilo visual: minimalista, vibrante, dark, etc.
  contentType: string;     // producto, lifestyle, carrusel, persona, etc.
  brandElements: string[]; // elementos de marca detectados
  description: string;     // descripción textual para el agente
}

/**
 * Analiza una imagen usando Gemini Vision.
 * Acepta ruta local o URL pública.
 */
export async function analyzeImageWithGemini(
  imagePath: string,
  googleApiKey: string
): Promise<VisionAnalysis | null> {
  try {
    // Leer imagen como base64
    let imageBase64: string;
    let mimeType = 'image/jpeg';

    if (imagePath.startsWith('http')) {
      // URL pública: descargar
      const res = await fetch(imagePath, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) return null;
      const buffer = await res.arrayBuffer();
      imageBase64 = Buffer.from(buffer).toString('base64');
      const ct = res.headers.get('content-type');
      if (ct) mimeType = ct.split(';')[0];
    } else {
      // Ruta local: leer del sistema de archivos
      if (!fs.existsSync(imagePath)) return null;
      const buffer = fs.readFileSync(imagePath);
      imageBase64 = buffer.toString('base64');
      const ext = path.extname(imagePath).toLowerCase();
      const mimeMap: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.gif': 'image/gif',
      };
      mimeType = mimeMap[ext] || 'image/jpeg';
    }

    // Llamar a Gemini 1.5 Flash con visión
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${googleApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType,
                    data: imageBase64,
                  },
                },
                {
                  text: `Analiza esta imagen y devuelve SOLO un JSON con esta estructura exacta (sin texto extra):
{
  "palette": ["lista de 3-5 colores dominantes en formato hex o nombre descriptivo"],
  "style": "descripción del estilo visual: minimalista | vibrante | dark | pastel | corporativo | lifestyle | etc.",
  "contentType": "tipo de contenido: producto | lifestyle | persona | carrusel | infografía | etc.",
  "brandElements": ["lista de elementos de marca visibles: logos, colores corporativos, tipografía especial, etc."],
  "description": "descripción de 2-3 oraciones del contenido visual para usar en prompts de IA"
}`,
                },
              ],
            },
          ],
          generationConfig: { maxOutputTokens: 500 },
        }),
        signal: AbortSignal.timeout(30_000),
      }
    );

    if (!res.ok) return null;

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const cleaned = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned) as VisionAnalysis;
  } catch {
    return null;
  }
}

/**
 * Analiza múltiples imágenes y consolida los resultados.
 * Toma máximo las primeras 3 imágenes para no exceder costos.
 */
export async function analyzeAssets(
  imagePaths: string[],
  googleApiKey: string
): Promise<VisionAnalysis | null> {
  const toAnalyze = imagePaths.slice(0, 3);

  const results = await Promise.allSettled(
    toAnalyze.map((p) => analyzeImageWithGemini(p, googleApiKey))
  );

  const valid = results
    .filter(
      (r): r is PromiseFulfilledResult<VisionAnalysis | null> =>
        r.status === 'fulfilled' && r.value !== null
    )
    .map((r) => r.value as VisionAnalysis);

  if (!valid.length) return null;

  // Consolidar: usar la primera análisis como base y combinar elementos
  const base = valid[0];
  const allBrandElements = Array.from(
    new Set(valid.flatMap((v) => v.brandElements))
  );
  const allPalette = Array.from(new Set(valid.flatMap((v) => v.palette)));

  return {
    ...base,
    palette: allPalette.slice(0, 6),
    brandElements: allBrandElements,
    description:
      valid.length > 1
        ? `Análisis de ${valid.length} imágenes. ` + base.description
        : base.description,
  };
}
