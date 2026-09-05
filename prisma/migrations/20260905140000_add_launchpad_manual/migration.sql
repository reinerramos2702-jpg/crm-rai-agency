-- Migracion: Workspace.launchpadManual (fix Launchpad fijo en 0%)
--
-- El progreso de /launchpad vivia 100% en localStorage del navegador, nunca
-- se persistia por workspace. Este campo guarda solo los overrides manuales
-- de los items del checklist que NO tienen una condicion verificable en la
-- base de datos (ver src/app/api/launchpad/route.ts para el detalle de que
-- items se calculan en vivo vs. cuales dependen de este campo).
--
-- Aditiva y no destructiva: columna nueva con default '{}'::jsonb.
--
-- Aplicar con:  npx prisma migrate deploy   (NUNCA `migrate dev` contra prod)

ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "launchpadManual" JSONB NOT NULL DEFAULT '{}';
