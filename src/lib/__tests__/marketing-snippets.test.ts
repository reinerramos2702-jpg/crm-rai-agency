import { describe, expect, it } from 'vitest';
import { excerpt, extractVariables, filterSnippets, renderSnippet, validateSnippetDraft } from '../marketing-snippets';

describe('marketing-snippets', () => {
  it('extrae variables sin repetir y sin distinguir mayúsculas', () => {
    expect(extractVariables('Hola {{nombre}}, {{ Empresa }} y {{nombre}}')).toEqual(['nombre', 'empresa']);
    expect(extractVariables('sin variables { nombre }')).toEqual([]);
  });
  it('renderiza solo las variables con valor', () => {
    expect(renderSnippet('Hola {{nombre}} de {{empresa}}', { nombre: 'Ana', empresa: '  ' })).toBe('Hola Ana de {{empresa}}');
    expect(renderSnippet('{{Nombre}}', { nombre: 'Luis' })).toBe('Luis');
  });
  it('busca sin acentos ni mayúsculas', () => {
    const items = [
      { id: '1', title: 'Promoción de verano', body: 'Descuento' },
      { id: '2', title: 'Saludo', body: 'Hola' },
    ];
    expect(filterSnippets(items, 'PROMOCION')).toHaveLength(1);
    expect(filterSnippets(items, '')).toHaveLength(2);
    expect(filterSnippets(items, 'zzz')).toHaveLength(0);
  });
  it('valida el borrador', () => {
    expect(validateSnippetDraft({ title: ' ', body: 'x' })).toMatch(/título/);
    expect(validateSnippetDraft({ title: 'x', body: '' })).toMatch(/texto/);
    expect(validateSnippetDraft({ title: 'x', body: 'y'.repeat(5001) })).toMatch(/5000/);
    expect(validateSnippetDraft({ title: 'x', body: 'y' })).toBeNull();
  });
  it('recorta el extracto', () => {
    expect(excerpt('a\n\nb   c', 50)).toBe('a b c');
    expect(excerpt('x'.repeat(200), 10)).toHaveLength(10);
  });
});
