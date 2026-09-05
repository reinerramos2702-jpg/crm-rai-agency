-- Bloque 1 (v3.0-master-prompt) — Multi-tenant: ApiKey por workspace + Meta híbrido
-- Migración escrita a mano (regla no negociable: nunca `db push` directo sobre datos existentes).
-- Rollback: ver comentario al final. No borra ni renombra nada existente — solo aditiva.

-- 1) ApiKey: agrega workspaceId (nullable, sin backfill automático — las keys
--    existentes quedan sin workspace hasta que el usuario las re-guarde o un
--    script de backfill manual las asigne al workspace por defecto del owner).
ALTER TABLE "ApiKey" ADD COLUMN "workspaceId" TEXT;
CREATE INDEX "ApiKey_workspaceId_idx" ON "ApiKey"("workspaceId");
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 2) WorkspaceMetaConnection: reemplaza el patrón anterior (Settings.igBusinessId
--    global + ApiKey de Instagram por usuario) por conexión Meta propia de cada
--    workspace, con soporte shared_app / own_app.
CREATE TABLE "WorkspaceMetaConnection" (
  "id"                  TEXT NOT NULL,
  "workspaceId"         TEXT NOT NULL,
  "metaMode"            TEXT NOT NULL DEFAULT 'shared_app',
  "ownAppId"            TEXT,
  "ownAppSecretCipher"  TEXT,
  "ownAppSecretIv"      TEXT,
  "ownAppSecretTag"     TEXT,
  "igBusinessId"        TEXT,
  "pageId"              TEXT,
  "accessTokenCipher"   TEXT,
  "accessTokenIv"       TEXT,
  "accessTokenTag"      TEXT,
  "tokenExpiresAt"      TIMESTAMP(3),
  "connectedAt"         TIMESTAMP(3),
  "connectedByUserId"   TEXT,
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkspaceMetaConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkspaceMetaConnection_workspaceId_key" ON "WorkspaceMetaConnection"("workspaceId");

ALTER TABLE "WorkspaceMetaConnection" ADD CONSTRAINT "WorkspaceMetaConnection_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Rollback manual si hace falta:
--   DROP TABLE "WorkspaceMetaConnection";
--   ALTER TABLE "ApiKey" DROP CONSTRAINT "ApiKey_workspaceId_fkey";
--   DROP INDEX "ApiKey_workspaceId_idx";
--   ALTER TABLE "ApiKey" DROP COLUMN "workspaceId";
-- Ambos cambios son aditivos (columnas/tablas nuevas, nullable) — no hay pérdida
-- de datos existentes ni de compatibilidad hacia atrás con código que no las use.
