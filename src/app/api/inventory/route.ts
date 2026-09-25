import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { analyzeAssets } from '@/agents/vision-analyzer';
import {
  getInventoryAllowedRoots,
  InventoryPathError,
  resolveInventoryDescendant,
  resolveInventoryRoot,
} from '@/lib/inventory-paths';
import { resolveApiKey } from '@/lib/llm-providers';
import { CAMPAIGN_ROLES, isRoleContext, requireRole } from '@/lib/roles';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/inventory?path=<ruta habilitada del workspace>
 *
 * Lee una carpeta dentro de las bases administradas por servidor para el workspace.
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
  const ctx = await requireRole(req, CAMPAIGN_ROLES);
  if (!isRoleContext(ctx)) return ctx;

  const { searchParams } = new URL(req.url);
  const requestedPath = searchParams.get('path');

  if (!requestedPath) {
    return NextResponse.json({ error: 'Se requiere el parámetro ?path=' }, { status: 400 });
  }

  let allowedRoots: string[];
  let folderPath: string;
  try {
    allowedRoots = getInventoryAllowedRoots(ctx.workspace.id);
    folderPath = resolveInventoryRoot(requestedPath, allowedRoots);
  } catch (error) {
    if (error instanceof InventoryPathError) {
      const status = error.code === 'NOT_FOUND' ? 404 : error.code === 'NOT_ALLOWED' ? 403 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: 'No se pudo validar la carpeta' }, { status: 500 });
  }

  const IMAGEN_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
  const VIDEO_EXTS = new Set(['.mp4', '.mov', '.avi', '.mkv', '.webm']);
  const AUDIO_EXTS = new Set(['.mp3', '.wav', '.m4a', '.aac', '.ogg']);

  // Regex flexible para carpetas de día
  const DAY_REGEX = /d[íi]a\s*(\d+)/i;

  const googleApiKey =
    (await resolveApiKey(ctx.workspace.id, 'google')) || process.env.GOOGLE_API_KEY;

  // Leer entradas de la carpeta raíz
  let entries: fs.Dirent[];
  try {
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- folderPath is canonicalized, realpath-checked and constrained to INVENTORY_ALLOWED_ROOTS above.
    entries = fs.readdirSync(folderPath, { withFileTypes: true });
  } catch {
    return NextResponse.json({ error: 'No se pudo leer el inventario' }, { status: 500 });
  }

  try {
    // Filtrar solo subdirectorios que coincidan con "Día N" y validar su realpath.
    const dayFolders = entries
      .filter((e) => e.isDirectory() && DAY_REGEX.test(e.name))
      .map((e) => {
        const match = e.name.match(DAY_REGEX);
        return {
          dayNumber: parseInt(match![1], 10),
          folderName: e.name,
          folderPath: resolveInventoryDescendant(folderPath, e.name, allowedRoots),
        };
      })
      .sort((a, b) => a.dayNumber - b.dayNumber);

    // Si no hay carpetas "Día N", escanear archivos directamente en la raíz.
    if (dayFolders.length === 0) {
      const rootAssets = entries
        .filter((e) => e.isFile())
        .map((e) => {
          const ext = path.extname(e.name).toLowerCase();
          const localPath = resolveInventoryDescendant(folderPath, e.name, allowedRoots);
          let type: 'image' | 'video' | 'audio' | 'other' = 'other';
          if (IMAGEN_EXTS.has(ext)) type = 'image';
          else if (VIDEO_EXTS.has(ext)) type = 'video';
          else if (AUDIO_EXTS.has(ext)) type = 'audio';
          // eslint-disable-next-line security/detect-non-literal-fs-filename -- localPath is the realpath returned by resolveInventoryDescendant within this workspace's server-managed root.
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

    // Procesar cada carpeta de día.
    const days = await Promise.all(
      dayFolders.map(async (day) => {
        let files: fs.Dirent[];
        try {
          // eslint-disable-next-line security/detect-non-literal-fs-filename -- day.folderPath is the realpath returned by resolveInventoryDescendant within this workspace's server-managed root.
          files = fs.readdirSync(day.folderPath, { withFileTypes: true });
        } catch {
          return {
            dayNumber: day.dayNumber,
            folderPath: day.folderPath,
            existingAssets: [],
            hasContent: false,
          };
        }

        // Clasificar únicamente archivos cuyo realpath siga dentro del workspace.
        const assets = files
          .filter((f) => f.isFile())
          .map((f) => {
            const ext = path.extname(f.name).toLowerCase();
            const localPath = resolveInventoryDescendant(day.folderPath, f.name, allowedRoots);
            let type: 'image' | 'video' | 'audio' | 'other' = 'other';
            if (IMAGEN_EXTS.has(ext)) type = 'image';
            else if (VIDEO_EXTS.has(ext)) type = 'video';
            else if (AUDIO_EXTS.has(ext)) type = 'audio';
            // eslint-disable-next-line security/detect-non-literal-fs-filename -- localPath is the realpath returned by resolveInventoryDescendant within this workspace's server-managed root.
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
  } catch (error) {
    if (error instanceof InventoryPathError) {
      const status = error.code === 'NOT_FOUND' ? 404 : error.code === 'NOT_ALLOWED' ? 403 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: 'No se pudo procesar el inventario' }, { status: 500 });
  }
}
