import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findFirst, decrypt } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  decrypt: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: { apiKey: { findFirst } },
}));

vi.mock('@/lib/crypto', () => ({ decrypt }));

vi.mock('@ai-sdk/openai', () => ({ createOpenAI: vi.fn() }));
vi.mock('@ai-sdk/anthropic', () => ({ createAnthropic: vi.fn() }));
vi.mock('@ai-sdk/google', () => ({ createGoogleGenerativeAI: vi.fn() }));
vi.mock('@ai-sdk/deepseek', () => ({ createDeepSeek: vi.fn() }));

import { resolveApiKey } from '@/lib/llm-providers';

describe('resolveApiKey workspace scope', () => {
  beforeEach(() => {
    findFirst.mockReset();
    decrypt.mockReset();
  });

  it('consulta la key validada exclusivamente por workspace y provider', async () => {
    findFirst.mockResolvedValue({
      ciphertext: 'cipher',
      iv: 'iv',
      authTag: 'tag',
    });
    decrypt.mockReturnValue('workspace-secret');

    await expect(resolveApiKey('ws-2', 'anthropic')).resolves.toBe('workspace-secret');
    expect(findFirst).toHaveBeenCalledWith({
      where: { workspaceId: 'ws-2', provider: 'anthropic', validated: true },
      orderBy: { createdAt: 'desc' },
    });
    expect(findFirst.mock.calls[0][0].where).not.toHaveProperty('userId');
  });

  it('no reutiliza una key almacenada en otro workspace', async () => {
    const original = process.env.DEEPSEEK_API_KEY;
    process.env.DEEPSEEK_API_KEY = 'operator-fallback';
    const storedKeys = [
      {
        workspaceId: 'ws-other',
        provider: 'deepseek',
        validated: true,
        ciphertext: 'other-cipher',
        iv: 'other-iv',
        authTag: 'other-tag',
      },
    ];
    findFirst.mockImplementation(({ where }) =>
      storedKeys.find(
        (key) =>
          key.workspaceId === where.workspaceId &&
          key.provider === where.provider &&
          key.validated === where.validated
      ) ?? null
    );

    await expect(resolveApiKey('ws-without-key', 'deepseek')).resolves.toBe('operator-fallback');
    expect(findFirst).toHaveBeenCalledWith({
      where: { workspaceId: 'ws-without-key', provider: 'deepseek', validated: true },
      orderBy: { createdAt: 'desc' },
    });
    expect(decrypt).not.toHaveBeenCalled();

    if (original === undefined) delete process.env.DEEPSEEK_API_KEY;
    else process.env.DEEPSEEK_API_KEY = original;
  });
});
