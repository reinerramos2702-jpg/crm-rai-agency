-- ApiKey pasa de pertenecer al usuario a pertenecer al workspace.
-- Esta migracion es deliberadamente no destructiva: no infiere el tenant de una
-- credencial, no replica filas y no elimina datos. Las filas legacy deben recibir
-- un workspaceId mediante un backfill manual, revisado y ejecutado por separado.

BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "ApiKey" WHERE "workspaceId" IS NULL) THEN
    RAISE EXCEPTION USING
      MESSAGE = 'ApiKey workspace migration aborted: rows with workspaceId NULL still exist',
      HINT = 'Assign each legacy ApiKey to its verified workspace with an explicit manual backfill before running migrate deploy. This migration will not infer, copy, or delete credentials.';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "ApiKey"
    GROUP BY "workspaceId", "provider", "label"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'ApiKey workspace migration aborted: duplicate workspace/provider/label rows';
  END IF;
END $$;

DROP INDEX "ApiKey_userId_provider_label_key";
ALTER TABLE "ApiKey" DROP CONSTRAINT "ApiKey_workspaceId_fkey";
ALTER TABLE "ApiKey" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "ApiKey_workspaceId_provider_label_key"
  ON "ApiKey"("workspaceId", "provider", "label");

-- PostgreSQL considera NULL distintos en un indice unico normal. Este indice
-- adicional garantiza una sola key sin label por provider y workspace.
CREATE UNIQUE INDEX "ApiKey_workspaceId_provider_unlabeled_key"
  ON "ApiKey"("workspaceId", "provider") WHERE "label" IS NULL;

COMMIT;
