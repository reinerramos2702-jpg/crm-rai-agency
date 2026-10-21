import { describe, expect, it } from 'vitest';
import { brandChecklist, brandScore, extractHexColors, mergePalette, normalizeHex, parseBrandProfile, readableOn } from '../marketing-brand';

const input = {
  configured: true, businessName: 'Quadro', brandTone: 'cercano', brandColors: '', targetAudience: '', services: '',
  igHandle: '', rulesCount: 0, hasDoc: false, hasProfile: false,
};

describe('marketing-brand', () => {
  it('extrae colores hex sin repetir y expande los de 3 dígitos', () => {
    expect(extractHexColors('Azul #0a3d62, dorado #C9A84C, otra vez #c9a84c y #fff')).toEqual(['#0A3D62', '#C9A84C', '#FFFFFF']);
    expect(extractHexColors('sin colores')).toEqual([]);
    expect(normalizeHex('#abc')).toBe('#AABBCC');
  });
  it('elige texto legible', () => {
    expect(readableOn('#FFFFFF')).toBe('#0A0A0F');
    expect(readableOn('#12121A')).toBe('#FFFFFF');
  });
  it('lee brandProfile de forma tolerante', () => {
    expect(parseBrandProfile(null).colors).toEqual([]);
    expect(parseBrandProfile([1, 2]).tone).toBe('');
    const p = parseBrandProfile({ colors: ['#111', 'x'], tone: 'Cálido', products: [{ name: 'Café' }, 'Té'], voice: 'Directa' });
    expect(p.colors).toEqual(['#111111']);
    expect(p.tone).toBe('Cálido');
    expect(p.lists[0]).toEqual({ label: 'Productos', items: ['Café', 'Té'] });
    expect(parseBrandProfile({ palette: { primary: '#ABCDEF' } }).colors).toEqual(['#ABCDEF']);
  });
  it('puntúa los pendientes', () => {
    const items = brandChecklist(input);
    expect(items.find((i) => i.id === 'name')?.done).toBe(true);
    expect(items.find((i) => i.id === 'colors')?.done).toBe(false);
    expect(brandScore(items)).toBe(Math.round((2 / 7) * 100));
    expect(brandScore([])).toBe(0);
    expect(brandChecklist({ ...input, configured: false }).find((i) => i.id === 'tone')?.done).toBe(false);
    expect(brandChecklist({ ...input, hasDoc: true }).find((i) => i.id === 'doc')?.href).toBe('/generador-imagenes');
  });
  it('combina paleta priorizando el perfil', () => {
    expect(mergePalette(['#111111'], 'rojo #E63946 y #111111', 'doc #00FF00')).toEqual(['#111111', '#E63946', '#00FF00']);
  });
});
