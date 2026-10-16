import { describe, expect, it } from 'vitest';
import { GRID_TEMPLATES, buildTemplateThemes, templateById } from '../grid-templates';

describe('plantillas de grilla', () => {
  it('cada plantilla tiene 7 temas completos y títulos breves', () => {
    expect(GRID_TEMPLATES.length).toBeGreaterThanOrEqual(4);
    for (const t of GRID_TEMPLATES) {
      expect(t.themes, t.id).toHaveLength(7);
      for (const th of t.themes) {
        expect(th.title.trim()).not.toBe('');
        expect(th.title.split(' ').length, th.title).toBeLessThan(8 + 2);
        expect(th.category.trim()).not.toBe('');
        expect(th.segment.trim()).not.toBe('');
      }
    }
  });

  it('los ids son únicos y los títulos no se repiten dentro de una plantilla', () => {
    expect(new Set(GRID_TEMPLATES.map((t) => t.id)).size).toBe(GRID_TEMPLATES.length);
    for (const t of GRID_TEMPLATES) expect(new Set(t.themes.map((x) => x.title)).size).toBe(7);
  });

  it('buildTemplateThemes devuelve copias independientes', () => {
    const a = buildTemplateThemes('venta');
    a[0].title = 'cambiado';
    expect(buildTemplateThemes('venta')[0].title).not.toBe('cambiado');
    expect(templateById('venta')?.themes[0].title).not.toBe('cambiado');
  });

  it('un id desconocido devuelve una lista vacía', () => {
    expect(buildTemplateThemes('no-existe')).toEqual([]);
    expect(templateById('no-existe')).toBeUndefined();
  });
});
