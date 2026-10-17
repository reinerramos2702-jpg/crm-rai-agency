import { describe, expect, it } from 'vitest';
import {
  addDays, browserTimeZone, dayKey, fmtDate, fmtDayLong, fmtTimeRange, fmtWeekRange, isSameDay, isValidTimeZone,
  parseDateTimeLocal, relativeDayLabel, shiftEnd, startOfDay, startOfWeek, toDateTimeLocal, upperFirst, weekdayIndex,
} from './dates';

// Todas las fechas se construyen en hora local, así las pruebas no dependen de la zona horaria de la máquina.
const sat = new Date(2026, 9, 17, 15, 30); // sábado 17 oct 2026

describe('semana y días', () => {
  it('la semana empieza el lunes', () => {
    expect(weekdayIndex(sat)).toBe(5);
    expect(dayKey(startOfWeek(sat))).toBe('2026-10-12');
    expect(dayKey(startOfWeek(new Date(2026, 9, 18)))).toBe('2026-10-12'); // domingo
    expect(dayKey(startOfWeek(new Date(2026, 9, 12)))).toBe('2026-10-12'); // lunes
  });
  it('suma días cruzando de mes', () => {
    expect(dayKey(addDays(sat, 20))).toBe('2026-11-06');
    expect(dayKey(addDays(sat, -17))).toBe('2026-09-30');
  });
  it('compara días ignorando la hora', () => {
    expect(isSameDay(sat, new Date(2026, 9, 17, 0, 1))).toBe(true);
    expect(isSameDay(sat, new Date(2026, 9, 18))).toBe(false);
    expect(startOfDay(sat).getHours()).toBe(0);
  });
  it('etiqueta hoy, mañana y ayer', () => {
    expect(relativeDayLabel(new Date(2026, 9, 17, 9), sat)).toBe('Hoy');
    expect(relativeDayLabel(new Date(2026, 9, 18, 9), sat)).toBe('Mañana');
    expect(relativeDayLabel(new Date(2026, 9, 16, 9), sat)).toBe('Ayer');
    expect(relativeDayLabel(new Date(2026, 9, 25), sat)).toBeNull();
  });
});

describe('formatos', () => {
  it('pone en mayúscula solo la primera letra', () => {
    expect(upperFirst('sábado 17 de octubre')).toBe('Sábado 17 de octubre');
    expect(upperFirst('')).toBe('');
  });
  it('escribe fechas y horas en español con tildes', () => {
    expect(fmtDate(sat)).toBe('17 oct 2026');
    expect(fmtDayLong(sat)).toBe('sábado 17 de octubre');
    expect(fmtDayLong(new Date(2026, 9, 14))).toBe('miércoles 14 de octubre');
    expect(fmtDayLong(new Date(2026, 9, 15))).toBe('jueves 15 de octubre');
    expect(fmtTimeRange(new Date(2026, 9, 17, 9, 5), new Date(2026, 9, 17, 10, 0))).toBe('09:05 – 10:00');
  });
  it('resume el rango de la semana', () => {
    expect(fmtWeekRange(new Date(2026, 9, 12))).toBe('12 – 18 oct 2026');
    expect(fmtWeekRange(new Date(2026, 8, 28))).toBe('28 sep – 4 oct 2026');
  });
});

describe('datetime-local', () => {
  it('ida y vuelta', () => {
    const text = toDateTimeLocal(sat);
    expect(text).toBe('2026-10-17T15:30');
    expect(parseDateTimeLocal(text)?.getTime()).toBe(sat.getTime());
  });
  it('rechaza formatos y fechas inexistentes', () => {
    expect(parseDateTimeLocal('')).toBeNull();
    expect(parseDateTimeLocal('2026-10-17')).toBeNull();
    expect(parseDateTimeLocal('2026-02-31T10:00')).toBeNull();
    expect(parseDateTimeLocal('2026-10-17T25:00')).toBeNull();
    expect(parseDateTimeLocal('2026-10-17T10:60')).toBeNull();
  });
});

describe('shiftEnd', () => {
  it('conserva la duración al mover el inicio', () => {
    const s = new Date(2026, 9, 17, 10, 0);
    const e = new Date(2026, 9, 17, 10, 45);
    const next = new Date(2026, 9, 18, 14, 0);
    expect(shiftEnd(s, e, next).getTime()).toBe(new Date(2026, 9, 18, 14, 45).getTime());
  });
  it('usa 30 minutos si la duración anterior no es válida', () => {
    const next = new Date(2026, 9, 18, 14, 0);
    expect(shiftEnd(null, null, next).getTime()).toBe(new Date(2026, 9, 18, 14, 30).getTime());
    expect(shiftEnd(next, next, next).getTime()).toBe(new Date(2026, 9, 18, 14, 30).getTime());
  });
});

describe('zona horaria', () => {
  it('valida identificadores IANA con Intl', () => {
    expect(isValidTimeZone('America/Caracas')).toBe(true);
    expect(isValidTimeZone('UTC')).toBe(true);
    expect(isValidTimeZone('Marte/Olimpo')).toBe(false);
    expect(isValidTimeZone('')).toBe(false);
  });
  it('detecta la zona del navegador', () => {
    const tz = browserTimeZone();
    expect(tz === null || isValidTimeZone(tz)).toBe(true);
  });
});
