import { describe, expect, it } from 'vitest';
import {
  barShares, countLabel, dayBounds, deltaInfo, describeActivity, firstName, formatClock, greetingFor, parsePeriod,
  pctDelta, periodWindows, relativeTime, safeTimezone, todayHeadline, type DashboardToday,
} from '../dashboard-summary';

const emptyToday = (over: Partial<DashboardToday> = {}): DashboardToday => ({
  tz: 'America/Caracas', appointments: null, tasks: null, unanswered: null, payments: null, posts: null, ...over,
});
const list = <T,>(count: number, items: T[] = []) => ({ count, more: false, items });

describe('parsePeriod', () => {
  it('acepta 7 y 30 y cae a 7 con cualquier otro valor', () => {
    expect(parsePeriod('30')).toBe(30);
    expect(parsePeriod(7)).toBe(7);
    expect(parsePeriod('90')).toBe(7);
    expect(parsePeriod(null)).toBe(7);
    expect(parsePeriod('abc')).toBe(7);
  });
});

describe('variación entre periodos', () => {
  it('pctDelta redondea y devuelve null sin base de comparación', () => {
    expect(pctDelta(15, 10)).toBe(50);
    expect(pctDelta(7, 9)).toBe(-22);
    expect(pctDelta(3, 0)).toBeNull();
  });

  it('deltaInfo clasifica subida, bajada, igual, nuevo y sin datos', () => {
    expect(deltaInfo(12, 10)).toEqual({ dir: 'up', label: '+20 %' });
    expect(deltaInfo(5, 10)).toEqual({ dir: 'down', label: '−50 %' });
    expect(deltaInfo(10, 10)).toEqual({ dir: 'flat', label: '0 %' });
    expect(deltaInfo(4, 0)).toEqual({ dir: 'new', label: 'Nuevo' });
    expect(deltaInfo(0, 0)).toEqual({ dir: 'none', label: 'Sin datos' });
    expect(deltaInfo(0, 6)).toEqual({ dir: 'down', label: '−100 %' });
  });

  it('barShares normaliza a la mayor de las dos', () => {
    expect(barShares(10, 5)).toEqual([100, 50]);
    expect(barShares(0, 0)).toEqual([0, 0]);
    expect(barShares(0, 8)).toEqual([0, 100]);
  });
});

describe('periodWindows', () => {
  it('el periodo previo termina donde empieza el actual', () => {
    const now = new Date('2026-10-16T12:00:00Z');
    const w = periodWindows(now, 7);
    expect(w.current.to).toBe(now);
    expect(w.current.from.toISOString()).toBe('2026-10-09T12:00:00.000Z');
    expect(w.previous.to.getTime()).toBe(w.current.from.getTime());
    expect(w.previous.from.toISOString()).toBe('2026-10-02T12:00:00.000Z');
  });
});

describe('dayBounds', () => {
  it('usa el día local de la zona (Caracas, UTC−4)', () => {
    const { start, end } = dayBounds(new Date('2026-10-16T15:30:00Z'), 'America/Caracas');
    expect(start.toISOString()).toBe('2026-10-16T04:00:00.000Z');
    expect(end.toISOString()).toBe('2026-10-17T04:00:00.000Z');
  });

  it('cerca de medianoche UTC todavía es el día anterior en Caracas', () => {
    const { start, end } = dayBounds(new Date('2026-10-16T03:00:00Z'), 'America/Caracas');
    expect(start.toISOString()).toBe('2026-10-15T04:00:00.000Z');
    expect(end.toISOString()).toBe('2026-10-16T04:00:00.000Z');
  });

  it('una zona inválida cae a Caracas', () => {
    expect(safeTimezone('No/Existe')).toBe('America/Caracas');
    const a = dayBounds(new Date('2026-10-16T15:30:00Z'), 'No/Existe');
    expect(a.start.toISOString()).toBe('2026-10-16T04:00:00.000Z');
  });

  it('el día dura 24 h en una zona sin cambio de horario', () => {
    const { start, end } = dayBounds(new Date('2026-03-10T10:00:00Z'), 'America/Bogota');
    expect(end.getTime() - start.getTime()).toBe(86_400_000);
  });
});

describe('textos', () => {
  it('saludo según la hora', () => {
    expect(greetingFor(3)).toBe('Buenas noches');
    expect(greetingFor(9)).toBe('Buenos días');
    expect(greetingFor(15)).toBe('Buenas tardes');
    expect(greetingFor(21)).toBe('Buenas noches');
  });

  it('firstName toma el primer nombre', () => {
    expect(firstName('  Reiner Ramos ')).toBe('Reiner');
    expect(firstName(null)).toBe('');
  });

  it('countLabel marca el tope de lectura', () => {
    expect(countLabel(12, false)).toBe('12');
    expect(countLabel(100, true)).toBe('100+');
  });

  it('todayHeadline resume lo que pide atención', () => {
    expect(todayHeadline(undefined)).toBeNull();
    expect(todayHeadline(emptyToday({ appointments: list(0), tasks: { ...list(0), overdue: 0 } }))).toBe('Todo al día: nada urgente para hoy.');
    expect(todayHeadline(emptyToday({ appointments: list(1) }))).toBe('Hoy tienes 1 cita.');
    expect(
      todayHeadline(emptyToday({ appointments: list(2), tasks: { ...list(3), overdue: 1 }, unanswered: list(1), payments: list(4) })),
    ).toBe('Hoy tienes 2 citas, 3 tareas, 1 conversación sin responder y 4 pagos por revisar.');
  });

  it('relativeTime y formatClock', () => {
    const now = new Date('2026-10-16T12:00:00Z');
    expect(relativeTime('2026-10-16T11:59:30Z', now)).toBe('ahora');
    expect(relativeTime('2026-10-16T11:25:00Z', now)).toBe('hace 35 min');
    expect(relativeTime('2026-10-16T07:00:00Z', now)).toBe('hace 5 h');
    expect(relativeTime('2026-10-15T09:00:00Z', now)).toBe('ayer');
    expect(relativeTime('2026-10-11T12:00:00Z', now)).toBe('hace 5 d');
    expect(formatClock('2026-10-16T14:30:00Z', 'America/Caracas')).toBe('10:30');
  });
});

describe('describeActivity', () => {
  it('traduce acciones conocidas y concuerda el género', () => {
    expect(describeActivity('content.publish.instagram.failed', 'content')).toMatchObject({ tone: 'danger', href: '/automatizacion' });
    expect(describeActivity('payment.created', 'payment')).toMatchObject({ label: 'Pago creado', href: '/pagos' });
    expect(describeActivity('room.deleted', 'room').label).toBe('Habitación eliminada');
    expect(describeActivity('booking.created', 'booking').label).toBe('Reserva creada');
  });

  it('acciones desconocidas no rompen', () => {
    expect(describeActivity('algo.raro', 'cosa')).toEqual({ label: 'Actividad registrada', tone: 'info', href: null });
  });
});
