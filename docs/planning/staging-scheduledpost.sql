-- SOLO STAGING (schema "staging"). Pegar en Supabase SQL editor. Producción NO se toca.
-- Publicación programada en Instagram (Corte B). Aditiva: tabla nueva, sin tocar datos existentes.
-- Rollback: DROP TABLE staging."ScheduledPost";
CREATE TABLE staging."ScheduledPost" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "campaignRef" TEXT,
    "dayNumber" INTEGER,
    "caption" TEXT NOT NULL,
    "mediaUrls" TEXT[],
    "mediaType" TEXT NOT NULL DEFAULT 'image',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "igContainerId" TEXT,
    "igMediaId" TEXT,
    "permalink" TEXT,
    "simulated" BOOLEAN NOT NULL DEFAULT false,
    "lockedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledPost_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ScheduledPost_workspaceId_campaignRef_dayNumber_key" ON staging."ScheduledPost"("workspaceId", "campaignRef", "dayNumber");
CREATE INDEX "ScheduledPost_status_scheduledAt_idx" ON staging."ScheduledPost"("status", "scheduledAt");
CREATE INDEX "ScheduledPost_workspaceId_scheduledAt_idx" ON staging."ScheduledPost"("workspaceId", "scheduledAt");

ALTER TABLE staging."ScheduledPost" ADD CONSTRAINT "ScheduledPost_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES staging."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
