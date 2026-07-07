import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * Crea las tablas del módulo Instagram directamente en la DB (idempotente).
 * Existe porque el usuario no tiene PC para correr `prisma migrate deploy`:
 * basta con abrir esta URL una vez después del deploy.
 *
 *   GET/POST https://<app>.vercel.app/api/admin/setup-instagram?secret=<CRON_SECRET>
 *
 * El SQL es espejo de prisma/migrations/20260707000000_add_instagram_module/migration.sql
 * (CREATE TABLE IF NOT EXISTS — correrlo dos veces no rompe nada).
 */

const STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS "SocialAccount" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'instagram',
    "igUserId" TEXT,
    "igUsername" TEXT,
    "pageId" TEXT,
    "tokenCiphertext" TEXT,
    "tokenIv" TEXT,
    "tokenAuthTag" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'disconnected',
    "lastCheckedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SocialAccount_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "SocialPost" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "accountId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'image',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "caption" TEXT NOT NULL DEFAULT '',
    "mediaUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "coverUrl" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "igMediaId" TEXT,
    "permalink" TEXT,
    "errorMessage" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "keyword" TEXT,
    "pillar" TEXT,
    "hook" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SocialPost_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "KeywordRule" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "accountId" TEXT,
    "keyword" TEXT NOT NULL,
    "matchType" TEXT NOT NULL DEFAULT 'contains',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "replyToComment" BOOLEAN NOT NULL DEFAULT true,
    "commentReplies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dmEnabled" BOOLEAN NOT NULL DEFAULT true,
    "dmMessage" TEXT NOT NULL DEFAULT '',
    "dmLink" TEXT,
    "mediaScope" TEXT NOT NULL DEFAULT 'all',
    "mediaIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "triggerCount" INTEGER NOT NULL DEFAULT 0,
    "lastTriggeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "KeywordRule_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "SocialActionLog" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "ruleId" TEXT,
    "postId" TEXT,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ok',
    "igCommentId" TEXT,
    "igUserId" TEXT,
    "igUsername" TEXT,
    "detail" TEXT NOT NULL DEFAULT '',
    "meta" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SocialActionLog_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "SocialAccount_workspaceId_platform_key" ON "SocialAccount"("workspaceId", "platform")`,
  `CREATE INDEX IF NOT EXISTS "SocialAccount_workspaceId_idx" ON "SocialAccount"("workspaceId")`,
  `CREATE INDEX IF NOT EXISTS "SocialPost_workspaceId_status_scheduledAt_idx" ON "SocialPost"("workspaceId", "status", "scheduledAt")`,
  `CREATE INDEX IF NOT EXISTS "SocialPost_workspaceId_createdAt_idx" ON "SocialPost"("workspaceId", "createdAt")`,
  `CREATE INDEX IF NOT EXISTS "KeywordRule_workspaceId_enabled_idx" ON "KeywordRule"("workspaceId", "enabled")`,
  `CREATE INDEX IF NOT EXISTS "SocialActionLog_workspaceId_createdAt_idx" ON "SocialActionLog"("workspaceId", "createdAt")`,
  `CREATE INDEX IF NOT EXISTS "SocialActionLog_igCommentId_idx" ON "SocialActionLog"("igCommentId")`,
];

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const url = new URL(req.url);
  if (url.searchParams.get('secret') === secret) return true;
  const auth = req.headers.get('authorization') || '';
  return auth === `Bearer ${secret}`;
}

async function run(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const applied: string[] = [];
  try {
    for (const sql of STATEMENTS) {
      await prisma.$executeRawUnsafe(sql);
      const name = sql.match(/"(\w+)"/)?.[1] || 'stmt';
      applied.push(name);
    }
    return NextResponse.json({
      ok: true,
      message: 'Tablas del módulo Instagram creadas/verificadas',
      applied,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, applied, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return run(req);
}

export async function POST(req: NextRequest) {
  return run(req);
}
