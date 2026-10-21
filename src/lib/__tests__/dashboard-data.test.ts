import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  settings: { findUnique: vi.fn() },
  appointment: { findMany: vi.fn(), count: vi.fn() },
  contactTask: { findMany: vi.fn() },
  conversation: { findMany: vi.fn(), count: vi.fn() },
  payment: { findMany: vi.fn(), count: vi.fn() },
  scheduledPost: { findMany: vi.fn(), groupBy: vi.fn(), findFirst: vi.fn(), count: vi.fn() },
  contact: { count: vi.fn() },
  campaign: { count: vi.fn() },
  workflow: { findMany: vi.fn() },
  auditEvent: { findMany: vi.fn() },
}));
vi.mock('../db', () => ({ prisma: db }));

import { buildDashboardSummary, invalidateDashboard, READ_CAP } from '../dashboard-data';

const NOW = new Date('2026-10-16T15:00:00Z'); // 11:00 en Caracas
const me = { displayName: 'Reiner Ramos', workspaceName: 'RAI Agency' };

function seed() {
  for (const model of Object.values(db)) for (const fn of Object.values(model)) (fn as ReturnType<typeof vi.fn>).mockReset();
  db.settings.findUnique.mockResolvedValue(null);
  db.appointment.findMany.mockResolvedValue([
    { id: 'ap1', title: 'Consulta', startTime: new Date('2026-10-16T14:00:00Z'), contact: { name: 'Ana' } },
    { id: 'ap2', title: 'Revisión', startTime: new Date('2026-10-16T18:00:00Z'), contact: null },
  ]);
  db.contactTask.findMany.mockResolvedValue([
    { id: 't1', title: 'Llamar', dueAt: new Date('2026-10-14T12:00:00Z'), contact: { name: 'Luis' } },
    { id: 't2', title: 'Enviar propuesta', dueAt: new Date('2026-10-16T20:00:00Z'), contact: { name: 'Eva' } },
  ]);
  db.conversation.findMany.mockResolvedValue([
    { id: 'c1', channel: 'whatsapp', unreadCount: 2, lastMessageAt: new Date('2026-10-16T14:50:00Z'), contact: { name: 'Marta' } },
  ]);
  db.payment.findMany.mockResolvedValue([{ id: 'p1', reference: 'PAY-ABC123', amountCents: 5000, currency: 'USD' }]);
  db.scheduledPost.findMany.mockResolvedValue([
    { id: 'sp1', dayNumber: 3, scheduledAt: new Date('2026-10-16T22:00:00Z'), status: 'scheduled' },
  ]);
  db.scheduledPost.groupBy.mockResolvedValue([
    { status: 'scheduled', _count: { _all: 4 } },
    { status: 'published', _count: { _all: 9 } },
  ]);
  db.scheduledPost.findFirst.mockResolvedValue({ dayNumber: 3, scheduledAt: new Date('2026-10-16T22:00:00Z'), timezone: 'America/Caracas' });
  db.scheduledPost.count.mockResolvedValue(2);
  for (const fn of [db.appointment.count, db.conversation.count, db.payment.count, db.contact.count, db.campaign.count]) fn.mockResolvedValue(6);
  db.workflow.findMany.mockResolvedValue([
    { status: 'active', runsCount: 10 },
    { status: 'draft', runsCount: 0 },
  ]);
  db.auditEvent.findMany.mockResolvedValue([{ id: 'a1', action: 'payment.created', entityType: 'payment', createdAt: new Date('2026-10-16T14:00:00Z') }]);
}

let n = 0;
const ws = () => `ws-${++n}`;

describe('buildDashboardSummary', () => {
  beforeEach(seed);

  it('admin: ve todas las secciones con datos coherentes', async () => {
    const s = await buildDashboardSummary({ workspaceId: ws(), role: 'admin', days: 7, me, now: NOW });
    expect(s.days).toBe(7);
    expect(s.me).toEqual({ displayName: 'Reiner Ramos', workspaceName: 'RAI Agency', role: 'admin' });
    expect(s.today.tz).toBe('America/Caracas');
    expect(s.today.appointments).toMatchObject({ count: 2, more: false });
    expect(s.today.appointments?.items[1].contactName).toBeNull();
    expect(s.today.tasks).toMatchObject({ count: 2, overdue: 1 });
    expect(s.today.tasks?.items[0]).toMatchObject({ overdue: true, contactName: 'Luis' });
    expect(s.today.unanswered?.items[0]).toMatchObject({ unread: 2, channel: 'whatsapp' });
    expect(s.today.payments?.items[0].reference).toBe('PAY-ABC123');
    expect(s.today.posts?.count).toBe(1);
    expect(s.kpis.map((k) => k.id).sort()).toEqual(['appointments', 'campaigns', 'contacts', 'conversations', 'payments', 'posts']);
    expect(s.kpis.find((k) => k.id === 'contacts')).toEqual({ id: 'contacts', current: 6, previous: 6 });
    expect(s.instagram).toMatchObject({ available: true, scheduled: 4, published: 9, failed: 0, mode: 'simulated' });
    expect(s.automation).toEqual({ active: 1, total: 2, runs: 10 });
    expect(s.activity).toHaveLength(1);
  });

  it('agente: sin pagos ni actividad (su rol no los ve)', async () => {
    const s = await buildDashboardSummary({ workspaceId: ws(), role: 'agente', days: 7, me, now: NOW });
    expect(s.today.payments).toBeNull();
    expect(s.activity).toBeNull();
    expect(s.kpis.some((k) => k.id === 'payments')).toBe(false);
    expect(s.today.appointments).not.toBeNull();
    expect(db.payment.findMany).not.toHaveBeenCalled();
    expect(db.auditEvent.findMany).not.toHaveBeenCalled();
  });

  it('viewer: solo lectura, sin Instagram ni campañas', async () => {
    const s = await buildDashboardSummary({ workspaceId: ws(), role: 'viewer', days: 30, me, now: NOW });
    expect(s.days).toBe(30);
    expect(s.today.posts).toBeNull();
    expect(s.instagram).toBeNull();
    expect(s.kpis.some((k) => k.id === 'campaigns' || k.id === 'posts')).toBe(false);
    expect(db.scheduledPost.groupBy).not.toHaveBeenCalled();
  });

  it('todas las consultas llevan el workspace de la sesión', async () => {
    const id = ws();
    await buildDashboardSummary({ workspaceId: id, role: 'admin', days: 7, me, now: NOW });
    expect(db.appointment.findMany.mock.calls[0][0].where.workspaceId).toBe(id);
    expect(db.contactTask.findMany.mock.calls[0][0].where.contact.workspaceId).toBe(id);
    expect(db.conversation.findMany.mock.calls[0][0].where.contact.workspaceId).toBe(id);
    expect(db.payment.findMany.mock.calls[0][0].where.workspaceId).toBe(id);
    expect(db.scheduledPost.findMany.mock.calls[0][0].where.workspaceId).toBe(id);
    expect(db.contact.count.mock.calls.every(([a]) => a.where.workspaceId === id)).toBe(true);
    expect(db.workflow.findMany.mock.calls[0][0].where.workspaceId).toBe(id);
    expect(db.auditEvent.findMany.mock.calls[0][0].where.workspaceId).toBe(id);
  });

  it('usa el día local de Caracas y la zona configurada del workspace', async () => {
    const id = ws();
    db.settings.findUnique.mockResolvedValue({ contentPlannerConfig: { timezone: 'America/Bogota' } });
    const s = await buildDashboardSummary({ workspaceId: id, role: 'admin', days: 7, me, now: NOW });
    expect(s.today.tz).toBe('America/Bogota');
    const range = db.appointment.findMany.mock.calls[0][0].where.startTime;
    expect(range.gte.toISOString()).toBe('2026-10-16T05:00:00.000Z');
    expect(range.lt.toISOString()).toBe('2026-10-17T05:00:00.000Z');
  });

  it('marca «más» cuando se alcanza el tope de lectura', async () => {
    db.appointment.findMany.mockResolvedValue(
      Array.from({ length: READ_CAP.appointments }, (_, i) => ({ id: `a${i}`, title: 'x', startTime: NOW, contact: null })),
    );
    const s = await buildDashboardSummary({ workspaceId: ws(), role: 'admin', days: 7, me, now: NOW });
    expect(s.today.appointments).toMatchObject({ count: READ_CAP.appointments, more: true });
    expect(s.today.appointments?.items).toHaveLength(3);
  });

  it('una sección que falla queda en null sin tumbar las demás', async () => {
    db.payment.findMany.mockRejectedValue(new Error('boom'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const s = await buildDashboardSummary({ workspaceId: ws(), role: 'admin', days: 7, me, now: NOW });
    expect(s.today.payments).toBeNull();
    expect(s.today.appointments).not.toBeNull();
    warn.mockRestore();
  });

  it('tabla ScheduledPost ausente: Instagram no disponible, sin ruido', async () => {
    const missing = Object.assign(new Error('missing'), { code: 'P2021' });
    db.scheduledPost.groupBy.mockRejectedValue(missing);
    db.scheduledPost.findMany.mockRejectedValue(missing);
    db.scheduledPost.count.mockRejectedValue(missing);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const s = await buildDashboardSummary({ workspaceId: ws(), role: 'admin', days: 7, me, now: NOW });
    expect(s.instagram).toMatchObject({ available: false, scheduled: 0 });
    expect(s.today.posts).toBeNull();
    expect(s.kpis.some((k) => k.id === 'posts')).toBe(false);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('caché de 10 s por workspace y rol; invalidateDashboard la descarta', async () => {
    const id = ws();
    await buildDashboardSummary({ workspaceId: id, role: 'admin', days: 7, me, now: NOW });
    const calls = db.appointment.findMany.mock.calls.length;
    await buildDashboardSummary({ workspaceId: id, role: 'admin', days: 7, me, now: NOW });
    expect(db.appointment.findMany.mock.calls.length).toBe(calls);

    // otro periodo reutiliza «Hoy» y solo recalcula los indicadores
    const contactCalls = db.contact.count.mock.calls.length;
    await buildDashboardSummary({ workspaceId: id, role: 'admin', days: 30, me, now: NOW });
    expect(db.appointment.findMany.mock.calls.length).toBe(calls);
    expect(db.contact.count.mock.calls.length).toBe(contactCalls + 2);

    invalidateDashboard(id);
    await buildDashboardSummary({ workspaceId: id, role: 'admin', days: 7, me, now: NOW });
    expect(db.appointment.findMany.mock.calls.length).toBe(calls + 1);
  });

  it('peticiones simultáneas comparten la misma consulta', async () => {
    const id = ws();
    await Promise.all([
      buildDashboardSummary({ workspaceId: id, role: 'gerente', days: 7, me, now: NOW }),
      buildDashboardSummary({ workspaceId: id, role: 'gerente', days: 7, me, now: NOW }),
    ]);
    expect(db.appointment.findMany).toHaveBeenCalledTimes(1);
    expect(db.contactTask.findMany).toHaveBeenCalledTimes(1);
  });
});
