import { describe, expect, it, vi } from 'vitest';
import { publishPostNow, runDuePosts, type PostRow, type RunnerDb, type RunnerDeps } from '../publish-runner';
import { NonRetryableError, SimulatedPublisher, type IgPublisher } from '../instagram-publisher';

const NOW = new Date('2026-10-20T13:00:00Z');

function makeDb(rows: PostRow[]) {
  const matches = (r: PostRow, w: Record<string, unknown>): boolean =>
    Object.entries(w).every(([k, v]) => {
      const val = (r as unknown as Record<string, unknown>)[k];
      if (v && typeof v === 'object' && !(v instanceof Date)) {
        const o = v as Record<string, unknown>;
        if ('in' in o) return (o.in as unknown[]).includes(val);
        if ('lte' in o) return (val as Date).getTime() <= (o.lte as Date).getTime();
        if ('lt' in o) return val != null && (val as Date).getTime() < (o.lt as Date).getTime();
      }
      return val === v;
    });
  const apply = (r: PostRow, data: Record<string, unknown>) => {
    for (const [k, v] of Object.entries(data)) {
      const rec = r as unknown as Record<string, unknown>;
      if (v && typeof v === 'object' && !(v instanceof Date) && 'increment' in (v as object)) rec[k] = (rec[k] as number) + (v as { increment: number }).increment;
      else rec[k] = v;
    }
  };
  const db: RunnerDb = {
    scheduledPost: {
      findMany: async ({ where, take }) => rows.filter((r) => matches(r, where)).sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime()).slice(0, take ?? 999).map((r) => ({ ...r })), // copias, como Prisma
      findFirst: async ({ where }) => { const r = rows.find((x) => matches(x, where)); return r ? { ...r } : null; },
      updateMany: async ({ where, data }) => {
        const hit = rows.filter((r) => matches(r, where));
        hit.forEach((r) => apply(r, data));
        return { count: hit.length };
      },
      update: async ({ where, data }) => {
        const r = rows.find((x) => x.id === where.id)!;
        apply(r, data);
        return r;
      },
    },
  };
  return db;
}

const row = (o: Partial<PostRow> = {}): PostRow => ({
  id: 'p1', workspaceId: 'w1', caption: 'hola', mediaUrls: [], mediaType: 'image',
  scheduledAt: new Date('2026-10-20T12:00:00Z'), status: 'scheduled', attempts: 0,
  igContainerId: null, createdByUserId: 'u1', dayNumber: 1, lastError: null, ...o,
});

const deps = (db: RunnerDb, pub: IgPublisher = new SimulatedPublisher(), mode: 'simulated' | 'live' = 'simulated'): RunnerDeps => ({
  db, publisherFor: async () => pub, audit: vi.fn(async () => {}), mode, now: () => NOW,
});

describe('runDuePosts', () => {
  it('publica solo los vencidos y los marca published (simulado)', async () => {
    const rows = [row(), row({ id: 'p2', scheduledAt: new Date('2026-10-21T12:00:00Z') })];
    const s = await runDuePosts(deps(makeDb(rows)));
    expect(s).toMatchObject({ due: 1, claimed: 1, published: 1, failed: 0 });
    expect(rows[0]).toMatchObject({ status: 'published', simulated: true, igMediaId: 'sim_p1' });
    expect(rows[1].status).toBe('scheduled');
  });

  it('NO publica dos veces: dos ejecuciones concurrentes → una sola llamada al publicador', async () => {
    const rows = [row()];
    const calls: string[] = [];
    const pub: IgPublisher = { publish: async (i) => { calls.push(i.id); await new Promise((r) => setTimeout(r, 10)); return { igMediaId: 'm1', permalink: null, simulated: false }; } };
    const d = deps(makeDb(rows), pub);
    const [a, b] = await Promise.all([runDuePosts(d), runDuePosts(d)]);
    expect(calls).toEqual(['p1']);
    expect(a.claimed + b.claimed).toBe(1);
    expect(rows[0].status).toBe('published');
  });

  it('error reintentable → vuelve a scheduled con espera y attempts=1', async () => {
    const rows = [row()];
    const pub: IgPublisher = { publish: async () => { throw new Error('timeout de red'); } };
    const s = await runDuePosts(deps(makeDb(rows), pub));
    expect(s.retried).toBe(1);
    expect(rows[0].status).toBe('scheduled');
    expect(rows[0].attempts).toBe(1);
    expect(rows[0].scheduledAt.getTime()).toBe(NOW.getTime() + 5 * 60_000);
    expect(rows[0].lastError).toContain('timeout de red');
  });

  it('tras 3 intentos → failed, sin perder el post', async () => {
    const rows = [row({ attempts: 2 })];
    const pub: IgPublisher = { publish: async () => { throw new Error('boom'); } };
    const s = await runDuePosts(deps(makeDb(rows), pub));
    expect(s.failed).toBe(1);
    expect(rows[0]).toMatchObject({ status: 'failed', caption: 'hola' });
  });

  it('error no reintentable → failed al primer intento con mensaje legible', async () => {
    const rows = [row()];
    const pub: IgPublisher = { publish: async () => { throw new NonRetryableError('El token de Instagram expiró'); } };
    await runDuePosts(deps(makeDb(rows), pub));
    expect(rows[0]).toMatchObject({ status: 'failed', lastError: 'El token de Instagram expiró' });
  });

  it('reanuda sin duplicar: con igContainerId no crea otro contenedor', async () => {
    const rows = [row({ igContainerId: 'c_existente' })];
    const seen: Array<string | null> = [];
    const onContainer = vi.fn();
    const pub: IgPublisher = { publish: async (i, oc) => { seen.push(i.igContainerId); if (!i.igContainerId) await oc('nuevo'); onContainer(); return { igMediaId: 'm', permalink: null, simulated: false }; } };
    await runDuePosts(deps(makeDb(rows), pub));
    expect(seen).toEqual(['c_existente']);
  });

  it('guarda igContainerId apenas existe (antes de publicar)', async () => {
    const rows = [row()];
    const pub: IgPublisher = { publish: async (_i, oc) => { await oc('c1'); expect(rows[0].igContainerId).toBe('c1'); throw new Error('cae tras crear'); } };
    await runDuePosts(deps(makeDb(rows), pub));
    expect(rows[0].igContainerId).toBe('c1');
    expect(rows[0].status).toBe('scheduled');
  });

  it('modo live sin imágenes → failed (no publica a ciegas)', async () => {
    const rows = [row()];
    await runDuePosts(deps(makeDb(rows), new SimulatedPublisher(), 'live'));
    expect(rows[0].status).toBe('failed');
    expect(rows[0].lastError).toMatch(/URL pública/);
  });

  it('recupera locks vencidos (publishing hace >15 min → scheduled → publicado)', async () => {
    const rows = [row({ status: 'publishing' })];
    (rows[0] as unknown as { lockedAt: Date }).lockedAt = new Date(NOW.getTime() - 20 * 60_000);
    const s = await runDuePosts(deps(makeDb(rows)));
    expect(s.recovered).toBe(1);
    expect(rows[0].status).toBe('published');
  });

  it('no toca cancelled ni published', async () => {
    const rows = [row({ status: 'cancelled' }), row({ id: 'p2', status: 'published' })];
    const s = await runDuePosts(deps(makeDb(rows)));
    expect(s.due).toBe(0);
  });
});

describe('publishPostNow', () => {
  it('publica un post futuro de SU workspace', async () => {
    const rows = [row({ scheduledAt: new Date('2026-12-01T00:00:00Z') })];
    const r = await publishPostNow(deps(makeDb(rows)), 'w1', 'p1');
    expect(r).toMatchObject({ ok: true, status: 'published' });
  });
  it('aislamiento: un workspace no puede publicar el post de otro', async () => {
    const rows = [row()];
    const r = await publishPostNow(deps(makeDb(rows)), 'otro', 'p1');
    expect(r.ok).toBe(false);
    expect(r.status).toBe('not_found');
    expect(rows[0].status).toBe('scheduled');
  });
  it('no re-publica uno ya publicado', async () => {
    const rows = [row({ status: 'published' })];
    const r = await publishPostNow(deps(makeDb(rows)), 'w1', 'p1');
    expect(r.ok).toBe(false);
  });
  it('failed → reabre y publica', async () => {
    const rows = [row({ status: 'failed', attempts: 3, lastError: 'x' })];
    const r = await publishPostNow(deps(makeDb(rows)), 'w1', 'p1');
    expect(r.ok).toBe(true);
    expect(rows[0].attempts).toBe(1);
  });
});
