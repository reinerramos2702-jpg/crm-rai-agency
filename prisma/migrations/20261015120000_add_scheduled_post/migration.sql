-- Publicación programada en Instagram (Corte B). Aditiva: tabla nueva, sin tocar datos existentes.
-- Rollback: DROP TABLE "ScheduledPost";
CREATE TABLE "ScheduledPost" (
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

CREATE UNIQUE INDEX "ScheduledPost_workspaceId_campaignRef_dayNumber_key" ON "ScheduledPost"("workspaceId", "campaignRef", "dayNumber");
CREATE INDEX "ScheduledPost_status_scheduledAt_idx" ON "ScheduledPost"("status", "scheduledAt");
CREATE INDEX "ScheduledPost_workspaceId_scheduledAt_idx" ON "ScheduledPost"("workspaceId", "scheduledAt");

ALTER TABLE "ScheduledPost" ADD CONSTRAINT "ScheduledPost_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
