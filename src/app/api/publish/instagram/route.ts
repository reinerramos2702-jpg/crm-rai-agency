import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/crypto';

export const runtime = 'nodejs';

/**
 * POST /api/publish/instagram
 * Body: { taskId, assetUrl, caption, assetType: 'VIDEO' | 'IMAGE' }
 *
 * Publica contenido en Instagram vía Meta Graph API:
 * 1. Crea media container: POST /{ig-user-id}/media
 * 2. Publica el container: POST /{ig-user-id}/media_publish
 * 3. Actualiza el Asset en DB con el permalink de Instagram
 *
 * El access token viene del ApiKey 'instagram' del usuario (BYOK, desencriptado)
 * El ig-user-id viene de Settings.igBusinessId
 */
export async function POST(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { taskId, assetUrl, caption, assetType } = await req.json();

  if (!taskId || !assetUrl || !assetType) {
    return NextResponse.json(
      { error: 'Se requieren taskId, assetUrl y assetType' },
      { status: 400 }
    );
  }

  // Obtener access token de Instagram desde BYOK
  const igKeyRecord = await prisma.apiKey.findFirst({
    where: { userId: auth.userId, provider: 'instagram', validated: true },
  });

  if (!igKeyRecord) {
    return NextResponse.json(
      { error: 'No hay Instagram Access Token configurado. Ve a Claves de IA y agrega tu token.' },
      { status: 422 }
    );
  }

  const accessToken = decrypt(igKeyRecord.ciphertext, igKeyRecord.iv, igKeyRecord.authTag);

  // Obtener Business Account ID desde Settings
  const settings = await prisma.settings.findUnique({ where: { id: 'global' } });
  const igBusinessId = settings?.igBusinessId;

  if (!igBusinessId) {
    return NextResponse.json(
      { error: 'No hay Instagram Business Account ID configurado. Ve a Configuración.' },
      { status: 422 }
    );
  }

  // === Paso 1: Crear media container ===
  const containerBody: Record<string, string> = {
    access_token: accessToken,
    caption: caption || '',
  };

  if (assetType === 'VIDEO') {
    containerBody.media_type = 'REELS';
    containerBody.video_url = assetUrl;
    containerBody.share_to_feed = 'true';
  } else {
    containerBody.image_url = assetUrl;
  }

  const containerRes = await fetch(
    `https://graph.facebook.com/v19.0/${igBusinessId}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(containerBody),
      signal: AbortSignal.timeout(30_000),
    }
  );

  if (!containerRes.ok) {
    const errData = await containerRes.json();
    return NextResponse.json(
      { error: 'Error creando media container en Instagram', details: errData },
      { status: 500 }
    );
  }

  const containerData = await containerRes.json() as { id: string };
  const containerId = containerData.id;

  // Para videos, esperar procesamiento
  if (assetType === 'VIDEO') {
    await waitForVideoProcessing(igBusinessId, containerId, accessToken);
  }

  // === Paso 2: Publicar el container ===
  const publishRes = await fetch(
    `https://graph.facebook.com/v19.0/${igBusinessId}/media_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: accessToken,
      }),
      signal: AbortSignal.timeout(30_000),
    }
  );

  if (!publishRes.ok) {
    const errData = await publishRes.json();
    return NextResponse.json(
      { error: 'Error publicando en Instagram', details: errData },
      { status: 500 }
    );
  }

  const publishData = await publishRes.json() as { id: string };
  const mediaId = publishData.id;

  // Construir permalink
  const permalink = `https://www.instagram.com/p/${mediaId}/`;

  // === Paso 3: Actualizar Asset en DB ===
  await prisma.asset.updateMany({
    where: { taskId, publicUrl: assetUrl },
    data: {
      metadata: {
        publishedAt: new Date().toISOString(),
        instagramMediaId: mediaId,
        permalink,
      },
    },
  });

  return NextResponse.json({ success: true, mediaId, permalink });
}

/**
 * Espera a que Instagram procese un video antes de publicar.
 * Polling con max 10 intentos (50 segundos).
 */
async function waitForVideoProcessing(
  igBusinessId: string,
  containerId: string,
  accessToken: string
): Promise<void> {
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 5000));

    const statusRes = await fetch(
      `https://graph.facebook.com/v19.0/${containerId}?fields=status_code&access_token=${accessToken}`,
      { signal: AbortSignal.timeout(10_000) }
    );

    const statusData = await statusRes.json() as { status_code?: string };
    if (statusData.status_code === 'FINISHED') return;
    if (statusData.status_code === 'ERROR') {
      throw new Error('Error procesando video en Instagram');
    }
  }
  // Agotar intentos: intentar publicar de todos modos
}
