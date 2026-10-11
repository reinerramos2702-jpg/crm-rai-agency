/**
 * Envío del enlace de recuperación de contraseña por email o SMS.
 *
 * Proveedores reales (email / SMS): PENDIENTE de decisión y claves de Reiner
 * (ver docs/SPEC-recuperar-contrasena.md). Hasta entonces:
 *  - desarrollo/staging (NODE_ENV !== 'production'): transporte `console` → el enlace
 *    se imprime en la terminal del servidor para poder probar el flujo completo.
 *  - producción sin proveedor configurado: NO envía y devuelve ok:false (nunca imprime
 *    el enlace en logs de producción).
 */
export type ResetChannel = 'email' | 'sms';

export interface ResetMessage {
  channel: ResetChannel;
  to: string;
  link: string;
}

export async function sendPasswordReset(msg: ResetMessage): Promise<{ ok: boolean }> {
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.log(`[auth] Enlace de recuperación (${msg.channel} → ${msg.to}): ${msg.link}`);
    return { ok: true };
  }
  return { ok: false };
}

/** URL base pública para armar el enlace. Nunca se deriva de cabeceras de la petición. */
export function appBaseUrl(): string | null {
  const env = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
  if (env) return env;
  return process.env.NODE_ENV !== 'production' ? 'http://localhost:3000' : null;
}
