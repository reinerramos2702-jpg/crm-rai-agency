/**
 * Envío del enlace de recuperación de contraseña por email o SMS.
 *
 * - EMAIL: proveedor Resend (plan gratuito) → se activa con `RESEND_API_KEY` y `EMAIL_FROM`
 *   (remitente de un dominio verificado en Resend, ej. `RAI Agency <no-reply@raiagency.net>`).
 *   La clave la pone Reiner en el entorno; nunca va en código ni commits.
 * - SMS: proveedor PENDIENTE (no hay opción gratuita; ver docs/SPEC-recuperar-contrasena.md).
 * - Sin proveedor: desarrollo/staging (NODE_ENV !== 'production') imprime el enlace en la
 *   terminal del servidor; producción NO envía ni imprime el enlace (devuelve ok:false).
 */
export type ResetChannel = 'email' | 'sms';

export interface ResetMessage {
  channel: ResetChannel;
  to: string;
  link: string;
}

export async function sendPasswordReset(msg: ResetMessage): Promise<{ ok: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (msg.channel === 'email' && apiKey && from) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [msg.to],
        subject: 'Restablece tu contraseña — RAI Agency',
        text: `Recibimos una solicitud para restablecer tu contraseña.\n\nAbre este enlace (vence en 30 minutos):\n${msg.link}\n\nSi no fuiste tú, ignora este mensaje.`,
        html: `<p>Recibimos una solicitud para restablecer tu contraseña.</p><p><a href="${msg.link}">Crear una contraseña nueva</a> (vence en 30 minutos).</p><p>Si no fuiste tú, ignora este mensaje.</p>`,
      }),
    });
    return { ok: res.ok };
  }
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
