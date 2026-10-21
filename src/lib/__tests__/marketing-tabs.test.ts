import { describe, expect, it } from 'vitest';
import { DEFAULT_MARKETING_TAB, MARKETING_TABS, marketingTabHref, parseMarketingTab } from '../marketing-tabs';

describe('marketing-tabs', () => {
  it('tiene ocho pestañas con id único', () => {
    expect(MARKETING_TABS).toHaveLength(8);
    expect(new Set(MARKETING_TABS.map((t) => t.id)).size).toBe(8);
  });
  it('lee ?tab= y cae en la pestaña por defecto con valores desconocidos', () => {
    expect(parseMarketingTab('links')).toBe('links');
    expect(parseMarketingTab('nope')).toBe(DEFAULT_MARKETING_TAB);
    expect(parseMarketingTab(null)).toBe(DEFAULT_MARKETING_TAB);
    expect(parseMarketingTab(undefined)).toBe(DEFAULT_MARKETING_TAB);
  });
  it('construye el enlace de cada pestaña', () => {
    expect(marketingTabHref('social')).toBe('/marketing');
    expect(marketingTabHref('brand')).toBe('/marketing?tab=brand');
  });
});
