import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import type { Role } from '@/lib/roles-shared';

const state = vi.hoisted(() => ({ role: 'viewer' as Role }));
const dbCall = vi.hoisted(() => vi.fn());

vi.mock('@/lib/roles', async () => {
  const actual = await vi.importActual<typeof import('@/lib/roles')>('@/lib/roles');
  return {
    ...actual,
    requireRole: vi.fn(async (_req: NextRequest, allowed: Role[]) => {
      if (!allowed.includes(state.role)) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
      return {
        auth: { userId: 'user-1', email: 'user@rai.local' },
        workspace: { id: 'ws-1', ownerId: 'owner-1', name: 'Workspace 1' },
        role: state.role,
      };
    }),
  };
});

vi.mock('@/lib/db', () => ({
  prisma: {
    campaign: { findMany: dbCall, create: dbCall },
    contentGrid: { findMany: dbCall },
  },
}));
vi.mock('@/lib/llm-providers', () => ({ getLLM: vi.fn(), resolveApiKey: vi.fn() }));
vi.mock('@/lib/redis', () => ({
  getPipelineQueue: vi.fn(),
  createRedisSubscriber: vi.fn(),
  eventChannel: vi.fn(),
}));
vi.mock('@/lib/r2', () => ({ ingestUrl: vi.fn() }));
vi.mock('@/lib/n8n-dispatcher', () => ({ dispatchToN8n: vi.fn() }));
vi.mock('@/agents/visual-agent', () => ({ generateImage: vi.fn() }));
vi.mock('@/agents/vision-analyzer', () => ({ analyzeAssets: vi.fn() }));
vi.mock('@/agents/competitor-researcher', () => ({ runCompetitorResearch: vi.fn() }));
vi.mock('@/lib/docx-extract', () => ({ extractTextFromDocx: vi.fn() }));
vi.mock('bullmq', () => ({ Queue: vi.fn() }));
vi.mock('ai', () => ({
  convertToCoreMessages: vi.fn(),
  generateText: vi.fn(),
  streamText: vi.fn(),
}));

import * as campaigns from '@/app/api/campaigns/route';
import * as campaign from '@/app/api/campaigns/[id]/route';
import * as chat from '@/app/api/chat/route';
import * as finalize from '@/app/api/finalize/route';
import * as processCampaign from '@/app/api/process/route';
import * as retry from '@/app/api/retry/[taskId]/route';
import * as webhookDispatch from '@/app/api/webhook/dispatch/route';
import * as competitors from '@/app/api/research/competitors/route';
import * as adsLibrary from '@/app/api/research/ads-library/route';
import * as inventory from '@/app/api/inventory/route';
import * as agentTest from '@/app/api/ai-agents/[id]/test/route';
import * as contentGrids from '@/app/api/content-grids/route';
import * as contentGrid from '@/app/api/content-grids/[id]/route';
import * as contentGridChat from '@/app/api/content-grids/[id]/chat/route';
import * as generateImage from '@/app/api/content-grids/[id]/generate-image/route';
import * as pipelineChat from '@/app/api/pipeline/chat/route';
import * as brandDoc from '@/app/api/workspace/brand-doc/route';

const request = (path: string, method = 'POST') =>
  new NextRequest(`http://localhost${path}`, { method });
const idParams = { params: Promise.resolve({ id: 'record-1' }) };
const campaignParams = { params: { id: 'campaign-1' } };
const taskParams = { params: { taskId: 'task-1' } };

async function expectDenied(run: () => Promise<Response>) {
  const response = await run();
  expect(response.status).toBe(403);
  expect(dbCall).not.toHaveBeenCalled();
}

describe('content and campaign handler guards', () => {
  beforeEach(() => {
    state.role = 'viewer';
    dbCall.mockReset();
  });

  it.each([
    ['POST campaigns', () => campaigns.POST(request('/api/campaigns'))],
    ['DELETE campaign', () => campaign.DELETE(request('/api/campaigns/campaign-1', 'DELETE'), campaignParams)],
    ['POST chat', () => chat.POST(request('/api/chat'))],
    ['POST finalize', () => finalize.POST(request('/api/finalize'))],
    ['POST process', () => processCampaign.POST(request('/api/process'))],
    ['POST retry', () => retry.POST(request('/api/retry/task-1'), taskParams)],
    ['POST webhook dispatch', () => webhookDispatch.POST(request('/api/webhook/dispatch'))],
    ['POST competitor research', () => competitors.POST(request('/api/research/competitors'))],
    ['POST ads library', () => adsLibrary.POST(request('/api/research/ads-library'))],
    ['GET inventory analysis', () => inventory.GET(request('/api/inventory', 'GET'))],
    ['POST agent test', () => agentTest.POST(request('/api/ai-agents/agent-1/test'), idParams)],
    ['POST pipeline chat', () => pipelineChat.POST(request('/api/pipeline/chat'))],
    ['POST content grids', () => contentGrids.POST(request('/api/content-grids'))],
    ['POST content grid chat', () => contentGridChat.POST(request('/api/content-grids/grid-1/chat'), idParams)],
    ['POST generate image', () => generateImage.POST(request('/api/content-grids/grid-1/generate-image'), idParams)],
    ['POST brand doc', () => brandDoc.POST(request('/api/workspace/brand-doc'))],
    ['DELETE brand doc', () => brandDoc.DELETE(request('/api/workspace/brand-doc', 'DELETE'))],
  ])('denies viewer before side effects: %s', async (_name, run) => {
    await expectDenied(run);
  });

  it.each([
    ['POST content grids', () => contentGrids.POST(request('/api/content-grids'))],
    ['PATCH content grid', () => contentGrid.PATCH(request('/api/content-grids/grid-1', 'PATCH'), idParams)],
    ['DELETE content grid', () => contentGrid.DELETE(request('/api/content-grids/grid-1', 'DELETE'), idParams)],
    ['POST content grid chat', () => contentGridChat.POST(request('/api/content-grids/grid-1/chat'), idParams)],
    ['POST generate image', () => generateImage.POST(request('/api/content-grids/grid-1/generate-image'), idParams)],
    ['POST brand doc', () => brandDoc.POST(request('/api/workspace/brand-doc'))],
    ['DELETE brand doc', () => brandDoc.DELETE(request('/api/workspace/brand-doc', 'DELETE'))],
  ])('keeps staff read-only in content generator: %s', async (_name, run) => {
    state.role = 'staff';
    await expectDenied(run);
  });

  it('allows staff to list content grids', async () => {
    state.role = 'staff';
    dbCall.mockResolvedValue([]);

    const response = await contentGrids.GET(request('/api/content-grids', 'GET'));

    expect(response.status).toBe(200);
    expect(dbCall).toHaveBeenCalledWith(
      expect.objectContaining({ where: { workspaceId: 'ws-1' } })
    );
  });

  it('allows an agente to create a campaign in the active workspace', async () => {
    state.role = 'agente';
    dbCall.mockResolvedValue({ id: 'campaign-1' });
    const req = new NextRequest('http://localhost/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Campaign', pipelineType: 'ugc' }),
    });

    const response = await campaigns.POST(req);

    expect(response.status).toBe(200);
    expect(dbCall).toHaveBeenCalledWith({
      data: expect.objectContaining({ workspaceId: 'ws-1', userId: 'user-1' }),
    });
  });
});
