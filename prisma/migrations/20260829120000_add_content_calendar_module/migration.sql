-- Migracion: modulo Calendario de Contenido (BLOQUE 2 - v2.0)
--
-- IDEMPOTENTE: se puede correr mas de una vez sin romper nada
-- (CREATE/ADD COLUMN ... IF NOT EXISTS + FKs envueltas en DO/EXCEPTION).
--
-- Cambios sobre tablas existentes: SOLO agrega la columna opcional
-- "Settings"."fbPageId" (nullable, sin default). No altera ni borra nada mas.
-- El resto son tablas nuevas, asi que es segura de aplicar sobre produccion.
--
-- Aplicar con:  npx prisma migrate deploy   (NUNCA `migrate dev` contra prod)

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "fbPageId" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "ContentCalendarSettings" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Caracas',
    "maxPostsPerDay" INTEGER NOT NULL DEFAULT 3,
    "requireApproval" BOOLEAN NOT NULL DEFAULT false,
    "defaultPostTime" TEXT NOT NULL DEFAULT '18:00',
    "brandName" TEXT,
    "brandHandle" TEXT,
    "brandAvatarUrl" TEXT,
    "brandPrimary" TEXT,
    "brandAccent" TEXT,
    "brandBackground" TEXT,
    "onboardingCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentCalendarSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ContentPost" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT,
    "caption" TEXT,
    "inBank" BOOLEAN NOT NULL DEFAULT false,
    "scheduledFor" TIMESTAMP(3),
    "sortIndex" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "networks" TEXT[] DEFAULT ARRAY['instagram']::TEXT[],
    "mediaType" TEXT NOT NULL DEFAULT 'image',
    "submittedById" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedById" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionNote" TEXT,
    "publishAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "nextRetryAt" TIMESTAMP(3),
    "failureNotified" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "publishResult" JSONB,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ContentPostMedia" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbUrl" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'image',
    "mimeType" TEXT,
    "fileName" TEXT,
    "sizeBytes" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "durationSec" DOUBLE PRECISION,
    "sortIndex" INTEGER NOT NULL DEFAULT 0,
    "clipFromSec" DOUBLE PRECISION,
    "clipToSec" DOUBLE PRECISION,
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentPostMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ContentBlackoutDate" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "reason" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentBlackoutDate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ContentPostEvent" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "postId" TEXT,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "detail" TEXT,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentPostEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ContentCalendarSettings_workspaceId_key" ON "ContentCalendarSettings"("workspaceId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ContentPost_workspaceId_scheduledFor_idx" ON "ContentPost"("workspaceId", "scheduledFor");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ContentPost_workspaceId_status_idx" ON "ContentPost"("workspaceId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ContentPost_workspaceId_inBank_idx" ON "ContentPost"("workspaceId", "inBank");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ContentPost_status_nextRetryAt_idx" ON "ContentPost"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ContentPostMedia_postId_sortIndex_idx" ON "ContentPostMedia"("postId", "sortIndex");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ContentBlackoutDate_workspaceId_idx" ON "ContentBlackoutDate"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ContentBlackoutDate_workspaceId_day_key" ON "ContentBlackoutDate"("workspaceId", "day");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ContentPostEvent_workspaceId_createdAt_idx" ON "ContentPostEvent"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ContentPostEvent_postId_idx" ON "ContentPostEvent"("postId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ContentCalendarSettings" ADD CONSTRAINT "ContentCalendarSettings_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ContentPost" ADD CONSTRAINT "ContentPost_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ContentPostMedia" ADD CONSTRAINT "ContentPostMedia_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ContentPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ContentBlackoutDate" ADD CONSTRAINT "ContentBlackoutDate_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ContentPostEvent" ADD CONSTRAINT "ContentPostEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ContentPostEvent" ADD CONSTRAINT "ContentPostEvent_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ContentPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

