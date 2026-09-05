import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

/**
 * Bloque 1 — Prueba MÁS crítica de multi-tenancy.
 *
 * Objetivo: confirmar que un tenant (Workspace) NUNCA puede ver los datos
 * (Contact) de otro tenant.
 *
 * Por qué esta prueba NO pasa por HTTP con 2 "usuarios" distintos:
 * La auth actual (`src/lib/auth.ts`) usa `DEV_BYPASS_AUTH=true` en dev, que
 * SIEMPRE resuelve al mismo usuario dummy fijo (`dev-user-001`) vía
 * `getOrCreateWorkspace('dev-user-001')` (`src/lib/workspace.ts`). No hay
 * forma de loguearse como 2 usuarios/tenants distintos golpeando la API por
 * HTTP normal en este entorno. Por eso, este test:
 *   1. Prepara 2 Workspaces + 2 Contacts de prueba directo con Prisma
 *      (bypassa la capa HTTP para el setup de datos, ya que no controlamos
 *      la resolución de tenant desde ahí).
 *   2. Replica EXACTAMENTE la misma query que usa el endpoint real
 *      `GET /api/contacts` (ver `src/app/api/contacts/route.ts`:
 *      `prisma.contact.findMany({ where: { workspaceId: ws.id }, ... })`)
 *      contra cada uno de los 2 workspaceId de prueba, y verifica que los
 *      contactos de un tenant JAMÁS aparecen en los resultados del otro.
 *
 * Requiere una DB real conectada (`DATABASE_URL`). Si no está disponible en
 * este entorno/sandbox, el test se SALTA explícitamente vía `test.skip()`
 * con un mensaje claro — nunca debe quedar como un falso-positivo "pasando"
 * sin haber probado nada.
 */

const hasDatabaseUrl = !!process.env.DATABASE_URL;

test.describe('Aislamiento multi-tenant — Contact / Workspace', () => {
  test.skip(
    !hasDatabaseUrl,
    'Requiere DATABASE_URL apuntando a una base de datos real (Postgres). ' +
      'No se encontró process.env.DATABASE_URL en este entorno — el test de ' +
      'aislamiento multi-tenant NO se puede ejecutar de forma significativa ' +
      'sin una DB real conectada, así que se salta explícitamente en vez de ' +
      'dar un falso-positivo.'
  );

  let prisma: PrismaClient;

  // IDs de prueba, fijos y claramente marcados para poder limpiarlos incluso
  // si el afterAll no llega a correr (ej. proceso interrumpido a mitad).
  const USER_A_ID = 'test-user-tenant-a';
  const USER_B_ID = 'test-user-tenant-b';
  const WORKSPACE_A_ID = 'test-workspace-a-tenant-isolation';
  const WORKSPACE_B_ID = 'test-workspace-b-tenant-isolation';

  let contactAId: string;
  let contactBId: string;

  test.beforeAll(async () => {
    if (!hasDatabaseUrl) return;

    prisma = new PrismaClient();

    // Limpieza defensiva por si quedó basura de una corrida anterior fallida.
    await prisma.contact.deleteMany({
      where: { workspaceId: { in: [WORKSPACE_A_ID, WORKSPACE_B_ID] } },
    });
    await prisma.workspace.deleteMany({
      where: { id: { in: [WORKSPACE_A_ID, WORKSPACE_B_ID] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [USER_A_ID, USER_B_ID] } },
    });

    // 2 Users de prueba (Workspace.ownerId es FK a User).
    await prisma.user.create({
      data: { id: USER_A_ID, email: 'test-tenant-a@tenant-isolation.test' },
    });
    await prisma.user.create({
      data: { id: USER_B_ID, email: 'test-tenant-b@tenant-isolation.test' },
    });

    // 2 Workspaces de prueba (el tenant real del sistema).
    const workspaceA = await prisma.workspace.create({
      data: { id: WORKSPACE_A_ID, ownerId: USER_A_ID, name: 'TEST Workspace A (tenant isolation)' },
    });
    const workspaceB = await prisma.workspace.create({
      data: { id: WORKSPACE_B_ID, ownerId: USER_B_ID, name: 'TEST Workspace B (tenant isolation)' },
    });

    // 1 Contact en cada workspace, con nombres marcados como test.
    const contactA = await prisma.contact.create({
      data: {
        workspaceId: workspaceA.id,
        name: 'TEST_CONTACT_A',
        email: 'contact-a@tenant-isolation.test',
        source: 'manual',
      },
    });
    const contactB = await prisma.contact.create({
      data: {
        workspaceId: workspaceB.id,
        name: 'TEST_CONTACT_B',
        email: 'contact-b@tenant-isolation.test',
        source: 'manual',
      },
    });

    contactAId = contactA.id;
    contactBId = contactB.id;
  });

  test.afterAll(async () => {
    if (!hasDatabaseUrl || !prisma) return;

    await prisma.contact.deleteMany({
      where: { workspaceId: { in: [WORKSPACE_A_ID, WORKSPACE_B_ID] } },
    });
    await prisma.workspace.deleteMany({
      where: { id: { in: [WORKSPACE_A_ID, WORKSPACE_B_ID] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [USER_A_ID, USER_B_ID] } },
    });

    await prisma.$disconnect();
  });

  test('los contactos de un workspace nunca aparecen en la query de otro workspace', async () => {
    // Replica EXACTAMENTE la query de GET /api/contacts (src/app/api/contacts/route.ts):
    //   prisma.contact.findMany({ where: { workspaceId: ws.id }, orderBy: { updatedAt: 'desc' }, ... })
    const contactsForA = await prisma.contact.findMany({
      where: { workspaceId: WORKSPACE_A_ID },
      orderBy: { updatedAt: 'desc' },
    });
    const contactsForB = await prisma.contact.findMany({
      where: { workspaceId: WORKSPACE_B_ID },
      orderBy: { updatedAt: 'desc' },
    });

    // Workspace A solo ve su propio contacto, nunca el de B.
    expect(contactsForA.map((c) => c.id)).toContain(contactAId);
    expect(contactsForA.map((c) => c.id)).not.toContain(contactBId);
    expect(contactsForA.every((c) => c.workspaceId === WORKSPACE_A_ID)).toBe(true);
    expect(contactsForA.some((c) => c.name === 'TEST_CONTACT_B')).toBe(false);

    // Workspace B solo ve su propio contacto, nunca el de A.
    expect(contactsForB.map((c) => c.id)).toContain(contactBId);
    expect(contactsForB.map((c) => c.id)).not.toContain(contactAId);
    expect(contactsForB.every((c) => c.workspaceId === WORKSPACE_B_ID)).toBe(true);
    expect(contactsForB.some((c) => c.name === 'TEST_CONTACT_A')).toBe(false);
  });

  test('un findFirst por id ajeno respeta el filtro de workspaceId (no cross-tenant leak)', async () => {
    // Simula el patrón de las rutas [id] (ej. src/app/api/contacts/[id]/route.ts):
    // buscar por id + workspaceId del tenant autenticado. El contacto de B no
    // debe ser encontrable usando el workspaceId de A, y viceversa.
    const leakAttemptFromA = await prisma.contact.findFirst({
      where: { id: contactBId, workspaceId: WORKSPACE_A_ID },
    });
    expect(leakAttemptFromA).toBeNull();

    const leakAttemptFromB = await prisma.contact.findFirst({
      where: { id: contactAId, workspaceId: WORKSPACE_B_ID },
    });
    expect(leakAttemptFromB).toBeNull();
  });
});
