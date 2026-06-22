import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { dispatchToN8n } from '@/lib/n8n-dispatcher';

export const runtime = 'nodejs';

/**
 * POST /api/webhook/dispatch
 * Body: { taskId }
 *
 * Reenvía manualmente el payload de una task completada al webhook de n8n.
 * Útil para disparar publicación manual desde la UI.
 */
export async function POST(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { taskId } = await req.json();
  if (!taskId) return NextResponse.json({ error: 'Se requiere taskId' }, { status: 400 });

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      assets: true,
      execution: {
        include: {
          campaign: true,
        },
      },
    },
  });

  if (!task) return NextResponse.json({ error: 'Task no encontrada' }, { status: 404 });
  if (task.execution.campaign.userId !== auth.userId) {
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 });
  }

  // Obtener URL del webhook desde Settings o master JSON
  const master = task.execution.campaign.masterJson as Record<string, unknown>;
  const settings = await prisma.settings.findUnique({ where: { id: 'global' } });
  const webhookUrl =
    (master?.n8nWebhookUrl as string) ||
    settings?.n8nWebhookUrl ||
    process.env.N8N_WEBHOOK_URL;

  if (!webhookUrl) {
    return NextResponse.json(
      { error: 'No hay webhook de n8n configurado. Ve a Configuración.' },
      { status: 422 }
    );
  }

  // Construir payload desde assets guardados
  const videoAsset = task.assets.find((a) => a.kind === 'video');
  const imageAsset = task.assets.find((a) => a.kind === 'image');
  const voiceAsset = task.assets.find((a) => a.kind === 'voice');
  const musicAsset = task.assets.find((a) => a.kind === 'music');

  const masterNode = task.masterNode as Record<string, unknown>;
  const outputJson = task.outputJson as Record<string, Record<string, unknown>>;
  const copyData = outputJson?.copy?.data as Record<string, unknown> || {};
  const brandData = master?.brand as Record<string, unknown> || {};

  const result = await dispatchToN8n(webhookUrl, {
    event: 'task.completed',
    taskId,
    dayNumber: (masterNode?.dayNumber as number) || task.index + 1,
    publicationMode:
      ((masterNode?.publicationMode as string) as 'auto_instagram' | 'manual_push' | 'schedule_only') ||
      'manual_push',
    assets: {
      video: videoAsset ? { url: videoAsset.publicUrl, r2Key: videoAsset.r2Key } : undefined,
      image: imageAsset ? { url: imageAsset.publicUrl, r2Key: imageAsset.r2Key } : undefined,
      voice: voiceAsset ? { url: voiceAsset.publicUrl, r2Key: voiceAsset.r2Key } : undefined,
      music: musicAsset ? { url: musicAsset.publicUrl, r2Key: musicAsset.r2Key } : undefined,
    },
    copy: {
      caption: (masterNode?.caption as string) || (copyData?.caption as string),
      hashtags: (masterNode?.hashtags as string[]) || (copyData?.hashtags as string[]),
      callToAction: masterNode?.callToAction as string,
      script: copyData?.script as string,
    },
    brand: {
      instagramHandle: brandData?.instagramHandle as string,
      igPageId: master?.igPageId as string,
    },
    scheduledFor: masterNode?.scheduledFor as string,
    campaignName: task.execution.campaign.name,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: `Error enviando a n8n: ${result.error}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
