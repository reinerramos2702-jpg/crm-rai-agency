import { prisma } from '@/lib/db';
import { assertWorkspaceScope } from './base';

/** Conexión Meta de un workspace, sin secretos (para responder al frontend). */
export interface MetaConnectionPublicView {
  metaMode: 'shared_app' | 'own_app';
  hasOwnAppCredentials: boolean;
  igBusinessId: string | null;
  pageId: string | null;
  isConnected: boolean;
  tokenExpiresAt: Date | null;
  connectedAt: Date | null;
}

function toPublicView(row: Awaited<ReturnType<typeof prisma.workspaceMetaConnection.findUnique>>): MetaConnectionPublicView {
  return {
    metaMode: (row?.metaMode as 'shared_app' | 'own_app') ?? 'shared_app',
    hasOwnAppCredentials: !!row?.ownAppId && !!row?.ownAppSecretCipher,
    igBusinessId: row?.igBusinessId ?? null,
    pageId: row?.pageId ?? null,
    isConnected: !!row?.accessTokenCipher,
    tokenExpiresAt: row?.tokenExpiresAt ?? null,
    connectedAt: row?.connectedAt ?? null,
  };
}

export async function getMetaConnectionView(workspaceId: string): Promise<MetaConnectionPublicView> {
  assertWorkspaceScope(workspaceId);
  const row = await prisma.workspaceMetaConnection.findUnique({ where: { workspaceId } });
  return toPublicView(row);
}

/** Devuelve la fila cruda (con secretos cifrados) — solo para uso interno server-side, nunca serializar directo al cliente. */
export async function getMetaConnectionRaw(workspaceId: string) {
  assertWorkspaceScope(workspaceId);
  return prisma.workspaceMetaConnection.findUnique({ where: { workspaceId } });
}

export async function setMetaMode(
  workspaceId: string,
  metaMode: 'shared_app' | 'own_app'
): Promise<MetaConnectionPublicView> {
  assertWorkspaceScope(workspaceId);
  const row = await prisma.workspaceMetaConnection.upsert({
    where: { workspaceId },
    create: { workspaceId, metaMode },
    update: { metaMode },
  });
  return toPublicView(row);
}

export async function saveOwnAppCredentials(
  workspaceId: string,
  ownAppId: string,
  secret: { ciphertext: string; iv: string; authTag: string }
): Promise<MetaConnectionPublicView> {
  assertWorkspaceScope(workspaceId);
  const row = await prisma.workspaceMetaConnection.upsert({
    where: { workspaceId },
    create: {
      workspaceId,
      metaMode: 'own_app',
      ownAppId,
      ownAppSecretCipher: secret.ciphertext,
      ownAppSecretIv: secret.iv,
      ownAppSecretTag: secret.authTag,
    },
    update: {
      ownAppId,
      ownAppSecretCipher: secret.ciphertext,
      ownAppSecretIv: secret.iv,
      ownAppSecretTag: secret.authTag,
    },
  });
  return toPublicView(row);
}

export async function saveMetaTokenConnection(
  workspaceId: string,
  data: {
    igBusinessId: string;
    pageId?: string;
    accessToken: { ciphertext: string; iv: string; authTag: string };
    tokenExpiresAt?: Date;
    connectedByUserId: string;
  }
): Promise<MetaConnectionPublicView> {
  assertWorkspaceScope(workspaceId);
  const row = await prisma.workspaceMetaConnection.upsert({
    where: { workspaceId },
    create: {
      workspaceId,
      igBusinessId: data.igBusinessId,
      pageId: data.pageId,
      accessTokenCipher: data.accessToken.ciphertext,
      accessTokenIv: data.accessToken.iv,
      accessTokenTag: data.accessToken.authTag,
      tokenExpiresAt: data.tokenExpiresAt,
      connectedAt: new Date(),
      connectedByUserId: data.connectedByUserId,
    },
    update: {
      igBusinessId: data.igBusinessId,
      pageId: data.pageId,
      accessTokenCipher: data.accessToken.ciphertext,
      accessTokenIv: data.accessToken.iv,
      accessTokenTag: data.accessToken.authTag,
      tokenExpiresAt: data.tokenExpiresAt,
      connectedAt: new Date(),
      connectedByUserId: data.connectedByUserId,
    },
  });
  return toPublicView(row);
}

export async function disconnectMeta(workspaceId: string): Promise<void> {
  assertWorkspaceScope(workspaceId);
  await prisma.workspaceMetaConnection.updateMany({
    where: { workspaceId },
    data: {
      accessTokenCipher: null,
      accessTokenIv: null,
      accessTokenTag: null,
      tokenExpiresAt: null,
      connectedAt: null,
      connectedByUserId: null,
    },
  });
}
