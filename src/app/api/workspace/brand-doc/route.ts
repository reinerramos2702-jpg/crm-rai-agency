import { NextRequest } from 'next/server';
import { getAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getOrCreateWorkspace, getOrCreateWorkspaceFull } from '@/lib/workspace';
import { extractTextFromDocx } from '@/lib/docx-extract';

export const runtime = 'nodejs';

/**
 * Doc "Sistema Operativo de Contenido" del workspace (placeholder de "bucket"
 * hasta integrar Hostinger). Cualquier usuario puede arrastrar SU PROPIO .docx
 * con las reglas de marca/narrativa de su agencia — se extrae el texto y queda
 * disponible como contexto para el wizard "Generador Imágenes".
 *
 * GET    /api/workspace/brand-doc → { brandDocName, brandDocText, brandDocUpdatedAt }
 * POST   /api/workspace/brand-doc (multipart/form-data, campo "file" = .docx) → guarda texto extraído
 * DELETE /api/workspace/brand-doc → limpia el doc de marca del workspace
 */

export async function GET(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return new Response('Unauthorized', { status: 401 });

  const ws = await getOrCreateWorkspaceFull(auth.userId);
  return Response.json({
    brandDocName: ws.brandDocName,
    brandDocText: ws.brandDocText,
    brandDocUpdatedAt: ws.brandDocUpdatedAt,
    hasBrandDoc: !!ws.brandDocText,
  });
}

export async function POST(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return new Response('Unauthorized', { status: 401 });

  const ws = await getOrCreateWorkspace(auth.userId);

  const contentType = req.headers.get('content-type') || '';
  if (!contentType.includes('multipart/form-data')) {
    return Response.json({ error: 'Se esperaba multipart/form-data con campo "file"' }, { status: 400 });
  }

  const formData = await req.formData();
  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return Response.json({ error: 'Falta el archivo (campo "file")' }, { status: 400 });
  }

  const isDocx =
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file.name.toLowerCase().endsWith('.docx');
  if (!isDocx) {
    return Response.json({ error: 'Solo se aceptan archivos .docx' }, { status: 400 });
  }

  let text: string;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    text = await extractTextFromDocx(buffer);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al leer el .docx';
    return Response.json({ error: message }, { status: 400 });
  }

  if (!text.trim()) {
    return Response.json({ error: 'El documento no contiene texto legible' }, { status: 400 });
  }

  const updated = await prisma.workspace.update({
    where: { id: ws.id },
    data: {
      brandDocText: text,
      brandDocName: file.name,
      brandDocUpdatedAt: new Date(),
    },
  });

  return Response.json({
    brandDocName: updated.brandDocName,
    brandDocUpdatedAt: updated.brandDocUpdatedAt,
    charCount: text.length,
    preview: text.slice(0, 600),
  });
}

export async function DELETE(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return new Response('Unauthorized', { status: 401 });

  const ws = await getOrCreateWorkspace(auth.userId);
  await prisma.workspace.update({
    where: { id: ws.id },
    data: { brandDocText: null, brandDocName: null, brandDocUpdatedAt: null },
  });

  return Response.json({ ok: true });
}
