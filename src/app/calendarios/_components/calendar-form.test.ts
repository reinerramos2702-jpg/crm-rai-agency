import { describe, expect, it } from 'vitest';
import {
  applyTemplate, buildCalendarPayload, calendarToForm, emptyCalendarForm, formatDuration, parseDuration,
  validateCalendarForm,
} from './calendar-form';
import type { CalendarResource } from './calendar-types';
import { CALENDAR_TEMPLATES, findTemplate, templateAvailability } from './templates';

describe('parseDuration', () => {
  it('acepta enteros entre 5 y 480', () => {
    expect(parseDuration('30')).toEqual({ ok: true, value: 30 });
    expect(parseDuration(' 5 ')).toEqual({ ok: true, value: 5 });
    expect(parseDuration('480')).toEqual({ ok: true, value: 480 });
  });
  it('rechaza vacíos, decimales, negativos y fuera de rango', () => {
    for (const bad of ['', 'abc', '12.5', '-10', '4', '481', '0']) {
      expect(parseDuration(bad).ok).toBe(false);
    }
  });
});

describe('formatDuration', () => {
  it('escribe minutos y horas', () => {
    expect(formatDuration(30)).toBe('30 min');
    expect(formatDuration(60)).toBe('1 h');
    expect(formatDuration(90)).toBe('1 h 30 min');
    expect(formatDuration(0)).toBe('—');
    expect(formatDuration(Number.NaN)).toBe('—');
  });
});

describe('validateCalendarForm', () => {
  it('el formulario vacío exige nombre', () => {
    expect(validateCalendarForm(emptyCalendarForm())).toEqual({ name: 'El nombre del calendario es requerido.' });
  });
  it('valida duración y disponibilidad', () => {
    const f = { ...emptyCalendarForm(), name: 'Ventas', durationMins: '2' };
    f.availability = { ...f.availability, mon: { enabled: true, start: '10:00', end: '09:00' } };
    const errors = validateCalendarForm(f);
    expect(errors.durationMins).toMatch(/entre 5 y 480/);
    expect(errors.availability).toMatch(/Lunes/);
    expect(errors.name).toBeUndefined();
  });
  it('limita la longitud del nombre', () => {
    expect(validateCalendarForm({ ...emptyCalendarForm(), name: 'x'.repeat(121) }).name).toMatch(/máximo 120/);
  });
});

describe('buildCalendarPayload', () => {
  const base = { ...emptyCalendarForm('g1'), name: '  Ventas  ', description: '   ', durationMins: '45' };
  it('limpia textos y envía los siete días', () => {
    const p = buildCalendarPayload(base, false);
    expect(p.name).toBe('Ventas');
    expect(p.description).toBeNull();
    expect(p.durationMins).toBe(45);
    expect(p.groupId).toBe('g1');
    expect(Object.keys(p.availability as object)).toHaveLength(7);
    expect('bookingEnabled' in p).toBe(false);
  });
  it('solo al editar incluye las reservas online', () => {
    expect(buildCalendarPayload({ ...base, bookingEnabled: true }, true).bookingEnabled).toBe(true);
  });
  it('un tipo desconocido vuelve a personal y un grupo vacío es null', () => {
    const p = buildCalendarPayload({ ...base, type: 'raro', groupId: '' }, false);
    expect(p.type).toBe('personal');
    expect(p.groupId).toBeNull();
  });
});

describe('calendarToForm', () => {
  const cal: CalendarResource = {
    id: 'c1', name: 'Consulta', description: null, type: 'evento', durationMins: 20, status: 'active', groupId: null,
    bookingEnabled: true, bookingSlug: 'consulta', updatedAt: '2026-10-17T10:00:00.000Z',
    availability: { mon: [{ start: '08:00', end: '12:00' }], tue: [] },
  };
  it('lleva los datos guardados al formulario', () => {
    const f = calendarToForm(cal);
    expect(f).toMatchObject({ name: 'Consulta', description: '', type: 'evento', durationMins: '20', groupId: '', bookingEnabled: true });
    expect(f.availability.mon).toEqual({ enabled: true, start: '08:00', end: '12:00' });
    expect(f.availability.tue.enabled).toBe(false);
  });
});

describe('plantillas', () => {
  it('existen las tres plantillas de arranque', () => {
    expect(CALENDAR_TEMPLATES.map((t) => t.label)).toEqual(['Consulta', 'Reunión de ventas', 'Llamada de descubrimiento']);
    expect(findTemplate('consulta')?.durationMins).toBe(45);
    expect(findTemplate('no-existe')).toBeUndefined();
  });
  it('cada plantilla genera un formulario válido', () => {
    for (const t of CALENDAR_TEMPLATES) {
      const f = applyTemplate(emptyCalendarForm('g9'), t);
      expect(f.groupId).toBe('g9');
      expect(f.name).toBe(t.name);
      expect(validateCalendarForm(f)).toEqual({});
    }
  });
  it('la disponibilidad abre solo los días de la plantilla', () => {
    const t = findTemplate('reunion-ventas');
    expect(t).toBeDefined();
    if (!t) return;
    const av = templateAvailability(t);
    expect(av.mon).toEqual({ enabled: true, start: '10:00', end: '17:00' });
    expect(av.sat.enabled).toBe(false);
  });
});
