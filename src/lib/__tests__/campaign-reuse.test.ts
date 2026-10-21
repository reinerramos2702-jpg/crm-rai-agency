import { describe, expect, it } from 'vitest';
import { MAX_NAME_LENGTH, copyName, reusePatch, toPastCampaigns, type PastCampaign } from '../campaign-reuse';

const fallback = { provider: 'deepseek', modelId: 'deepseek-chat' };
const base: PastCampaign = {
  id: 'c1', name: 'Sprint Mayo', pipelineType: 'carousel', provider: 'anthropic',
  modelId: 'claude-opus-4-7', updatedAt: '2026-10-01T00:00:00Z', messages: 6, status: 'ready',
};

describe('reutilizar campaña', () => {
  it('reduce la respuesta de /api/campaigns y descarta registros inválidos', () => {
    const list = toPastCampaigns({
      campaigns: [
        { id: 'a', name: 'Una', pipelineType: 'ugc', llmProvider: 'google', llmModel: 'gemini-2.5-pro', chatHistory: [1, 2, 3], status: 'done', updatedAt: 'x' },
        { id: 'b' },
        null,
        { id: 'c', name: 'Sin datos' },
      ],
    });
    expect(list.map((c) => c.id)).toEqual(['a', 'c']);
    expect(list[0].messages).toBe(3);
    expect(list[1]).toMatchObject({ pipelineType: 'ugc', provider: null, messages: 0, status: 'planning' });
    expect(toPastCampaigns(undefined)).toEqual([]);
    expect(toPastCampaigns({ campaigns: 'x' })).toEqual([]);
  });

  it('numera las copias', () => {
    expect(copyName('Mayo')).toBe('Mayo (copia)');
    expect(copyName('Mayo (copia)')).toBe('Mayo (copia 2)');
    expect(copyName('Mayo (copia 2)')).toBe('Mayo (copia 3)');
    expect(copyName('   ')).toBe('Campaña (copia)');
  });

  it('acota nombres largos conservando el sufijo', () => {
    const out = copyName('x'.repeat(200));
    expect(out.length).toBeLessThanOrEqual(MAX_NAME_LENGTH);
    expect(out.endsWith(' (copia)')).toBe(true);
  });

  it('conserva pipeline y modelo válidos', () => {
    expect(reusePatch(base, fallback)).toEqual({
      name: 'Sprint Mayo (copia)', pipelineType: 'carousel', provider: 'anthropic', modelId: 'claude-opus-4-7',
    });
  });

  it('usa los valores por defecto si el modelo ya no existe o falta', () => {
    expect(reusePatch({ ...base, modelId: 'viejo' }, fallback)).toMatchObject(fallback);
    expect(reusePatch({ ...base, provider: null, modelId: null, pipelineType: 'otro' }, fallback)).toMatchObject({
      ...fallback, pipelineType: 'ugc',
    });
  });
});
