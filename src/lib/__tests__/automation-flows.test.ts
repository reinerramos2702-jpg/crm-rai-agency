import { describe, expect, it } from 'vitest';
import { countFlowsByStatus, filterFlows, isNewFlowShortcut, lastRunBadge, matchesFlowQuery } from '../automation-flows';

const flows = [
  { id: '1', name: 'Bienvenida a nuevo lead', description: null, status: 'active', folderId: 'f1', trigger: { type: 'contact.created' } },
  { id: '2', name: 'Recordatorio de cita', description: 'Aviso previo', status: 'paused', folderId: null, trigger: { type: 'appointment.upcoming' } },
  { id: '3', name: 'Reactivación', description: null, status: 'draft', folderId: 'f1', trigger: { type: 'contact.inactive' } },
];

describe('filterFlows', () => {
  it('filtra por estado, carpeta y texto sin tildes', () => {
    expect(filterFlows(flows, { query: '', folderId: 'all', status: 'todos' })).toHaveLength(3);
    expect(filterFlows(flows, { query: '', folderId: 'f1', status: 'todos' }).map((f) => f.id)).toEqual(['1', '3']);
    expect(filterFlows(flows, { query: '', folderId: 'all', status: 'paused' }).map((f) => f.id)).toEqual(['2']);
    expect(filterFlows(flows, { query: 'reactivacion', folderId: 'all', status: 'todos' }).map((f) => f.id)).toEqual(['3']);
  });
  it('busca también por el nombre del disparador y la descripción', () => {
    expect(matchesFlowQuery(flows[0], 'nuevo contacto')).toBe(true);
    expect(matchesFlowQuery(flows[1], 'aviso')).toBe(true);
    expect(matchesFlowQuery(flows[1], 'zzz')).toBe(false);
  });
});

describe('countFlowsByStatus', () => {
  it('cuenta por estado respetando carpeta y búsqueda', () => {
    expect(countFlowsByStatus(flows, { query: '', folderId: 'all' })).toEqual({ todos: 3, active: 1, paused: 1, draft: 1 });
    expect(countFlowsByStatus(flows, { query: '', folderId: 'f1' })).toEqual({ todos: 2, active: 1, paused: 0, draft: 1 });
  });
});

describe('lastRunBadge', () => {
  it('traduce el estado y devuelve null si no hay', () => {
    expect(lastRunBadge('error')?.tone).toBe('danger');
    expect(lastRunBadge('success')?.label).toBe('Última: correcta');
    expect(lastRunBadge(null)).toBeNull();
    expect(lastRunBadge('raro')).toBeNull();
  });
});

describe('isNewFlowShortcut', () => {
  const base = { key: 'n', ctrlKey: false, metaKey: false, altKey: false };
  const el = (tagName: string, isContentEditable = false) => ({ tagName, isContentEditable }) as unknown as EventTarget;
  it('acepta N suelta fuera de campos', () => {
    expect(isNewFlowShortcut(base, el('DIV'), false)).toBe(true);
    expect(isNewFlowShortcut({ ...base, key: 'N' }, el('BODY'), false)).toBe(true);
  });
  it('lo ignora al escribir, con modificadores, repetido o con diálogo abierto', () => {
    expect(isNewFlowShortcut(base, el('INPUT'), false)).toBe(false);
    expect(isNewFlowShortcut(base, el('TEXTAREA'), false)).toBe(false);
    expect(isNewFlowShortcut(base, el('DIV', true), false)).toBe(false);
    expect(isNewFlowShortcut({ ...base, ctrlKey: true }, el('DIV'), false)).toBe(false);
    expect(isNewFlowShortcut({ ...base, repeat: true }, el('DIV'), false)).toBe(false);
    expect(isNewFlowShortcut(base, el('DIV'), true)).toBe(false);
    expect(isNewFlowShortcut({ ...base, key: 'm' }, el('DIV'), false)).toBe(false);
  });
});
