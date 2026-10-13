-- Configuración del planificador de contenido (/automatizacion) por empresa.
-- Aditiva y reversible: columna nullable, sin backfill.
-- Rollback: ALTER TABLE "Settings" DROP COLUMN "contentPlannerConfig";
ALTER TABLE "Settings" ADD COLUMN "contentPlannerConfig" JSONB;
