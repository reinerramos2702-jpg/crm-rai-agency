import { describe, expect, it } from 'vitest';
import { MAX_BRAND_TEXT, brandFromConfig, hasBrandData, type BrandSource } from '../campaign-brand';

const empty: BrandSource = {
  businessName: '', businessType: '', businessLocation: '', brandTone: '', brandColors: '',
  targetAudience: '', services: '', competitors: '', contentNotes: '', brandDocName: '', brandDocContent: '',
};

describe('marca desde Configuración', () => {
  it('detecta si hay algo que cargar', () => {
    expect(hasBrandData(empty)).toBe(false);
    expect(hasBrandData({ ...empty, businessName: 'Hotel Sol' })).toBe(true);
    expect(hasBrandData({ ...empty, brandDocContent: 'Manual' })).toBe(true);
  });

  it('arma un perfil legible omitiendo campos vacíos', () => {
    const out = brandFromConfig({ ...empty, businessName: 'Hotel Sol', brandTone: 'cálido', igHandle: '@hotelsol' });
    expect(out).toBe('Negocio: Hotel Sol\nInstagram: @hotelsol\nTono de marca: cálido');
  });

  it('adjunta el documento de marca con su nombre', () => {
    const out = brandFromConfig({ ...empty, brandDocName: 'Manual.docx', brandDocContent: 'Colores y tono' });
    expect(out).toContain('Documento de marca (Manual.docx):\nColores y tono');
  });

  it('respeta el tope de longitud', () => {
    const out = brandFromConfig({ ...empty, brandDocContent: 'a'.repeat(MAX_BRAND_TEXT * 2) });
    expect(out.length).toBeLessThanOrEqual(MAX_BRAND_TEXT);
    expect(out.endsWith('…')).toBe(true);
  });
});
