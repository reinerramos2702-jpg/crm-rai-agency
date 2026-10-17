/** Validación pura de los ajustes del motor. */

const EMAIL_RE = /^[^\s@,;<>()]+@[^\s@,;<>()]+\.[^\s@,;<>()]{2,}$/;
export const MAX_EMAIL_LENGTH = 254;

export type EmailCheck = { ok: true; value: string | null } | { ok: false; error: string };

/** Vacío = quitar el correo (válido). Devuelve el valor ya recortado y en minúsculas. */
export function checkNotifyEmail(input: string): EmailCheck {
  const value = input.trim().toLowerCase();
  if (!value) return { ok: true, value: null };
  if (value.length > MAX_EMAIL_LENGTH) return { ok: false, error: 'El correo es demasiado largo.' };
  if (/[,;\s]/.test(value)) return { ok: false, error: 'Escribe una sola dirección de correo.' };
  if (!EMAIL_RE.test(value)) return { ok: false, error: 'Ese correo no parece válido (ejemplo: gerencia@tuempresa.com).' };
  return { ok: true, value };
}
