import { decrypt } from './crypto';

/**
 * Helpers compartidos del flujo OAuth híbrido de Meta (Bloque 1). Separado de
 * los route handlers de `/api/workspace/meta/oauth/*` porque Next.js App
 * Router solo permite exportar métodos HTTP + config (`runtime`, `dynamic`)
 * desde un `route.ts` — cualquier otro export ahí rompe la convención.
 */
export const GRAPH_VERSION = 'v19.0';
export const OAUTH_SCOPES = 'instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement';

/** Resuelve el App Secret real: own_app descifrado, o el de la app compartida vía env. */
export function resolveAppSecret(
  metaMode: string,
  ownAppSecretCipher?: string | null,
  ownAppSecretIv?: string | null,
  ownAppSecretTag?: string | null
): string | undefined {
  if (metaMode === 'own_app') {
    if (!ownAppSecretCipher || !ownAppSecretIv || !ownAppSecretTag) return undefined;
    return decrypt(ownAppSecretCipher, ownAppSecretIv, ownAppSecretTag);
  }
  return process.env.META_SHARED_APP_SECRET;
}

/** Decodifica el `state` del dialog OAuth de vuelta al workspaceId que lo inició. */
export function decodeOAuthState(state: string | null): { workspaceId: string } | null {
  if (!state) return null;
  try {
    const parsed = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
    if (typeof parsed?.workspaceId === 'string' && parsed.workspaceId) return { workspaceId: parsed.workspaceId };
    return null;
  } catch {
    return null;
  }
}
