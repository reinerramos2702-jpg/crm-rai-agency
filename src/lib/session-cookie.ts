/**
 * Nombre de la cookie httpOnly de sesión (Etapa 3 — Auth real).
 * Vive en un módulo sin dependencias para que el middleware (edge runtime) lo
 * use sin arrastrar `prisma` vía `auth.ts`.
 */
export const SESSION_COOKIE = 'rai_session';
