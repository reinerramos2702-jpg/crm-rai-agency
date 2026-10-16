import { describe, expect, it } from 'vitest';
import { STARTER_REPLIES, suggestReplies } from '../campaign-suggestions';

const ai = (content: string) => [{ role: 'user' as const, content: 'hola' }, { role: 'assistant' as const, content }];

describe('respuestas sugeridas', () => {
  it('sin mensajes ofrece ideas para empezar', () => {
    expect(suggestReplies([])).toEqual(STARTER_REPLIES);
  });

  it('no sugiere mientras se espera a la IA', () => {
    expect(suggestReplies([{ role: 'user', content: 'hola' }])).toEqual([]);
    expect(suggestReplies(ai('   '))).toEqual([]);
  });

  it('adapta las sugerencias al tema de la pregunta', () => {
    expect(suggestReplies(ai('¿Cuál es el tono de tu marca?'))[0]).toContain('Tono');
    expect(suggestReplies(ai('Estos son los pilares propuestos. ¿Los apruebas?'))[0]).toContain('pilares');
    expect(suggestReplies(ai('Cuando esté listo, toca Generar Plan Maestro.'))[0]).toContain('cierra el plan');
  });

  it('combina temas sin pasar de tres ni repetir', () => {
    const out = suggestReplies(ai('Dime el objetivo, el público, el tono y la frecuencia'));
    expect(out.length).toBeLessThanOrEqual(3);
    expect(new Set(out).size).toBe(out.length);
  });

  it('ofrece reintentar tras un error y una continuación genérica por defecto', () => {
    expect(suggestReplies(ai('⚠️ Error de red'))).toContain('Inténtalo de nuevo');
    expect(suggestReplies(ai('De acuerdo.'))).toEqual(['Continúa', 'Dame una versión más corta']);
  });
});
