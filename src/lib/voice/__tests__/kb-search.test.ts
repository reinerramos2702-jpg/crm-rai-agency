import { describe, expect, it } from 'vitest';
import { chunkItem, rankKnowledge, tokenize, type KbItemInput } from '../kb-search';

const item = (over: Partial<KbItemInput> & { id: string }): KbItemInput => ({
  type: 'faq', question: null, answer: null, title: null, content: null, data: null, ...over,
});

const ITEMS: KbItemInput[] = [
  item({ id: 'f1', question: '¿Cuál es el horario de atención?', answer: 'Atendemos de lunes a viernes de 8am a 6pm.' }),
  item({ id: 'f2', question: '¿Cuánto cuesta una habitación doble?', answer: 'La habitación doble cuesta 80 dólares por noche.' }),
  item({ id: 'f3', question: '¿Aceptan mascotas?', answer: 'Sí, aceptamos mascotas pequeñas con un cargo de 10 dólares.' }),
  item({ id: 't1', type: 'text', title: 'Ubicación', content: 'Estamos en La Guaira, frente a la playa.\n\nTenemos estacionamiento gratuito para huéspedes.' }),
  item({ id: 'tb1', type: 'table', title: 'Tarifas', data: { rows: [{ servicio: 'Desayuno', precio: '8 USD' }, { servicio: 'Traslado aeropuerto', precio: '35 USD' }] } }),
];

describe('tokenize', () => {
  it('quita acentos, mayúsculas, palabras vacías y plurales simples', () => {
    expect(tokenize('¿Cuánto cuestan las Habitaciones?')).toEqual(['cuestan', 'habitacion']);
  });
});

describe('rankKnowledge', () => {
  it('pone primero la respuesta que corresponde', () => {
    expect(rankKnowledge(ITEMS, 'a qué hora atienden, cuál es el horario')[0].itemId).toBe('f1');
    expect(rankKnowledge(ITEMS, 'cuánto cuesta la habitación doble')[0].itemId).toBe('f2');
    expect(rankKnowledge(ITEMS, 'puedo llevar mi mascota')[0].itemId).toBe('f3');
  });

  it('encuentra texto largo y filas de tabla', () => {
    expect(rankKnowledge(ITEMS, 'tienen estacionamiento')[0].itemId).toBe('t1');
    const row = rankKnowledge(ITEMS, 'cuánto cuesta el traslado al aeropuerto')[0];
    expect(row.itemId).toBe('tb1');
    expect(row.text).toContain('35 USD');
  });

  it('sin coincidencias devuelve vacío; consulta vacía o solo palabras vacías también', () => {
    expect(rankKnowledge(ITEMS, 'astronomía de agujeros negros')).toEqual([]);
    expect(rankKnowledge(ITEMS, '')).toEqual([]);
    expect(rankKnowledge(ITEMS, 'de la el')).toEqual([]);
    expect(rankKnowledge([], 'horario')).toEqual([]);
  });

  it('respeta topK y recorta fragmentos largos a palabras completas', () => {
    const many = Array.from({ length: 6 }, (_, i) => item({ id: `m${i}`, question: `Pregunta de precio ${i}`, answer: 'precio '.repeat(200) }));
    const hits = rankKnowledge(many, 'precio', { topK: 2, maxChars: 100 });
    expect(hits).toHaveLength(2);
    expect(hits[0].text.length).toBeLessThanOrEqual(101);
    expect(hits[0].text.endsWith('…')).toBe(true);
  });

  it('el orden es determinístico y los puntajes descienden', () => {
    const a = rankKnowledge(ITEMS, 'habitación horario mascotas dólares');
    const b = rankKnowledge(ITEMS, 'habitación horario mascotas dólares');
    expect(a).toEqual(b);
    for (let i = 1; i < a.length; i += 1) expect(a[i - 1].score).toBeGreaterThanOrEqual(a[i].score);
  });
});

describe('chunkItem', () => {
  it('una FAQ es un solo fragmento y un texto largo se parte por párrafos', () => {
    expect(chunkItem(ITEMS[0])).toHaveLength(1);
    expect(chunkItem(ITEMS[3])).toHaveLength(2);
    expect(chunkItem(item({ id: 'x', type: 'file' }))).toEqual([]);
  });
});
