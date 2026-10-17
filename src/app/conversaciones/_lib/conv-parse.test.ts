import { describe, expect, it } from 'vitest';
import {
  isRecord, parseContactDetail, parseContactsPayload, parseCreatedContactId, parseLinks, parseMessageResult,
  parseSettings, parseSnippets,
} from './conv-parse';

describe('parseContactsPayload', () => {
  it('rechaza lo que no cumple el contrato', () => {
    expect(parseContactsPayload(null)).toBeNull();
    expect(parseContactsPayload('<html>')).toBeNull();
    expect(parseContactsPayload({ error: 'x' })).toBeNull();
    expect(parseContactsPayload({ contacts: 'no' })).toBeNull();
  });
  it('acepta la lista vacía', () => {
    expect(parseContactsPayload({ contacts: [] })).toEqual([]);
  });
  it('descarta elementos inválidos y normaliza campos', () => {
    const out = parseContactsPayload({
      contacts: [
        null,
        { name: 'sin id' },
        {
          id: 'c1', name: '  ', email: 5, tags: ['vip', 3],
          conversations: [{ id: 'v1', unreadCount: -2, lastMessageAt: '2026-10-17T10:00:00Z', messages: [{ id: 'm1', body: 'hola', direction: 'in', sender: 'raro', createdAt: 'x' }, { body: 'sin id' }] }],
        },
      ],
    });
    expect(out).toHaveLength(1);
    const c = out?.[0];
    expect(c?.name).toBe('Sin nombre');
    expect(c?.email).toBeNull();
    expect(c?.tags).toEqual(['vip']);
    expect(c?.conversations[0]?.unreadCount).toBe(0);
    expect(c?.conversations[0]?.messages).toEqual([{ id: 'm1', body: 'hola', direction: 'in', sender: 'agent', createdAt: 'x' }]);
  });
});

describe('parseContactDetail', () => {
  it('lee notas y tareas', () => {
    const out = parseContactDetail({
      contact: {
        id: 'c1', name: 'Ana', conversations: [],
        notes: [{ id: 'n1', body: 'b', createdAt: 'd' }, { body: 'sin id' }],
        contactTasks: [{ id: 't1', title: 'Llamar', done: true, dueAt: null, createdAt: 'd' }],
      },
    });
    expect(out?.notes).toHaveLength(1);
    expect(out?.contactTasks[0]).toMatchObject({ id: 't1', done: true, dueAt: null });
  });
  it('devuelve null si falta el contacto', () => {
    expect(parseContactDetail({ contact: null })).toBeNull();
    expect(parseContactDetail({})).toBeNull();
  });
});

describe('otras respuestas', () => {
  it('snippets y enlaces', () => {
    expect(parseSnippets({ snippets: [{ id: 's', title: 't', body: 'b', createdAt: 'd' }] })).toHaveLength(1);
    expect(parseSnippets({})).toBeNull();
    expect(parseLinks({ links: [{ id: 'l', label: 'L', slug: 'abc', destination: 'https://x.co', clicks: 4, createdAt: 'd' }] })?.[0]?.clicks).toBe(4);
    expect(parseLinks({ links: 3 })).toBeNull();
  });
  it('configuración con y sin registro previo', () => {
    expect(parseSettings({ settings: null })).toEqual({ slaFirstResponseMins: '', slaOverdueMins: '', aiCountsAsResponse: false });
    expect(parseSettings({ settings: { slaFirstResponseMins: 30, slaOverdueMins: null, aiCountsAsResponse: true } })).toEqual({
      slaFirstResponseMins: '30', slaOverdueMins: '', aiCountsAsResponse: true,
    });
    expect(parseSettings(null)).toBeNull();
  });
  it('resultados de escritura', () => {
    expect(parseMessageResult({ message: { id: 'm', body: 'x', direction: 'out', sender: 'agent', createdAt: 'd' } })?.id).toBe('m');
    expect(parseMessageResult({ message: {} })).toBeNull();
    expect(parseCreatedContactId({ contact: { id: 'c9' } })).toBe('c9');
    expect(parseCreatedContactId({ contact: {} })).toBeNull();
  });
  it('isRecord distingue objetos de arreglos y null', () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord([])).toBe(false);
    expect(isRecord(null)).toBe(false);
  });
});
