-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "brandDocName" TEXT,
ADD COLUMN     "brandDocText" TEXT,
ADD COLUMN     "brandDocUpdatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ContentGrid" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Nueva grilla',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "activeThemeIndex" INTEGER NOT NULL DEFAULT 0,
    "themesTotal" INTEGER NOT NULL DEFAULT 7,
    "imageProvider" TEXT NOT NULL DEFAULT 'gemini',
    "llmProvider" TEXT,
    "llmModel" TEXT,
    "chatHistory" JSONB NOT NULL DEFAULT '[]',
    "themes" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentGrid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentGridAsset" (
    "id" TEXT NOT NULL,
    "gridId" TEXT NOT NULL,
    "themeIndex" INTEGER NOT NULL,
    "slideNumber" INTEGER NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'image',
    "prompt" TEXT,
    "r2Key" TEXT NOT NULL,
    "publicUrl" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentGridAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentGrid_workspaceId_idx" ON "ContentGrid"("workspaceId");

-- CreateIndex
CREATE INDEX "ContentGrid_userId_idx" ON "ContentGrid"("userId");

-- CreateIndex
CREATE INDEX "ContentGridAsset_gridId_idx" ON "ContentGridAsset"("gridId");

-- CreateIndex
CREATE INDEX "ContentGridAsset_gridId_themeIndex_slideNumber_idx" ON "ContentGridAsset"("gridId", "themeIndex", "slideNumber");

-- AddForeignKey
ALTER TABLE "ContentGrid" ADD CONSTRAINT "ContentGrid_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentGridAsset" ADD CONSTRAINT "ContentGridAsset_gridId_fkey" FOREIGN KEY ("gridId") REFERENCES "ContentGrid"("id") ON DELETE CASCADE ON UPDATE CASCADE;
