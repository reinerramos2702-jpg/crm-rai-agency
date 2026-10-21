import { afterEach, describe, expect, it, vi } from 'vitest';
import { bookingUrl, sendJson } from './calendar-api';
import { calendarTone, isAppointmentStatus, statusLabel, statusTone, typeLabel } from './calendar-types';

describe('bookingUrl', () => {
  it('arma el enlace público de reservas', () => {
    expect(bookingUrl('https://crm.example.com', 'consulta-1')).toBe('https://crm.example.com/book/consulta-1');
  });
  it('rechaza identificadores inseguros o vacíos', () => {
    expect(bookingUrl('https://crm.example.com', '../admin')).toBeNull();
    expect(bookingUrl('https://crm.example.com', 'a b')).toBeNull();
    expect(bookingUrl('https://crm.example.com', '<script>')).toBeNull();
    expect(bookingUrl('https://crm.example.com', null)).toBeNull();
    expect(bookingUrl('', 'consulta')).toBeNull();
  });
});

describe('sendJson', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('devuelve null cuando la respuesta es correcta', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) }));
    expect(await sendJson('/api/x', 'POST', { a: 1 })).toBeNull();
  });
  it('usa el mensaje del servidor y, si no hay, uno por código', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({ error: 'name es requerido' }) }));
    expect(await sendJson('/api/x', 'POST', {})).toBe('name es requerido');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => { throw new Error('sin cuerpo'); } }));
    expect(await sendJson('/api/x', 'DELETE')).toBe('Tu rol no permite esta acción.');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }));
    expect(await sendJson('/api/x', 'PATCH', {})).toBe('No se pudo completar la acción (error 500).');
  });
  it('un fallo de red no lanza', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    expect(await sendJson('/api/x', 'POST', {})).toMatch(/Sin conexión/);
  });
});

describe('catálogos', () => {
  it('etiquetas y tonos de estado', () => {
    expect(statusLabel('confirmed')).toBe('Confirmada');
    expect(statusLabel('no_show')).toBe('No asistió');
    expect(statusLabel('otro')).toBe('otro');
    expect(statusTone('cancelled')).toBe('danger');
    expect(statusTone('otro')).toBe('muted');
    expect(isAppointmentStatus('completed')).toBe(true);
    expect(isAppointmentStatus('x')).toBe(false);
    expect(typeLabel('colectivo')).toBe('Colectivo');
  });
  it('el color de un calendario es estable', () => {
    expect(calendarTone('abc123')).toBe(calendarTone('abc123'));
    expect(['gold', 'purple', 'ok', 'warn']).toContain(calendarTone('otro-id'));
  });
});
