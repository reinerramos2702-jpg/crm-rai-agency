import { describe, expect, it } from 'vitest';
import { EMPTY_BRIEF, MAX_BRIEF_FIELD, briefFilledCount, briefToContext, isCampaignBrief } from '../campaign-brief';

describe('brief de la campaña', () => {
  it('el brief vacío es válido y no aporta contexto', () => {
    expect(isCampaignBrief(EMPTY_BRIEF)).toBe(true);
    expect(briefFilledCount(EMPTY_BRIEF)).toBe(0);
    expect(briefToContext(EMPTY_BRIEF)).toBe('');
  });

  it('rechaza formas inválidas y textos demasiado largos', () => {
    expect(isCampaignBrief(null)).toBe(false);
    expect(isCampaignBrief({ ...EMPTY_BRIEF, tone: 3 })).toBe(false);
    expect(isCampaignBrief({ objective: 'a' })).toBe(false);
    expect(isCampaignBrief({ ...EMPTY_BRIEF, pillars: 'a'.repeat(MAX_BRIEF_FIELD + 1) })).toBe(false);
  });

  it('cuenta solo campos con contenido real', () => {
    expect(briefFilledCount({ ...EMPTY_BRIEF, objective: 'Vender', tone: '   ' })).toBe(1);
  });

  it('genera el bloque de contexto aplanando los pilares', () => {
    const ctx = briefToContext({ ...EMPTY_BRIEF, objective: 'Vender más', pillars: 'Uno\nDos' });
    expect(ctx).toContain('[BRIEF DE LA CAMPAÑA]');
    expect(ctx).toContain('- Objetivo: Vender más');
    expect(ctx).toContain('- Pilares de contenido: Uno / Dos');
    expect(ctx).not.toContain('Tono');
  });
});
