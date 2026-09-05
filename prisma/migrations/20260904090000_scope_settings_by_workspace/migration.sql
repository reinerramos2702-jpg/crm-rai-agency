-- Bloque 1 (v3.0-master-prompt) — cierra la fuga cross-tenant más peligrosa
-- señalada por la auditoría Bloque 0.5: "Settings" era un singleton global
-- (id @default("global")) compartido por TODOS los tenants — SLA, webhook de
-- n8n, IG business ID legacy y el kill-switch de automatizaciones se leían y
-- se escribían igual para cualquier workspace.
--
-- Aditiva y no destructiva: agrega workspaceId, no borra la fila legacy
-- id='global' (queda huérfana, workspaceId NULL — ya no la lee ni la escribe
-- código nuevo). Rollback: ver comentario al final.

ALTER TABLE "Settings" ADD COLUMN "workspaceId" TEXT;

CREATE UNIQUE INDEX "Settings_workspaceId_key" ON "Settings"("workspaceId");

ALTER TABLE "Settings" ADD CONSTRAINT "Settings_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Rollback manual si hace falta:
--   ALTER TABLE "Settings" DROP CONSTRAINT "Settings_workspaceId_fkey";
--   DROP INDEX "Settings_workspaceId_key";
--   ALTER TABLE "Settings" DROP COLUMN "workspaceId";
