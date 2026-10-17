import { describe, expect, it } from 'vitest';
import {
  appendToDraft, dayLabel, filterContacts, groupByDay, initials, previewOf, primaryConversation,
  statusMeta, summarize, timeAgo, toneIndex, unreadOf,
} from './conv-model';
import type { Contact, Conversation, Message } from './conv-types';

function conv(over: Partial<Conversation> & { id: string }): Conversation {
  return { channel: 'manual', status: 'open', unreadCount: 0, lastMessageAt: null, createdAt: null, messages: [], ...over };
}
function contact(over: Partial<Contact> & { id: string; name: string }): Contact {
  return { email: null, phone: null, source: null, tags: [], conversations: [], ...over };
}
function msg(id: string, createdAt: string, over: Partial<Message> = {}): Message {
  return { id, body: id, direction: 'out', sender: 'agent', createdAt, ...over };
}

describe('timeAgo', () => {
  const now = Date.parse('2026-10-17T12:00:00Z');
  it('formatea ahora, minutos, horas y días', () => {
    expect(timeAgo('2026-10-17T11:59:40Z', now)).toBe('ahora');
    expect(timeAgo('2026-10-17T11:15:00Z', now)).toBe('45m');
    expect(timeAgo('2026-10-17T07:00:00Z', now)).toBe('5h');
    expect(timeAgo('2026-10-14T12:00:00Z', now)).toBe('3d');
  });
  it('devuelve vacío sin fecha o con fecha inválida', () => {
    expect(timeAgo(null, now)).toBe('');
    expect(timeAgo('no-es-fecha', now)).toBe('');
  });
});

describe('primaryConversation', () => {
  it('devuelve null sin conversaciones', () => {
    expect(primaryConversation([])).toBeNull();
  });
  it('prefiere la que tiene mensajes más recientes, no la primera del arreglo', () => {
    const old = conv({ id: 'old', lastMessageAt: '2026-10-01T10:00:00Z' });
    const fresh = conv({ id: 'fresh', lastMessageAt: '2026-10-15T10:00:00Z' });
    expect(primaryConversation([old, fresh])?.id).toBe('fresh');
    expect(primaryConversation([fresh, old])?.id).toBe('fresh');
  });
  it('una conversación con mensajes gana a otra vacía', () => {
    const empty = conv({ id: 'empty', createdAt: '2026-10-16T10:00:00Z' });
    const used = conv({ id: 'used', createdAt: '2026-10-01T10:00:00Z', lastMessageAt: '2026-10-02T10:00:00Z' });
    expect(primaryConversation([used, empty])?.id).toBe('used');
    expect(primaryConversation([empty, used])?.id).toBe('used');
  });
  it('sin mensajes en ninguna, gana la creada más tarde', () => {
    const a = conv({ id: 'a', createdAt: '2026-10-01T10:00:00Z' });
    const b = conv({ id: 'b', createdAt: '2026-10-05T10:00:00Z' });
    expect(primaryConversation([a, b])?.id).toBe('b');
    expect(primaryConversation([b, a])?.id).toBe('b');
  });
});

describe('filterContacts', () => {
  const list = [
    contact({ id: '1', name: 'José Pérez', email: 'jose@correo.com', phone: '+58 424 226 5547', conversations: [conv({ id: 'c1', unreadCount: 2 })] }),
    contact({ id: '2', name: 'Ana Gómez', conversations: [conv({ id: 'c2' })] }),
  ];
  it('busca sin tildes ni mayúsculas', () => {
    expect(filterContacts(list, 'jose', false).map((c) => c.id)).toEqual(['1']);
    expect(filterContacts(list, 'GOMEZ', false).map((c) => c.id)).toEqual(['2']);
  });
  it('busca por correo y por teléfono (solo dígitos)', () => {
    expect(filterContacts(list, '@correo', false).map((c) => c.id)).toEqual(['1']);
    expect(filterContacts(list, '4242265547', false).map((c) => c.id)).toEqual(['1']);
  });
  it('no confunde dígitos cortos con teléfonos', () => {
    expect(filterContacts(list, '58', false)).toEqual([]);
  });
  it('filtra solo no leídas', () => {
    expect(filterContacts(list, '', true).map((c) => c.id)).toEqual(['1']);
  });
  it('sin consulta devuelve todo', () => {
    expect(filterContacts(list, '  ', false)).toHaveLength(2);
  });
});

describe('avatar y estado', () => {
  it('saca iniciales de hasta dos palabras', () => {
    expect(initials('ana gómez ruiz')).toBe('AG');
    expect(initials('  luis ')).toBe('L');
    expect(initials('')).toBe('?');
  });
  it('el tono es estable y está en rango', () => {
    expect(toneIndex('Ana')).toBe(toneIndex('Ana'));
    for (const n of ['Ana', 'Luis', 'Zoé', '😀 Emoji', '']) {
      const t = toneIndex(n);
      expect(t).toBeGreaterThanOrEqual(0);
      expect(t).toBeLessThan(5);
    }
  });
  it('traduce el estado de la conversación', () => {
    expect(statusMeta('open')).toEqual({ label: 'Abierta', tone: 'ok' });
    expect(statusMeta('pending').tone).toBe('warn');
    expect(statusMeta('closed').label).toBe('Resuelta');
    expect(statusMeta('raro').label).toBe('Abierta');
  });
});

describe('previewOf, unreadOf y summarize', () => {
  const withMsg = contact({
    id: '1', name: 'A',
    conversations: [conv({ id: 'c', unreadCount: 3, status: 'pending', messages: [msg('m', '2026-10-17T10:00:00Z', { body: 'Hola\n  mundo', direction: 'in' })] })],
  });
  it('compacta el último mensaje e indica si lo envió el equipo', () => {
    expect(previewOf(withMsg)).toEqual({ text: 'Hola mundo', outbound: false });
    expect(previewOf(contact({ id: '2', name: 'B' })).text).toBe('Sin mensajes todavía');
  });
  it('cuenta no leídas y estados', () => {
    expect(unreadOf(withMsg)).toBe(3);
    const closed = contact({ id: '3', name: 'C', conversations: [conv({ id: 'x', status: 'closed' })] });
    const open = contact({ id: '4', name: 'D', conversations: [conv({ id: 'y', unreadCount: 1 })] });
    const none = contact({ id: '5', name: 'E' });
    expect(summarize([withMsg, closed, open, none])).toEqual({ total: 4, open: 1, pending: 1, closed: 1, unread: 4 });
  });
});

describe('groupByDay', () => {
  const now = new Date(2026, 9, 17, 12, 0, 0);
  it('separa por día local con etiquetas Hoy y Ayer', () => {
    const groups = groupByDay(
      [msg('a', new Date(2026, 9, 15, 9).toISOString()), msg('b', new Date(2026, 9, 16, 9).toISOString()), msg('c', new Date(2026, 9, 17, 8).toISOString()), msg('d', new Date(2026, 9, 17, 9).toISOString())],
      now,
    );
    expect(groups.map((g) => g.label)).toEqual([dayLabel(new Date(2026, 9, 15), now), 'Ayer', 'Hoy']);
    expect(groups[2]?.items.map((m) => m.id)).toEqual(['c', 'd']);
  });
  it('agrupa mensajes sin fecha válida aparte', () => {
    const groups = groupByDay([msg('x', 'basura')], now);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.label).toBe('Sin fecha');
  });
});

describe('appendToDraft', () => {
  it('une con un espacio o reemplaza un borrador vacío', () => {
    expect(appendToDraft('', 'Hola')).toBe('Hola');
    expect(appendToDraft('   ', 'Hola')).toBe('Hola');
    expect(appendToDraft('Buen día ', 'Hola')).toBe('Buen día Hola');
  });
});
