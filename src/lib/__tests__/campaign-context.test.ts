import { describe, expect, it } from 'vitest';
import { EMPTY_BRIEF } from '../campaign-brief';
import { buildContextSuffix, type ContextInput } from '../campaign-context';

const empty: ContextInput = {
  brandInput: '', inventory: [], inventoryPath: '', adsLibrary: null, adsLibraryBrand: '',
  competitorInsights: null, imageProvider: 'gemini', brief: EMPTY_BRIEF,
};

describe('contexto para la IA', () => {
  it('sin datos no agrega nada', () => {
    expect(buildContextSuffix(empty)).toBe('');
  });

  it('incluye marca, inventario, anuncios, competencia y proveedor de imágenes', () => {
    const out = buildContextSuffix({
      ...empty,
      brandInput: 'Marca X',
      inventoryPath: '/ruta',
      inventory: [
        { dayNumber: 1, hasContent: true, existingAssets: [] },
        { dayNumber: 2, hasContent: false, existingAssets: [] },
      ],
      adsLibrary: { adsFound: 12 },
      adsLibraryBrand: 'Nike',
      competitorInsights: { painPoints: [], opportunities: [], toneAnalysis: '', rawSummary: 'r'.repeat(500) },
      imageProvider: 'openai',
    });
    expect(out).toContain('[PERFIL DE MARCA PROPORCIONADO]\nMarca X');
    expect(out).toContain('Día 1\nTotal carpetas: 2');
    expect(out).toContain('[ANÁLISIS META ADS LIBRARY: Nike]\nAnuncios encontrados: 12');
    expect(out).toContain('r'.repeat(300));
    expect(out).not.toContain('r'.repeat(301));
    expect(out).toContain('Proveedor de imágenes: openai');
  });

  it('indica «ninguno» si ninguna carpeta tiene assets y añade el brief al final', () => {
    const out = buildContextSuffix({
      ...empty,
      inventory: [{ dayNumber: 1, hasContent: false, existingAssets: [] }],
      brief: { ...EMPTY_BRIEF, objective: 'Vender' },
    });
    expect(out).toContain('assets existentes: ninguno');
    expect(out.endsWith('- Objetivo: Vender')).toBe(true);
  });
});
