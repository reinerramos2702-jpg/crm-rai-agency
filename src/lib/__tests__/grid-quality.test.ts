import { describe, expect, it } from 'vitest';
import { assessCopy, brandTerms, countHashtags, firstLine } from '../grid-quality';

const tags = (n: number) => Array.from({ length: n }, (_, i) => `#etiqueta${i}`).join(' ');

const GOOD = [
  'Tu marca merece más alcance',
  '',
  'Muchos negocios publican sin rumbo y pierden clientes cada semana. Nosotros ordenamos tu contenido en una grilla clara, con mensajes que conectan y una imagen coherente en cada publicación.',
  '',
  'Guarda esta publicación y escríbenos para armar tu semana. ¿Cuál es tu mayor reto al publicar?',
  '',
  tags(22),
].join('\n');

const BRAND = 'La marca usa un tono cercano y profesional. El tono cercano guía cada publicación. Paleta dorada, paleta oscura, estrategia visual, estrategia narrativa.';

describe('countHashtags / firstLine', () => {
  it('cuenta hashtags con tildes y números', () => {
    expect(countHashtags('hola #café #año2026 y #uno_dos nada#no')).toBe(3);
  });
  it('la primera línea ignora vacías y marcas', () => {
    expect(firstLine('\n\n**Hola mundo**\nresto')).toBe('Hola mundo');
  });
});

describe('assessCopy', () => {
  it('un copy vacío no se evalúa', () => {
    expect(assessCopy('   ')).toBeNull();
  });

  it('un copy completo obtiene buen puntaje y marca omitida sin documento', () => {
    const r = assessCopy(GOOD)!;
    const brand = r.checks.find((c) => c.id === 'brand')!;
    expect(brand.state).toBe('skip');
    expect(r.checks.filter((c) => c.state !== 'skip').every((c) => c.state === 'ok')).toBe(true);
    expect(r.score).toBe(100);
    expect(r.level).toBe('good');
  });

  it('detecta falta de CTA, hashtags y gancho largo', () => {
    const r = assessCopy('Este es un gancho larguísimo que no termina nunca y sigue y sigue hasta cansar a cualquiera que lo lea en la pantalla del teléfono móvil con muchas palabras seguidas')!;
    const state = (id: string) => r.checks.find((c) => c.id === id)!.state;
    expect(state('hook')).toBe('bad');
    expect(state('cta')).toBe('bad');
    expect(state('hashtags')).toBe('bad');
    expect(r.level).toBe('low');
  });

  it('avisa al pasar el límite de Instagram', () => {
    const r = assessCopy('a '.repeat(1200))!;
    const len = r.checks.find((c) => c.id === 'length')!;
    expect(len.state).toBe('bad');
    expect(len.hint).toContain('2200');
  });

  it('pide pregunta de anclaje cuando solo hay acción', () => {
    const r = assessCopy(GOOD.replace('¿Cuál es tu mayor reto al publicar?', 'Hablemos pronto.'))!;
    expect(r.checks.find((c) => c.id === 'cta')!.state).toBe('warn');
  });

  it('marca más de 30 hashtags como exceso', () => {
    const r = assessCopy(`${GOOD}\n${tags(12)}`)!;
    const h = r.checks.find((c) => c.id === 'hashtags')!;
    expect(h.state).toBe('bad');
    expect(h.hint).toContain('Quita');
  });

  it('evalúa la coherencia con el documento de marca', () => {
    const coherent = assessCopy(`${GOOD}\nTono cercano, paleta dorada y estrategia visual.`, BRAND)!;
    expect(coherent.checks.find((c) => c.id === 'brand')!.state).toBe('ok');
    const off = assessCopy(GOOD, BRAND)!;
    const brand = off.checks.find((c) => c.id === 'brand')!;
    expect(brand.state).toBe('bad');
    expect(brand.hint).toMatch(/tono|paleta|estrategia/);
  });
});

describe('brandTerms', () => {
  it('devuelve términos repetidos, sin palabras cortas ni vacías', () => {
    const terms = brandTerms(BRAND);
    expect(terms).toContain('paleta');
    expect(terms).not.toContain('usa');
    expect(brandTerms(null)).toEqual([]);
    expect(brandTerms('')).toEqual([]);
  });
});
