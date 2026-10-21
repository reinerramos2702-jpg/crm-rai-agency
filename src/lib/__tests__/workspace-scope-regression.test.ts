import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const scopedRoutes = [
  'src/app/api/campaigns/route.ts',
  'src/app/api/campaigns/[id]/route.ts',
  'src/app/api/chat/route.ts',
  'src/app/api/content-grids/route.ts',
  'src/app/api/content-grids/[id]/route.ts',
  'src/app/api/content-grids/[id]/chat/route.ts',
  'src/app/api/content-grids/[id]/generate-image/route.ts',
  'src/app/api/cost-estimate/route.ts',
  'src/app/api/events/[campaignId]/route.ts',
  'src/app/api/executions/[id]/route.ts',
  'src/app/api/finalize/route.ts',
  'src/app/api/keys/route.ts',
  'src/app/api/process/route.ts',
  'src/app/api/research/competitors/route.ts',
  'src/app/api/retry/[taskId]/route.ts',
  'src/app/api/webhook/dispatch/route.ts',
  'src/app/api/inventory/route.ts',
  'src/app/api/research/ads-library/route.ts',
  'src/app/api/ai-agents/[id]/test/route.ts',
];

function source(path: string) {
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- The test only passes repository paths from the controlled literal lists below.
  return readFileSync(join(process.cwd(), path), 'utf8');
}

describe('workspace scope structural regression checks', () => {
  it.each(scopedRoutes)('%s conserva el patron estructural de RoleContext', (path) => {
    const code = source(path);

    expect(code).toContain('requireRole');
    expect(code).toContain('isRoleContext');
    expect(code).toContain('ctx.workspace.id');
    expect(code).not.toMatch(/where:\s*\{[^\n}]*userId:\s*(?:auth|ctx\.auth)\.userId/);
    expect(code).not.toContain("from '@/lib/auth'");
  });

  it('propaga workspaceId por agentes y worker sin usar userId para credenciales', () => {
    const paths = [
      'src/lib/llm-providers.ts',
      'src/agents/copy-agent.ts',
      'src/agents/visual-agent.ts',
      'src/agents/audio-agent.ts',
      'src/agents/video-agent.ts',
      'src/agents/music-agent.ts',
      'src/agents/orchestrator.ts',
      'src/workers/pipeline-worker.ts',
    ];

    for (const path of paths) {
      const code = source(path);
      expect(code, path).toContain('workspaceId');
      expect(code, path).not.toMatch(/resolveApiKey\([^,]*userId/);
      expect(code, path).not.toMatch(/getLLM\([^,]*userId/);
    }
  });

  it('mantiene la migracion ApiKey no destructiva y exige backfill explicito', () => {
    const migration = source(
      'prisma/migrations/20260919120000_require_apikey_workspace_scope/migration.sql'
    );

    expect(migration).toContain('WHERE "workspaceId" IS NULL');
    expect(migration).toContain('RAISE EXCEPTION');
    expect(migration).toContain('explicit manual backfill');
    expect(migration).not.toMatch(/\bINSERT\s+INTO\b/i);
    expect(migration).not.toMatch(/\bDELETE\s+FROM\b/i);
    expect(migration).not.toContain('WorkspaceMember');
    expect(migration).not.toContain('ROW_NUMBER');
  });
});
