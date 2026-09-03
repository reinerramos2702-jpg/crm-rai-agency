import crypto from 'node:crypto';
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

/**
 * `state` del dialog OAuth firmado con HMAC (usa JWT_SECRET, ya presente en el
 * entorno — sin variable nueva). El callback de Meta es un redirect de browser
 * sin el header `Authorization` de la sesión JWT del CRM, así que el workspaceId
 * viaja aquí — pero debe venir firmado para que nadie pueda forjar un `state`
 * apuntando al workspace de otro tenant y robarle la conexión de Instagram
 * (validación de autenticidad de integraciones externas, sección 3 del master prompt).
 */
function stateSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET no configurado — requerido para firmar el state de OAuth');
  return secret;
}

export function encodeOAuthState(workspaceId: string): string {
  const payload = Buffer.from(JSON.stringify({ workspaceId })).toString('base64url');
  const sig = crypto.createHmac('sha256', stateSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

/** Decodifica y verifica la firma del `state` del dialog OAuth. Devuelve null si es inválido o fue alterado. */
export function decodeOAuthState(state: string | null): { workspaceId: string } | null {
  if (!state) return null;
  const [payload, sig] = state.split('.');
  if (!payload || !sig) return null;
  const expectedSig = crypto.createHmac('sha256', stateSecret()).update(payload).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig).subarray(0, Buffer.from(sig).length))) {
    // Longitudes distintas ya delatan manipulación — comparar solo si calzan.
  }
  if (sig.length !== expectedSig.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof parsed?.workspaceId === 'string' && parsed.workspaceId) return { workspaceId: parsed.workspaceId };
    return null;
  } catch {
    return null;
  }
}
