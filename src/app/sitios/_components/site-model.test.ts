import { describe, expect, it } from 'vitest';
import {
  countBy, countRoomsByStatus, emptySiteForm, filterSites, formatLocation, summarize, telHref,
  toPayload, validateRoomForm, validateSiteForm, type Room, type Site,
} from './site-model';

function site(over: Partial<Site> & { id: string }): Site {
  return {
    name: 'Sede', slug: 'sede', type: 'hotel', city: null, country: null, address: null, capacity: 0,
    status: 'active', contactName: null, contactPhone: null,
    _count: { rooms: 0, bookings: 0, payments: 0 },
    ...over,
  };
}

const SITES: Site[] = [
  site({ id: '1', name: 'Hotel Muévete', city: 'La Guaira', type: 'hotel', status: 'active', _count: { rooms: 10, bookings: 4, payments: 1 } }),
  site({ id: '2', name: 'Café Quadro', city: 'Caracas', type: 'restaurant', status: 'maintenance', _count: { rooms: 0, bookings: 2, payments: 0 } }),
  site({ id: '3', name: 'Oficina Central', city: 'Caracas', type: 'office', status: 'closed' }),
];

describe('filterSites', () => {
  it('busca sin distinguir tildes ni mayúsculas', () => {
    expect(filterSites(SITES, { q: 'MUEVETE', type: '', status: '' }).map((s) => s.id)).toEqual(['1']);
    expect(filterSites(SITES, { q: 'cafe', type: '', status: '' }).map((s) => s.id)).toEqual(['2']);
  });
  it('combina búsqueda, tipo y estado', () => {
    expect(filterSites(SITES, { q: 'caracas', type: 'office', status: '' }).map((s) => s.id)).toEqual(['3']);
    expect(filterSites(SITES, { q: 'caracas', type: '', status: 'maintenance' }).map((s) => s.id)).toEqual(['2']);
  });
  it('omite un criterio para calcular los contadores de cada chip', () => {
    const f = { q: 'caracas', type: 'office', status: '' };
    expect(filterSites(SITES, f, 'type').map((s) => s.id)).toEqual(['2', '3']);
    expect(countBy(filterSites(SITES, f, 'type'), 'type')).toEqual({ restaurant: 1, office: 1 });
  });
});

describe('summarize', () => {
  it('suma estados, habitaciones y reservas', () => {
    expect(summarize(SITES)).toEqual({ total: 3, active: 1, maintenance: 1, closed: 1, rooms: 10, bookings: 6 });
  });
});

describe('utilidades de texto', () => {
  it('formatLocation ignora vacíos', () => {
    expect(formatLocation({ address: 'Calle 1', city: ' ', country: 'VE' })).toBe('Calle 1, VE');
  });
  it('telHref deja solo + y dígitos', () => {
    expect(telHref('+58 (412) 000-0000')).toBe('tel:+584120000000');
  });
});

describe('validateSiteForm', () => {
  it('exige nombre y acepta un formulario mínimo', () => {
    expect(validateSiteForm(emptySiteForm()).name).toBeDefined();
    expect(validateSiteForm({ ...emptySiteForm(), name: 'Sede Norte' })).toEqual({});
  });
  it('valida aforo, teléfono y correo', () => {
    const base = { ...emptySiteForm(), name: 'Sede' };
    expect(validateSiteForm({ ...base, capacity: '-3' }).capacity).toBeDefined();
    expect(validateSiteForm({ ...base, capacity: '2.5' }).capacity).toBeDefined();
    expect(validateSiteForm({ ...base, contactPhone: 'abc' }).contactPhone).toBeDefined();
    expect(validateSiteForm({ ...base, contactPhone: '+58 412 000 0000' }).contactPhone).toBeUndefined();
    expect(validateSiteForm({ ...base, contactEmail: 'sin-arroba' }).contactEmail).toBeDefined();
    expect(validateSiteForm({ ...base, contactEmail: 'a@b.com' }).contactEmail).toBeUndefined();
  });
  it('toPayload recorta textos y convierte el aforo en número', () => {
    const body = toPayload({ ...emptySiteForm(), name: '  Sede  ', capacity: '12' });
    expect(body.name).toBe('Sede');
    expect(body.capacity).toBe(12);
    expect(toPayload({ ...emptySiteForm(), name: 'x', capacity: '' }).capacity).toBe(0);
  });
});

describe('habitaciones', () => {
  const rooms: Room[] = [
    { id: 'a', number: '101', floor: null, status: 'available', notes: null, roomType: null },
    { id: 'b', number: '102', floor: null, status: 'occupied', notes: null, roomType: null },
    { id: 'c', number: '103', floor: null, status: 'available', notes: null, roomType: null },
  ];
  const form = { number: '', floor: '', roomTypeId: '', status: 'available', notes: '' };
  it('rechaza número vacío o repetido', () => {
    expect(validateRoomForm(form, rooms).number).toBeDefined();
    expect(validateRoomForm({ ...form, number: ' 101 ' }, rooms).number).toBeDefined();
    expect(validateRoomForm({ ...form, number: '104' }, rooms)).toEqual({});
  });
  it('cuenta por estado', () => {
    expect(countRoomsByStatus(rooms)).toEqual({ available: 2, occupied: 1 });
  });
});
