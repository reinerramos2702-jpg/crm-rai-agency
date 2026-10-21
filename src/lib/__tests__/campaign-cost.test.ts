import { describe, expect, it } from 'vitest';
import { PROVIDERS } from '../campaign-new-options';
import { BATCH_SIZES, estimateCampaignCost, formatUsd } from '../campaign-cost';

const ids = (r: ReturnType<typeof estimateCampaignCost>) => r.lines.map((l) => l.id);

describe('estimador de costo en vivo', () => {
  it('los pipelines con video suman voz y video; los de imagen no', () => {
    const base = { modelId: 'deepseek-chat', imageProvider: 'gemini', pieces: 7 };
    expect(ids(estimateCampaignCost({ ...base, pipelineType: 'ugc' }))).toEqual(['plan', 'copy', 'image', 'voice', 'video']);
    expect(ids(estimateCampaignCost({ ...base, pipelineType: 'carousel' }))).toEqual(['plan', 'copy', 'image']);
  });

  it('coincide con el cálculo del servidor para imágenes, voz y video', () => {
    const r = estimateCampaignCost({ pipelineType: 'ugc', modelId: 'deepseek-chat', imageProvider: 'gemini', pieces: 7 });
    const line = (id: string) => r.lines.find((l) => l.id === id)!.usd;
    expect(line('image')).toBeCloseTo(7 * 5 * 0.03, 6);
    expect(line('video')).toBeCloseTo(7 * 30 * 0.4, 6);
    expect(line('voice')).toBeCloseTo(7 * 600 * 0.00018, 6);
    expect(r.totalUsd).toBeCloseTo(r.lines.reduce((s, l) => s + l.usd, 0), 10);
    expect(r.perPieceUsd).toBeCloseTo(r.totalUsd / 7, 10);
  });

  it('el modelo cambia el costo de planificación y DeepSeek es el más barato', () => {
    const plan = (modelId: string) =>
      estimateCampaignCost({ pipelineType: 'carousel', modelId, imageProvider: 'gemini', pieces: 7 }).lines[0].usd;
    expect(plan('deepseek-chat')).toBeLessThan(plan('claude-sonnet-4-5'));
    expect(plan('claude-sonnet-4-5')).toBeLessThan(plan('claude-opus-4-7'));
    for (const p of PROVIDERS) for (const m of p.models) expect(plan(m), m).toBeGreaterThan(0);
  });

  it('escala con el tamaño del lote y usa un modelo desconocido sin fallar', () => {
    const at = (pieces: number) =>
      estimateCampaignCost({ pipelineType: 'static_ads', modelId: 'raro', imageProvider: 'openai', pieces }).totalUsd;
    expect(at(30)).toBeGreaterThan(at(7));
    expect(BATCH_SIZES).toEqual([7, 15, 30]);
    expect(estimateCampaignCost({ pipelineType: 'x', modelId: 'raro', imageProvider: 'z', pieces: 0 }).perPieceUsd).toBeGreaterThan(0);
  });

  it('formatea importes pequeños con más decimales', () => {
    expect(formatUsd(0.0071)).toBe('$0.007');
    expect(formatUsd(12.345)).toBe('$12.35');
    expect(formatUsd(0)).toBe('$0.00');
  });
});
