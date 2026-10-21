-- Etapa 3 — Auth real (Prioridad 0 del panel): hash de contraseña para login email+password.
-- Nullable a propósito: los usuarios existentes (creados vía SSO JWT o DEV_BYPASS_AUTH)
-- no tienen password hasta aceptar una invitación de equipo o ser bootstrap del super
-- admin (SUPER_ADMIN_EMAILS). No se ejecuta contra la DB de .env.local — se aplica con
-- `prisma migrate deploy` aprobado por Reiner, junto con el resto de la Fase 0.

BEGIN;

ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;

COMMIT;