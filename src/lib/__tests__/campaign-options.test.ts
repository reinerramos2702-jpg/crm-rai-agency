import { describe, expect, it } from 'vitest';
import { COST_TIER_LABELS, MODEL_INFO, PROVIDERS, SPEED_LABELS, modelInfo, modelsOf, providerLabel } from '../campaign-new-options';

describe('opciones de Nueva Campaña', () => {
  it('cada modelo ofrecido tiene ficha de costo y velocidad', () => {
    for (const p of PROVIDERS) {
      for (const m of p.models) {
        expect(MODEL_INFO[m], m).toBeDefined();
        expect(COST_TIER_LABELS[MODEL_INFO[m].cost]).toBeTruthy();
        expect(SPEED_LABELS[MODEL_INFO[m].speed]).toBeTruthy();
      }
    }
    expect(modelInfo('desconocido').blurb).toBeTruthy();
  });

  it('DeepSeek es económico y rápido', () => {
    expect(modelInfo('deepseek-chat')).toMatchObject({ cost: 1, speed: 3 });
  });

  it('nombres de proveedor sin paréntesis y lista de modelos', () => {
    expect(providerLabel('deepseek')).toBe('DeepSeek');
    expect(providerLabel('otro')).toBe('otro');
    expect(modelsOf('openai')).toEqual(['gpt-4o', 'gpt-4o-mini']);
    expect(modelsOf('nada')).toEqual([]);
  });
});
