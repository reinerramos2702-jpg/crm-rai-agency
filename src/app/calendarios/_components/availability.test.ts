import { describe, expect, it } from 'vitest';
import {
  availabilityToForm, clearedAvailabilityForm, dayBars, defaultAvailabilityForm, describeDays, everyDayAvailabilityForm,
  formToAvailability, isValidTime, readAvailability, summarizeAvailability, timeToMinutes, validateAvailabilityForm,
  weeklySlotCount,
} from './availability';

describe('horas', () => {
  it('valida el formato HH:MM de 24 h', () => {
    expect(isValidTime('09:00')).toBe(true);
    expect(isValidTime('23:59')).toBe(true);
    expect(isValidTime('24:00')).toBe(false);
    expect(isValidTime('9:00')).toBe(false);
    expect(isValidTime('')).toBe(false);
  });
  it('convierte a minutos', () => {
    expect(timeToMinutes('00:00')).toBe(0);
    expect(timeToMinutes('09:30')).toBe(570);
    expect(timeToMinutes('xx')).toBeNull();
  });
});

describe('readAvailability', () => {
  it('descarta datos con formato inválido', () => {
    expect(readAvailability(null)).toEqual({});
    expect(readAvailability('mon')).toEqual({});
    expect(readAvailability([])).toEqual({});
    const av = readAvailability({
      mon: [{ start: '09:00', end: '17:00' }, { start: '18:00', end: '12:00' }, { start: 9, end: 10 }, null],
      tue: 'no',
      sat: [],
      xyz: [{ start: '09:00', end: '10:00' }],
    });
    expect(av.mon).toEqual([{ start: '09:00', end: '17:00' }]);
    expect(av.tue).toBeUndefined();
    expect(av.sat).toEqual([]);
    expect(Object.keys(av)).not.toContain('xyz');
  });
});

describe('formulario <-> JSON', () => {
  it('el formulario por defecto es lunes a viernes de 09:00 a 18:00', () => {
    const f = defaultAvailabilityForm();
    expect(f.mon).toEqual({ enabled: true, start: '09:00', end: '18:00' });
    expect(f.sat.enabled).toBe(false);
    const av = formToAvailability(f);
    expect(av.fri).toEqual([{ start: '09:00', end: '18:00' }]);
    expect(av.sun).toEqual([]);
  });
  it('ida y vuelta conserva horarios personalizados', () => {
    const f = defaultAvailabilityForm();
    f.wed = { enabled: true, start: '08:00', end: '12:30' };
    f.fri = { enabled: false, start: '09:00', end: '18:00' };
    const back = availabilityToForm(formToAvailability(f));
    expect(back.wed).toEqual({ enabled: true, start: '08:00', end: '12:30' });
    expect(back.fri.enabled).toBe(false);
  });
  it('sin datos guardados todos los días quedan cerrados', () => {
    const f = availabilityToForm(null);
    expect(Object.values(f).every((d) => !d.enabled)).toBe(true);
  });
  it('los atajos producen lo esperado', () => {
    expect(Object.values(everyDayAvailabilityForm()).every((d) => d.enabled)).toBe(true);
    expect(Object.values(clearedAvailabilityForm()).every((d) => !d.enabled)).toBe(true);
  });
});

describe('validateAvailabilityForm', () => {
  it('acepta el formulario por defecto', () => {
    expect(validateAvailabilityForm(defaultAvailabilityForm())).toBeNull();
  });
  it('detecta fin anterior al inicio y horas vacías', () => {
    const f = defaultAvailabilityForm();
    f.tue = { enabled: true, start: '18:00', end: '09:00' };
    expect(validateAvailabilityForm(f)).toBe('Martes: la hora de fin debe ser posterior a la de inicio.');
    f.tue = { enabled: true, start: '', end: '09:00' };
    expect(validateAvailabilityForm(f)).toBe('Martes: indica una hora de inicio y de fin válidas.');
  });
  it('ignora los días cerrados aunque tengan horas inválidas', () => {
    const f = defaultAvailabilityForm();
    f.sun = { enabled: false, start: '', end: '' };
    expect(validateAvailabilityForm(f)).toBeNull();
  });
});

describe('resúmenes', () => {
  it('describe los días', () => {
    expect(describeDays(['mon', 'tue', 'wed', 'thu', 'fri'])).toBe('Lun–Vie');
    expect(describeDays(['mon', 'wed', 'fri'])).toBe('Lun, Mié y Vie');
    expect(describeDays(['mon', 'tue'])).toBe('Lun y Mar');
    expect(describeDays(['sat'])).toBe('Sáb');
    expect(describeDays(['mon', 'tue', 'wed', 'fri', 'sat'])).toBe('Lun–Mié, Vie y Sáb');
    expect(describeDays(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])).toBe('Todos los días');
    expect(describeDays([])).toBe('');
  });
  it('resume la disponibilidad', () => {
    expect(summarizeAvailability(formToAvailability(defaultAvailabilityForm()))).toBe('Lun–Vie · 09:00–18:00');
    expect(summarizeAvailability({})).toBe('Sin horarios definidos');
    const f = defaultAvailabilityForm();
    f.mon = { enabled: true, start: '08:00', end: '12:00' };
    expect(summarizeAvailability(formToAvailability(f))).toBe('Horario variable · 5 días');
  });
});

describe('cupos semanales', () => {
  it('cuenta las citas que caben en cada franja', () => {
    const av = formToAvailability(defaultAvailabilityForm()); // 5 días × 9 h
    expect(weeklySlotCount(av, 30)).toBe(5 * 18);
    expect(weeklySlotCount(av, 60)).toBe(5 * 9);
    expect(weeklySlotCount(av, 45)).toBe(5 * 12);
    expect(weeklySlotCount(av, 0)).toBe(0);
    expect(weeklySlotCount({}, 30)).toBe(0);
  });
});

describe('dayBars', () => {
  it('escala las franjas al eje 06:00-22:00 y recorta lo que sobra', () => {
    const bars = dayBars({ mon: [{ start: '06:00', end: '22:00' }], tue: [{ start: '14:00', end: '18:00' }], wed: [{ start: '00:00', end: '05:00' }] });
    expect(bars).toHaveLength(7);
    expect(bars[0]?.segments).toEqual([{ top: 0, height: 100 }]);
    expect(bars[1]?.segments).toEqual([{ top: 50, height: 25 }]);
    expect(bars[2]?.segments).toEqual([]);
    expect(bars[6]?.segments).toEqual([]);
  });
});
