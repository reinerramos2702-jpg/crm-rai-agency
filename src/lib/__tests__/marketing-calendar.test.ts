import { describe, expect, it } from 'vitest';
import {
  addDaysKey, countByVisualStatus, dayKeyInZone, filterPostsByStatus, findGapKeys, groupPostsByDay,
  monthGrid, monthLabel, postVisualStatus, rangeForKeys, shiftMonth, timeLabel, weekKeys, weekStartKey,
} from '../marketing-calendar';

describe('marketing-calendar', () => {
  it('estado visible: simulada gana sobre publicada', () => {
    expect(postVisualStatus({ status: 'published', simulated: true }).key).toBe('simulated');
    expect(postVisualStatus({ status: 'published', simulated: false }).label).toBe('Publicada');
    expect(postVisualStatus({ status: 'failed', simulated: false }).tone).toBe('danger');
    expect(postVisualStatus({ status: 'scheduled', simulated: false }).label).toBe('Programada');
    expect(postVisualStatus({ status: 'algo-raro', simulated: false }).key).toBe('scheduled');
  });
  it('filtra y cuenta por estado', () => {
    const posts = [
      { status: 'scheduled', simulated: false },
      { status: 'published', simulated: true },
      { status: 'failed', simulated: false },
    ];
    expect(filterPostsByStatus(posts, 'all')).toHaveLength(3);
    expect(filterPostsByStatus(posts, 'simulated')).toHaveLength(1);
    expect(countByVisualStatus(posts).failed).toBe(1);
  });
  it('agrupa por día en la zona de la empresa, no en UTC', () => {
    // 01:30 UTC del 2 de noviembre = 21:30 del 1 en Caracas (UTC-4)
    expect(dayKeyInZone('2026-11-02T01:30:00Z', 'America/Caracas')).toBe('2026-11-01');
    expect(dayKeyInZone('2026-11-02T01:30:00Z', 'UTC')).toBe('2026-11-02');
    expect(timeLabel('2026-11-02T13:05:00Z', 'America/Caracas')).toBe('09:05');
    expect(dayKeyInZone('basura', 'UTC')).toBe('');
    expect(dayKeyInZone('2026-11-02T01:30:00Z', 'Zona/Invalida')).toBe('2026-11-02');
  });
  it('arma la cuadrícula del mes de lunes a domingo', () => {
    const g = monthGrid({ year: 2026, month: 9 }); // octubre 2026 empieza en jueves
    expect(g[0][0].key).toBe('2026-09-28');
    expect(g[0][3]).toMatchObject({ key: '2026-10-01', day: 1, inMonth: true });
    expect(g[0][0].inMonth).toBe(false);
    expect(g.every((w) => w.length === 7)).toBe(true);
    expect(g[g.length - 1][6].key >= '2026-10-31').toBe(true);
    expect(g).toHaveLength(5);
  });
  it('navega entre meses y etiqueta', () => {
    expect(shiftMonth({ year: 2026, month: 11 }, 1)).toEqual({ year: 2027, month: 0 });
    expect(shiftMonth({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 });
    expect(monthLabel({ year: 2026, month: 9 })).toBe('Octubre 2026');
  });
  it('semana y rango', () => {
    expect(weekStartKey('2026-10-16')).toBe('2026-10-12');
    expect(weekKeys('2026-10-18')[6]).toBe('2026-10-18');
    expect(addDaysKey('2026-12-31', 1)).toBe('2027-01-01');
    const r = rangeForKeys(['2026-10-12', '2026-10-18']);
    expect(r.from).toBe('2026-10-11T00:00:00.000Z');
    expect(r.to).toBe('2026-10-20T00:00:00.000Z');
  });
  it('detecta días sin publicar desde hoy, ignorando canceladas', () => {
    const keys = ['2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17'];
    const grouped = groupPostsByDay(
      [
        { scheduledAt: '2026-10-16T14:00:00Z', status: 'scheduled', simulated: false },
        { scheduledAt: '2026-10-17T14:00:00Z', status: 'cancelled', simulated: false },
      ],
      'UTC',
    );
    const gaps = findGapKeys(keys, grouped, '2026-10-15');
    expect([...gaps]).toEqual(['2026-10-15', '2026-10-17']);
  });
});
