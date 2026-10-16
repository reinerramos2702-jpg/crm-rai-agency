import { describe, expect, it } from 'vitest';
import { CAMPAIGN_DRAFT_KEY, INITIAL_CAMPAIGN_DRAFT, MAX_DRAFT_TEXT, isCampaignDraft } from '../campaign-draft';
import { PROVIDERS, pipelineHasVideo } from '../campaign-new-options';

const valid = { ...INITIAL_CAMPAIGN_DRAFT, name: 'Sprint de mayo', pipelineType: 'carousel' };

describe('isCampaignDraft', () => {
  it('acepta el estado inicial y un borrador completo', () => {
    expect(isCampaignDraft(INITIAL_CAMPAIGN_DRAFT)).toBe(true);
    expect(isCampaignDraft(valid)).toBe(true);
  });

  it('el estado inicial usa el primer modelo de su proveedor', () => {
    const first = PROVIDERS.find((p) => p.provider === INITIAL_CAMPAIGN_DRAFT.provider)?.models[0];
    expect(INITIAL_CAMPAIGN_DRAFT.modelId).toBe(first);
  });

  it('rechaza valores que no son objetos', () => {
    for (const v of [null, undefined, 'texto', 7, []]) expect(isCampaignDraft(v)).toBe(false);
  });

  it('rechaza campos ausentes o con tipo incorrecto', () => {
    const sinNombre = Object.fromEntries(Object.entries(valid).filter(([k]) => k !== 'name'));
    expect(isCampaignDraft(sinNombre)).toBe(false);
    expect(isCampaignDraft({ ...valid, brandInput: 42 })).toBe(false);
  });

  it('rechaza selecciones que ya no existen', () => {
    expect(isCampaignDraft({ ...valid, pipelineType: 'podcast' })).toBe(false);
    expect(isCampaignDraft({ ...valid, imageProvider: 'otro' })).toBe(false);
    expect(isCampaignDraft({ ...valid, adsLibraryCountry: 'ZZ' })).toBe(false);
    expect(isCampaignDraft({ ...valid, competitorMode: 'rss' })).toBe(false);
  });

  it('exige que el modelo pertenezca al proveedor', () => {
    expect(isCampaignDraft({ ...valid, provider: 'anthropic', modelId: 'claude-opus-4-7' })).toBe(true);
    expect(isCampaignDraft({ ...valid, provider: 'anthropic', modelId: 'gpt-4o' })).toBe(false);
    expect(isCampaignDraft({ ...valid, provider: 'desconocido' })).toBe(false);
  });

  it('acota la longitud de los textos', () => {
    expect(isCampaignDraft({ ...valid, brandInput: 'a'.repeat(MAX_DRAFT_TEXT) })).toBe(true);
    expect(isCampaignDraft({ ...valid, brandInput: 'a'.repeat(MAX_DRAFT_TEXT + 1) })).toBe(false);
  });
});

describe('constantes del borrador', () => {
  it('la clave está versionada', () => {
    expect(CAMPAIGN_DRAFT_KEY).toBe('rai-draft-campaign-new-v1');
  });

  it('solo UGC y Avatar Reel llevan video', () => {
    expect(pipelineHasVideo('ugc')).toBe(true);
    expect(pipelineHasVideo('avatar_reel')).toBe(true);
    expect(pipelineHasVideo('static_ads')).toBe(false);
    expect(pipelineHasVideo('carousel')).toBe(false);
  });
});
