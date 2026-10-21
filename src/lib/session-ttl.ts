/**
 * Duración de la sesión del CRM según la opción "Mantener sesión iniciada" del login.
 * Módulo sin dependencias para poder usarlo en la ruta de login, en tests y (si hace
 * falta) en el middleware sin arrastrar Prisma.
 *
 * - remember = true  → cookie persistente de 30 días + JWT de 30 días.
 * - remember = false → cookie de sesión (el navegador la borra al cerrarse) + JWT de 12 h.
 * Nota: el JWT es sin estado (no hay revocación en servidor); por eso el valor largo
 * es opt-in explícito y se documenta como deuda en docs/ESTADO-SESION.md.
 */
export const SESSION_TTL_REMEMBER_SEC = 60 * 60 * 24 * 30; // 30 días
export const SESSION_TTL_SHORT_SEC = 60 * 60 * 12; // 12 horas

export function sessionTtlSec(remember: boolean): number {
  return remember ? SESSION_TTL_REMEMBER_SEC : SESSION_TTL_SHORT_SEC;
}
