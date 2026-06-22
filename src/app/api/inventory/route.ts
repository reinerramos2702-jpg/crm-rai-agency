import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { analyzeAssets } from '@/agents/vision-analyzer';
import { resolveApiKey } from '@/lib/llm-providers';
import { getAuth } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/inventory?path=C:/Users/.../Mes_Planificacion
 *
 * Lee una carpeta raíz local y estructura el inventario de assets.
 * - Lee subcarpetas que coincidan con "Dia N" o "Día N" (regex flexible)
 * - Clasifica por extensión: imagen, video, audio
 * - Si hay imágenes → llama a Gemini Vision para análisis
 *
 * Responde con:
 * {
 *   days: [
 *     {
 *       dayNumber: 1,
 *       folderPath: "...",
 *       existingAssets: [ { name, type, path, sizeBytes, visionAnalysis? } ],
 *       hasContent: boolean
 *     }
 *   ]
 * }
 */
export async function GET(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const folderPath = searchParams.get('path');

  if (!folderPath) {
    return NextResponse.json({ error: 'Se requiere el parámetro ?path=' }, { status: 400 });
  }

  // Verificar que la carpeta existe
  if (!fs.existsSync(folderPath)) {
    return NextResponse.json({ error: `Carpeta no encontrada: ${folderPath}` }, { status: 404 });
  }

  const IMAGEN_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
  const VIDEO_EXTS = new Set(['.mp4', '.mov', '.avi', '.mkv', '.webm']);
  const AUDIO_EXTS = new Set(['.mp3', '.wav', '.m4a', '.aac', '.ogg']);

  // Regex flexible para carpetas de día
  const DAY_REGEX = /d[íi]a\s*(\d+)/i;

  const googleApiKey =
    (await resolveApiKey(auth.userId, 'google')) || process.env.GOOGLE_API_KEY;

  // Leer entradas de la carpeta raíz
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(folderPath, { withFileTypes: true });
  } catch (err) {
    return NextResponse.json(
      { error: `Error leyendo carpeta: ${(err as Error).message}` },
      { status: 500 }
    );
  }

  // Filtrar solo subdirectorios que coincidan con "Día N"
  const dayFolders = entries
    .filter((e) => e.isDirectory() && DAY_REGEX.test(e.name))
    .map((e) => {
      const match = e.name.match(DAY_REGEX);
      return {
        dayNumber: parseInt(match![1], 10),
        folderName: e.name,
        folderPath: path.join(folderPath, e.name),
      };
    })
    .sort((a, b) => a.dayNumber - b.dayNumber);

  // Si no hay carpetas "Día N", escanear archivos directamente en la raíz
  if (dayFolders.length === 0) {
    const rootAssets = entries
      .filter((e) => e.isFile())
      .map((e) => {
        const ext = path.extname(e.name).toLowerCase();
        const localPath = path.join(folderPath, e.name);
        let type: 'image' | 'video' | 'audio' | 'other' = 'other';
        if (IMAGEN_EXTS.has(ext)) type = 'image';
        else if (VIDEO_EXTS.has(ext)) type = 'video';
        else if (AUDIO_EXTS.has(ext)) type = 'audio';
        const stats = fs.statSync(localPath);
        return { name: e.name, type, path: localPath, sizeBytes: stats.size };
      })
      .filter((a) => a.type !== 'other');

    const allSubdirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);

    return NextResponse.json({
      days: [],
      rootPath: folderPath,
      rootFiles: rootAssets,
      warning: allSubdirs.length > 0
        ? `Carpeta encontrada con ${allSubdirs.length} subcarpeta(s) pero ninguna sigue el formato "Día 1", "Día 2"... Subcarpetas detectadas: ${allSubdirs.slice(0, 5).join(', ')}. Renómbralas o crea subcarpetas con ese formato.`
        : rootAssets.length > 0
          ? `No se encontraron subcarpetas "Día N". Se detectaron ${rootAssets.length} archivos multimedia directamente en la carpeta raíz. Para organizar por días, crea subcarpetas: "Día 1", "Día 2", etc.`
          : `Carpeta vacía o sin archivos multimedia. Agrega imágenes/videos o crea subcarpetas "Día 1", "Día 2", etc.`,
    });
  }

  // Procesar cada carpeta de día
  const days = await Promise.all(
    dayFolders.map(async (day) => {
      let files: fs.Dirent[];
      try {
        files = fs.readdirSync(day.folderPath, { withFileTypes: true });
      } catch {
        return {
          dayNumber: day.dayNumber,
          folderPath: day.folderPath,
          existingAssets: [],
          hasContent: false,
        };
      }

      // Clasificar archivos
      const assets = files
        .filter((f) => f.isFile())
        .map((f) => {
          const ext = path.extname(f.name).toLowerCase();
          const localPath = path.join(day.folderPath, f.name);
          let type: 'image' | 'video' | 'audio' | 'other' = 'other';
          if (IMAGEN_EXTS.has(ext)) type = 'image';
          else if (VIDEO_EXTS.has(ext)) type = 'video';
          else if (AUDIO_EXTS.has(ext)) type = 'audio';
          const stats = fs.statSync(localPath);
          return { name: f.name, type, path: localPath, sizeBytes: stats.size };
        })
        .filter((a) => a.type !== 'other');

      const imagePaths = assets.filter((a) => a.type === 'image').map((a) => a.path);
      let visionAnalysis = null;
      if (imagePaths.length > 0 && googleApiKey) {
        visionAnalysis = await analyzeAssets(imagePaths, googleApiKey);
      }

      const enrichedAssets = assets.map((a) => ({
        ...a,
        visionAnalysis: a.type === 'image' ? visionAnalysis : undefined,
      }));

      const hasContent = enrichedAssets.some((a) => a.type === 'image' || a.type === 'video');

      return {
        dayNumber: day.dayNumber,
        folderPath: day.folderPath,
        existingAssets: enrichedAssets,
        hasContent,
      };
    })
  );

  return NextResponse.json({ days, rootPath: folderPath });
}
