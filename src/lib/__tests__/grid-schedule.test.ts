import { describe, expect, it } from 'vitest';
import { addDaysIso, buildSchedulePayload, campaignRefFor, localIsoDate, prepareSchedule } from '../grid-schedule';

const piece = (day: number, caption: string, imageUrls: string[] = []) => ({ day, title: `T${day}`, caption, imageUrls });

describe('fechas', () => {
  it('suma días cruzando mes y año', () => {
    expect(addDaysIso('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDaysIso('2026-02-27', 2)).toBe('2026-03-01');
  });
  it('localIsoDate usa la fecha local', () => {
    expect(localIsoDate(1, new Date(2026, 9, 31, 23, 0))).toBe('2026-11-01');
  });
  it('la referencia de campaña es estable', () => {
    expect(campaignRefFor('abc')).toBe('generador-abc');
  });
});

describe('prepareSchedule (modo simulado)', () => {
  const rows = prepareSchedule(
    [
      piece(1, 'Copy 1', ['https://cdn.example.com/a.png']),
      piece(2, 'Copy 2', ['https://cdn.example.com/a.png', 'https://cdn.example.com/b.png']),
      piece(3, ''),
      piece(4, 'x'.repeat(2300)),
      piece(5, 'Copy 5', ['http://inseguro.com/a.png', 'https://cdn.example.com/c.png']),
    ],
    '2026-11-02',
    'simulated',
  );

  it('asigna una fecha por día consecutivo', () => {
    expect(rows.map((r) => r.date)).toEqual(['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06']);
  });
  it('define imagen o carrusel según las imágenes', () => {
    expect(rows[0].mediaType).toBe('image');
    expect(rows[1].mediaType).toBe('carousel');
  });
  it('omite sin copy o con copy demasiado largo', () => {
    expect(rows[2].skipReason).toBe('Sin copy');
    expect(rows[3].skipReason).toContain('2200');
  });
  it('descarta imágenes no https sin omitir la pieza en modo simulado', () => {
    expect(rows[4].skipReason).toBeNull();
    expect(rows[4].droppedImages).toBe(1);
    expect(rows[4].mediaUrls).toEqual(['https://cdn.example.com/c.png']);
  });
  it('el payload solo incluye las filas enviables', () => {
    const payload = buildSchedulePayload('g1', rows);
    expect(payload.campaignRef).toBe('generador-g1');
    expect(payload.posts.map((p) => p.day)).toEqual([1, 2, 5]);
  });
});

describe('prepareSchedule (modo real)', () => {
  it('exige imágenes públicas', () => {
    const rows = prepareSchedule(
      [piece(1, 'Copy'), piece(2, 'Copy', ['http://x/a.png']), piece(3, 'Copy', ['https://cdn.example.com/a.png'])],
      '2026-11-02',
      'live',
    );
    expect(rows[0].skipReason).toContain('Faltan imágenes');
    expect(rows[1].skipReason).toBeTruthy();
    expect(rows[2].skipReason).toBeNull();
  });
});
