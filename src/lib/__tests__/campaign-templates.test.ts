import { describe, expect, it } from 'vitest';
import { isCampaignBrief } from '../campaign-brief';
import { PIPELINE_TYPES } from '../campaign-new-options';
import { CAMPAIGN_TEMPLATES, applyTemplate, findTemplate } from '../campaign-templates';
import { EMPTY_BRIEF } from '../campaign-brief';

describe('plantillas de arranque', () => {
  it('tienen ids únicos, pipeline existente, brief completo y mensaje acotado', () => {
    const ids = new Set<string>();
    for (const t of CAMPAIGN_TEMPLATES) {
      expect(ids.has(t.id), t.id).toBe(false);
      ids.add(t.id);
      expect(PIPELINE_TYPES.some((p) => p.value === t.pipelineType), t.id).toBe(true);
      expect(isCampaignBrief(t.brief), t.id).toBe(true);
      expect(Object.values(t.brief).every((v) => v.trim().length > 0), t.id).toBe(true);
      expect(t.firstMessage.length).toBeGreaterThan(20);
      expect(t.firstMessage.length).toBeLessThanOrEqual(600);
      expect(t.nameSuggestion.length).toBeLessThanOrEqual(120);
    }
    expect(CAMPAIGN_TEMPLATES.length).toBeGreaterThanOrEqual(6);
  });

  it('findTemplate resuelve por id', () => {
    expect(findTemplate('hotel')?.label).toBe('Hotel o posada');
    expect(findTemplate('no-existe')).toBeUndefined();
  });

  it('propone nombre solo si estaba vacío', () => {
    const t = findTemplate('restaurante')!;
    expect(applyTemplate(t, { name: '', brief: EMPTY_BRIEF }).name).toBe(t.nameSuggestion);
    expect(applyTemplate(t, { name: 'Mi sprint', brief: EMPTY_BRIEF }).name).toBe('Mi sprint');
  });

  it('no pisa los campos del brief que ya tienen contenido', () => {
    const t = findTemplate('tienda')!;
    const out = applyTemplate(t, { name: '', brief: { ...EMPTY_BRIEF, tone: 'Formal' } });
    expect(out.brief.tone).toBe('Formal');
    expect(out.brief.objective).toBe(t.brief.objective);
    expect(out.pipelineType).toBe(t.pipelineType);
    expect(out.firstMessage).toBe(t.firstMessage);
  });
});
