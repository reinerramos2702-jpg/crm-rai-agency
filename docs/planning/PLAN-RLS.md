# PLAN-RLS — Diseño de políticas Row Level Security (Fase 0, sub-fase 0.4)

> **Documento de plan. NINGÚN SQL de este documento se ejecuta en esta sesión.**
> Ejecución posterior, paso a paso, con Reiner en Plan Mode (ver Checklist §11).
> Insumo: `docs/AUDITORIA-SEGURIDAD-15SEP.md` (sub-fase 0.4) + lectura directa de
> `prisma/schema.prisma`, `src/lib/db.ts`, `src/lib/workspace.ts`, `src/lib/auth.ts`,
> `src/lib/roles.ts`, `src/lib/automations/engine.ts`, `src/workers/pipeline-worker.ts`,
> `src/app/api/public/booking/[slug]/route.ts`, `.env.example`, migraciones Prisma.

---

## 1. Objetivo y alcance

Cerrar el aislamiento multi-tenant a nivel de base de datos: hoy **cero RLS** y todo el
scoping depende de que cada query de aplicación incluya el filtro correcto. Este plan
define, para las **39 tablas** del schema:

1. El mecanismo de inyección del workspace activo en la sesión Postgres.
2. La plantilla de política por tabla (SELECT/INSERT/UPDATE/DELETE).
3. Los roles de conexión (app vs servicio) y la separación de URLs.
4. Default-deny, orden de habilitación, riesgos día 1, prueba y rollback.

**Corrección de cifras de la auditoría** (verificada contra `schema.prisma`): la
auditoría dice "22 modelos con `workspaceId` propio" y "13 sin él", pero sus propias
tablas listan 24 y 14 respectivamente. El conteo real es **24 directos** (incluye
`Workspace` y `Settings` nullable) + **14 transitivos** + `User` = **39**. Este plan usa
el conteo real.

---

## 2. Estado actual verificado (lectura de código)

| Hallazgo | Dónde | Implicancia para RLS |
|---|---|---|
| `DATABASE_URL` usa el usuario `postgres` de Supabase (superusuario) | `.env.example`, `.env.local` | **RLS NO aplica al superusuario** (BYPASSRLS implícito). Sin un rol de app dedicado, habilitar RLS no cambia nada y da falsa confianza. |
| Pooler en **transaction mode** (`:6543?pgmode=transaction`) | `.env.example` | `SET` de sesión se pierde entre transacciones (PgBouncer recicla la conexión y corre `DISCARD ALL`). Solo `SET LOCAL` dentro de una transacción es confiable. |
| `DIRECT_URL` existe (puerto 5432, conexión directa) | `schema.prisma` datasource | Disponible como alternativa, pero en serverless (Vercel) no se puede garantizar una conexión directa persistente por request. |
| `getRoleContext()` → `resolveActiveWorkspace()` → `ctx.workspace.id` | `src/lib/roles.ts`, `src/lib/workspace.ts` | Es el ÚNICO punto de resolución del workspace activo. El valor a inyectar sale de acá. |
| `isPlatformSuperAdmin(email)` decide por `SUPER_ADMIN_EMAILS` | `src/lib/auth.ts:69` | Las policies necesitan saber si el llamador es super admin → setting `app.is_super_admin`. |
| `getAuth()` hace `prisma.user.upsert` en cada request | `src/lib/auth.ts:110,143` | La policy de `User` (self) exige que `app.current_user_id` esté seteado **antes** del upsert → inyección en dos fases. |
| Cron `runDueWorkflows()`: queries globales sin `workspaceId` | `src/lib/automations/engine.ts:167,200` | Se rompe bajo RLS → debe correr con rol de servicio (BYPASSRLS). |
| Worker BullMQ: `findUnique` por ID del job, sin workspace | `src/workers/pipeline-worker.ts:23,26` | Ídem → rol de servicio. |
| `/api/public/booking/[slug]` es **anónimo** (sin auth ni workspace) | `src/app/api/public/booking/[slug]/route.ts` | Bajo RLS, `current_workspace_id()` = NULL → todas sus queries fallan. Requiere política pública acotada + scoping post-lookup. |
| 5 rutas usan `prisma.$transaction([...])` (forma array) | `calendar-groups`, `calendars/[id]`, `automations/[id]`, `automations/folders`, `contacts/[id]` | Abren una transacción en otra conexión del pool → se perdería el `SET LOCAL`. Hay que migrarlas a llamadas sobre `tx` dentro del scope. |
| `Settings.workspaceId` nullable con fila legacy `id='global'` | `schema.prisma:330` | La policy debe excluir NULLs (la fila legacy queda invisible salvo super admin — comportamiento deseado). |
| Migración `20260919120000_require_apikey_workspace_scope` **no aplicada** | `prisma/migrations/` | `ApiKey.workspaceId` pasa a requerido. Es prerequisito de la policy T0 de `ApiKey`. |

---

## 3. Decisión 1 — Mecanismo de inyección del workspace

### Opción elegida: **(a) `SET LOCAL` vía `set_config(..., true)` dentro de una transacción por request**

Cada request autenticado se envuelve en `prisma.$transaction(async (tx) => ...)`; al
inicio de la transacción se ejecuta `SELECT set_config('app.current_workspace_id', $1, true)`
(y las settings de identidad), y **todas** las queries del request corren sobre `tx`
(una sola conexión). Al commit/rollback el valor se descarta solo: cero fuga entre
requests concurrentes.

**Justificación (3 líneas):**
- **Elegida:** transacción interactiva por request con `set_config(..., true)` (equivalente a `SET LOCAL`): todas las queries del request usan la misma conexión y ven el mismo valor, y PgBouncer transaction-mode no puede romperlo porque la transacción entera vive en una sola conexión.
- **Descartadas:** (b) `SET`/`set_config(..., false)` persistente por conexión — el pooler recicla la conexión entre transacciones y ejecuta `DISCARD ALL`, así que el setting no sobrevive entre queries de un mismo request; usar `DIRECT_URL` para esto no es viable en serverless (no hay conexión persistente garantizada por request). (c) derivar el workspace del rol JWT — Prisma conecta con un único rol de conexión (no hay rol por usuario) y el workspace activo no está en el JWT sino en el header `X-Workspace-Id` resuelto por `resolveActiveWorkspace`.
- **Descartada (variante de implementación):** `prisma.$extends` query extension con AsyncLocalStorage — evitaría tocar las rutas, pero choca con las 5 rutas que usan `prisma.$transaction([...])` (transacción anidada en otra conexión) y es menos explícito/debuggeable. Se elige el wrapper explícito.

### Diseño del wrapper (implementación futura, especificada acá)

```ts
// src/lib/rls.ts (diseño)
export async function withWorkspaceScope<T>(
  req: NextRequest,
  handler: (ctx: RoleContext, tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    // FASE 1 — identidad (sin DB): verificar JWT puro
    const auth = await getAuthContextOnly(req);          // verifyJwt sin upsert
    if (!auth) throw new Response('Unauthorized', { status: 401 });
    await tx.$executeRaw`SELECT set_config('app.current_user_id', ${auth.userId}, true)`;
    await tx.$executeRaw`SELECT set_config('app.is_super_admin',
      ${isPlatformSuperAdmin(auth.email) ? 'true' : 'false'}, true)`;
    await syncUser(tx, auth);                             // upsert User — policy self ya lo permite

    // FASE 2 — workspace activo (queries sobre Workspace/WorkspaceMember ya pasan RLS)
    const workspace = await resolveActiveWorkspaceTx(tx, req, auth);
    await tx.$executeRaw`SELECT set_config('app.current_workspace_id', ${workspace.id}, true)`;
    const role = await getRoleTx(tx, auth, workspace);
    return handler({ auth, workspace, role }, tx);
  });
}
```

**Por qué dos fases:** `getAuth()` hace un `upsert` sobre `User`; la policy de `User`
(self) exige `app.current_user_id` seteado antes de ese upsert. La fase 1 verifica el
JWT sin tocar la DB (puro), setea identidad, y recién ahí sincroniza el usuario. La fase
2 resuelve el workspace (las policies de `Workspace`/`WorkspaceMember` funcionan con
`current_user_id` sin necesidad de `current_workspace_id`) y setea el workspace.

**Migración de rutas:** las ~100 rutas reemplazan su primer bloque
(`const ctx = await requireRole(req, ...)`) por `return withWorkspaceScope(req, async (ctx, tx) => {...})`
y usan `tx` en lugar de `prisma` dentro del handler. Es un refactor mecánico. Las 5 rutas
con `prisma.$transaction([...])` migran a llamadas secuenciales sobre `tx`.

**Settings inyectadas por request:**

| Setting | Valor | Uso en policies |
|---|---|---|
| `app.current_user_id` | `auth.userId` (del JWT) | `Workspace` (owner/member), `User` (self), `WorkspaceMember` (membresías propias) |
| `app.current_workspace_id` | `ctx.workspace.id` | Todas las policies T0/T1 |
| `app.is_super_admin` | `'true'`/`'false'` según `SUPER_ADMIN_EMAILS` | Cláusula `OR app.is_super_admin()` en todas las policies |

---

## 4. Decisión 2 — Super admin cross-tenant

`isPlatformSuperAdmin(email)` (env `SUPER_ADMIN_EMAILS`) decide quién es super admin.
El wrapper setea `app.is_super_admin = 'true'` para esos emails. **Toda policy** lleva la
cláusula `OR app.is_super_admin()`: el super admin ve todos los workspaces en todas las
tablas. Sin esa cláusula, un super admin solo vería su propio workspace (regresión
funcional del acceso cross-tenant que hoy tiene).

Para no repetir `current_setting(...)` en cada policy se definen **3 funciones helper**
(una sola vez, antes de las policies):

```sql
CREATE SCHEMA IF NOT EXISTS app;

CREATE OR REPLACE FUNCTION app.current_workspace_id() RETURNS text
LANGUAGE sql STABLE PARALLEL SAFE AS
$$ SELECT nullif(current_setting('app.current_workspace_id', true), '') $$;

CREATE OR REPLACE FUNCTION app.current_user_id() RETURNS text
LANGUAGE sql STABLE PARALLEL SAFE AS
$$ SELECT nullif(current_setting('app.current_user_id', true), '') $$;

CREATE OR REPLACE FUNCTION app.is_super_admin() RETURNS boolean
LANGUAGE sql STABLE PARALLEL SAFE AS
$$ SELECT current_setting('app.is_super_admin', true) = 'true' $$;
```

> `current_setting(nombre, true)` devuelve NULL si el setting no existe → policy evalúa
> a NULL → **denegado** (default-deny natural para sesiones sin scope, p.ej. requests
> anónimos o código que olvidó inyectar).

---

## 5. Roles de conexión y separación de URLs

Hoy todo corre con el superusuario `postgres` → RLS no aplica. Se crean **dos roles**:

| Rol | Atributos | Uso | URL |
|---|---|---|---|
| `crm_app` | `LOGIN`, **sin** `BYPASSRLS` | Aplicación (rutas API autenticadas) — respeta policies | `DATABASE_URL` + `DIRECT_URL` |
| `crm_service` | `LOGIN`, `BYPASSRLS` | Cron de automatizaciones, worker BullMQ, scripts de mantenimiento | `SERVICE_ROLE_DATABASE_URL` (nueva) |

**SQL de creación (enunciado — NO ejecutar en esta sesión; se ejecuta en el SQL editor
de Supabase como `postgres` durante la implementación):**

```sql
-- 1) Roles
CREATE ROLE crm_app LOGIN PASSWORD '<generar_password_fuerte>';
CREATE ROLE crm_service LOGIN PASSWORD '<generar_password_fuerte>' BYPASSRLS;

-- 2) Privilegios (aplicación)
GRANT USAGE ON SCHEMA public TO crm_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO crm_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO crm_app;

-- 3) Privilegios (servicio)
GRANT USAGE ON SCHEMA public TO crm_service;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO crm_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO crm_service;
```

> Nota: los roles nativos de Supabase (`anon`, `authenticated`, `service_role`) tienen
> grants explícitos y no se tocan. El `REVOKE FROM PUBLIC` (§7) no los afecta.

**Separación en `.env` (diseño):**

```dotenv
# App (respeta RLS)
DATABASE_URL="postgresql://crm_app:<pass>@aws-0-[region].pooler.supabase.com:6543/postgres?pgmode=transaction"
DIRECT_URL="postgresql://crm_app:<pass>@aws-0-[region].pooler.supabase.com:5432/postgres"
# Servicio (BYPASSRLS) — cron, worker, scripts
SERVICE_ROLE_DATABASE_URL="postgresql://crm_service:<pass>@aws-0-[region].pooler.supabase.com:6543/postgres?pgmode=transaction"
```

**`src/lib/db.ts` pasa a exportar dos clientes:**

```ts
export const prisma = /* client app: DATABASE_URL (sin BYPASSRLS) */;
export const servicePrisma = /* client servicio: SERVICE_ROLE_DATABASE_URL (BYPASSRLS) */;
```

`engine.ts::runDueWorkflows()` y `pipeline-worker.ts` importan `servicePrisma`.
`runWorkflowsForEvent()` (síncrono, llamado desde rutas autenticadas) **sigue con
`prisma`**: corre dentro del scope del request y filtra por `workspaceId` — RLS lo deja
pasar sin problema.

---

## 6. Políticas por tabla — plantillas y asignación de las 39 tablas

### Plantilla T0 — directa (`workspaceId` propio, requerido)

```sql
ALTER TABLE "Contact" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contact_select" ON "Contact" FOR SELECT
  USING ("workspaceId" = app.current_workspace_id() OR app.is_super_admin());

CREATE POLICY "contact_insert" ON "Contact" FOR INSERT
  WITH CHECK ("workspaceId" = app.current_workspace_id() OR app.is_super_admin());

CREATE POLICY "contact_update" ON "Contact" FOR UPDATE
  USING ("workspaceId" = app.current_workspace_id() OR app.is_super_admin())
  WITH CHECK ("workspaceId" = app.current_workspace_id() OR app.is_super_admin());

CREATE POLICY "contact_delete" ON "Contact" FOR DELETE
  USING ("workspaceId" = app.current_workspace_id() OR app.is_super_admin());
```

**Variante T0-Settings** (workspaceId nullable): agregar `"workspaceId" IS NOT NULL AND ...`
— la fila legacy `id='global'` queda invisible para la app y visible solo para super admin.

### Plantilla T1 — transitiva vía EXIST al padre (sin `workspaceId` propio)

**Execution → Campaign (1 salto):**

```sql
ALTER TABLE "Execution" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "execution_select" ON "Execution" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Campaign" c
      WHERE c.id = "Execution"."campaignId"
        AND (c."workspaceId" = app.current_workspace_id() OR app.is_super_admin())
    )
  );

CREATE POLICY "execution_insert" ON "Execution" FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Campaign" c
      WHERE c.id = "Execution"."campaignId"
        AND (c."workspaceId" = app.current_workspace_id() OR app.is_super_admin())
    )
  );

-- update: USING (mismo EXISTS) + WITH CHECK (mismo EXISTS)
-- delete: USING (mismo EXISTS)
```

**Task → Execution → Campaign (2 saltos):**

```sql
ALTER TABLE "Task" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_select" ON "Task" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Execution" e
      JOIN "Campaign" c ON c.id = e."campaignId"
      WHERE e.id = "Task"."executionId"
        AND (c."workspaceId" = app.current_workspace_id() OR app.is_super_admin())
    )
  );
-- insert/update/delete: mismo EXISTS en WITH CHECK / USING+WITH CHECK / USING
```

**Conversation → Contact (1 salto):**

```sql
ALTER TABLE "Conversation" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversation_select" ON "Conversation" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Contact" ct
      WHERE ct.id = "Conversation"."contactId"
        AND (ct."workspaceId" = app.current_workspace_id() OR app.is_super_admin())
    )
  );
-- insert/update/delete: mismo patrón
```

> **Importante:** las subqueries de las policies se evalúan bajo RLS también. Como el
> session tiene `current_workspace_id` seteado, las tablas padre con RLS habilitado
> responden correctamente. Por eso el orden de habilitación (§8) es hoja → raíz.

### Plantilla T2 — excepciones

**Workspace** (owner o miembro activo o super admin):

```sql
ALTER TABLE "Workspace" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_select" ON "Workspace" FOR SELECT
  USING (
    id = app.current_workspace_id()
    OR "ownerId" = app.current_user_id()
    OR EXISTS (
      SELECT 1 FROM "WorkspaceMember" m
      WHERE m."workspaceId" = "Workspace".id
        AND m."userId" = app.current_user_id()
        AND m.status = 'active'
    )
    OR app.is_super_admin()
  );

CREATE POLICY "workspace_insert" ON "Workspace" FOR INSERT
  WITH CHECK ("ownerId" = app.current_user_id() OR app.is_super_admin());

-- update/delete: USING (mismo que select)
```

**User** (self + super admin):

```sql
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_select" ON "User" FOR SELECT
  USING (id = app.current_user_id() OR app.is_super_admin());

CREATE POLICY "user_insert" ON "User" FOR INSERT
  WITH CHECK (id = app.current_user_id() OR app.is_super_admin());

CREATE POLICY "user_update" ON "User" FOR UPDATE
  USING (id = app.current_user_id() OR app.is_super_admin())
  WITH CHECK (id = app.current_user_id() OR app.is_super_admin());
```

**WorkspaceMember** (miembros del workspace + membresías propias):

```sql
CREATE POLICY "workspacemember_select" ON "WorkspaceMember" FOR SELECT
  USING (
    "workspaceId" = app.current_workspace_id()
    OR "userId" = app.current_user_id()      -- necesario para resolveActiveWorkspace
    OR app.is_super_admin()
  );
-- insert/update/delete: mismo patrón (WITH CHECK idéntico para insert/update)
```

> El `"userId" = app.current_user_id()` no es opcional: `resolveActiveWorkspace()` lee
> la membresía propia **antes** de tener resuelto el workspace (fase 2 del wrapper).

**AuditEvent** → plantilla T0 directa (`"workspaceId" = app.current_workspace_id() OR app.is_super_admin()`).

### Asignación completa — 39 tablas

**T0 directa (20):**

| Tabla | Nota |
|---|---|
| WorkspaceMetaConnection | 1:1 con Workspace |
| ContentGrid | |
| ApiKey | requiere migración `20260919120000` aplicada |
| Campaign | |
| Contact | |
| Snippet | |
| ActivationLink | |
| CalendarGroup | |
| CalendarResource | + política pública acotada para `/book` (§9) |
| Appointment | |
| WorkflowFolder | |
| Workflow | |
| AIAgent | |
| KnowledgeBase | |
| Guest | |
| Site | |
| RoomType | |
| Room | |
| Booking | |
| Payment | |

**T0-Settings (1):** `Settings` (con `"workspaceId" IS NOT NULL AND ...`).

**T2 (4):** `Workspace`, `User`, `WorkspaceMember`, `AuditEvent` (T0).

**T1 transitiva (14) — cadenas:**

| Tabla | Cadena hasta raíz workspace | Saltos |
|---|---|---|
| ContentGridAsset | `gridId` → ContentGrid.`workspaceId` | 1 |
| Execution | `campaignId` → Campaign.`workspaceId` | 1 |
| Task | `executionId` → Execution → `campaignId` → Campaign.`workspaceId` | 2 |
| Asset | `taskId` → Task → Execution → Campaign.`workspaceId` | 3 |
| Event | `executionId` → Execution → Campaign.`workspaceId` | 2 |
| InventoryItem | `campaignId` → Campaign.`workspaceId` | 1 |
| Conversation | `contactId` → Contact.`workspaceId` | 1 |
| Message | `conversationId` → Conversation → `contactId` → Contact.`workspaceId` | 2 |
| Note | `contactId` → Contact.`workspaceId` | 1 |
| ContactTask | `contactId` → Contact.`workspaceId` | 1 |
| WorkflowRun | `workflowId` → Workflow.`workspaceId` | 1 |
| KnowledgeBaseItem | `knowledgeBaseId` → KnowledgeBase.`workspaceId` | 1 |
| AIAgentKnowledgeBase | `agentId` → AIAgent.`workspaceId` (opcional: verificar también `knowledgeBaseId` → KnowledgeBase.`workspaceId`) | 1 |
| PaymentEvent | `paymentId` → Payment.`workspaceId` | 1 |

**T3 (bypass total):** ninguna. Cron y worker corren con `crm_service` (BYPASSRLS) — el
bypass es del **rol**, no de la tabla.

---

## 7. Default-deny y FORCE

```sql
-- Quitar acceso genérico (los roles Supabase nativos conservan sus grants explícitos)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;

-- FORCE: RLS aplica incluso al owner de la tabla (belt-and-suspenders; el owner real
-- es postgres, así que es defensa extra, no requisito)
ALTER TABLE "Contact" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Campaign" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Workspace" FORCE ROW LEVEL SECURITY;
ALTER TABLE "User" FORCE ROW LEVEL SECURITY;
ALTER TABLE "WorkspaceMember" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ApiKey" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Settings" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Payment" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Booking" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AuditEvent" FORCE ROW LEVEL SECURITY;
```

> El `REVOKE FROM PUBLIC` se ejecuta **al final** (paso 10 del checklist), cuando todas
> las policies ya están activas y la app corre con `crm_app`. Si se hiciera antes, la
> app (que aún corre con `postgres`) no notaría nada, pero cualquier acceso vía
> PostgREST/anon quedaría cortado de golpe.

---

## 8. Orden de habilitación (hoja → raíz)

| Fase | Tablas | Por qué este orden |
|---|---|---|
| **A — Preparación** | (sin RLS) roles, grants, `.env`, `servicePrisma`, `withWorkspaceScope`, migración ApiKey, migración de rutas | La app debe correr con `crm_app` + inyección funcionando **antes** de encender RLS en nada. |
| **B — Hojas** (sin hijos) | Snippet, ActivationLink, Note, ContactTask, Message, ContentGridAsset, KnowledgeBaseItem, PaymentEvent, Asset, Event, InventoryItem | No tienen tablas hijas → habilitarlas no deja ventana de datos huérfanos visibles. |
| **C — Negocio con `workspaceId`** | Contact, Campaign, ContentGrid, CalendarGroup, CalendarResource, Appointment, WorkflowFolder, Workflow, AIAgent, KnowledgeBase, Guest, Site, RoomType, Room, Booking, Payment, ApiKey, WorkspaceMetaConnection, Settings | Son los padres de las transitivas; al habilitarlas, las subqueries de policies T1 ya encuentran RLS activo y consistente. |
| **D — Transitivas restantes** | Execution, Task, Conversation, WorkflowRun, AIAgentKnowledgeBase | Dependen de C habilitado. |
| **E — Identidad/excepción** | Workspace, User, WorkspaceMember, AuditEvent | Son las que tocan el flujo de auth; se habilitan al final para no interferir con la puesta en marcha. |
| **F — Endurecimiento** | FORCE en críticas + `REVOKE FROM PUBLIC` | Solo cuando todo lo anterior está verde. |

---

## 9. Riesgos día 1 y mitigaciones

| # | Riesgo | Qué se rompe | Mitigación |
|---|---|---|---|
| 1 | **Cron de automatizaciones** | `runDueWorkflows()` hace `workflowRun.findMany` y `workflow.findMany` globales (sin `workspaceId`) → RLS devuelve 0 filas | Migrar `engine.ts` a `servicePrisma` (BYPASSRLS) **antes** de habilitar RLS en Workflow/WorkflowRun (fase A). |
| 2 | **Worker BullMQ** | `task.findUnique`/`execution.findUnique` por ID sin scope → RLS devuelve null → jobs fallan | Migrar `pipeline-worker.ts` a `servicePrisma` (fase A). |
| 3 | **Super admin cross-tenant** | Sin `app.is_super_admin`, el super admin solo ve su propio workspace | El wrapper setea la setting; todas las policies llevan `OR app.is_super_admin()`. Validar en checklist paso 12. |
| 4 | **`/api/public/booking/[slug]` (anónimo)** | Sin sesión, `current_workspace_id()` = NULL → GET y POST fallan (404/denegado) | **Patrón elegido:** policy pública acotada de SELECT en `CalendarResource` (`"bookingSlug" IS NOT NULL AND "bookingEnabled" = true AND status = 'active'`) + dentro de la ruta, tras resolver el calendario por slug, abrir `$transaction` y setear `app.current_workspace_id = calendar.workspaceId` antes de crear Contact/Appointment. Alternativa de respaldo: correr la ruta con `servicePrisma`. |
| 5 | **`getAuth()` upsert de `User`** | El upsert corre antes de tener workspace → policy self lo deniega si `current_user_id` no está seteado | Inyección en dos fases: fase 1 setea `current_user_id` desde el JWT (verificación pura, sin DB) antes del upsert. |
| 6 | **`getOrCreateWorkspace()` crea Workspace** | INSERT sobre `Workspace` | Policy `workspace_insert` con `WITH CHECK ("ownerId" = app.current_user_id() OR app.is_super_admin())`. |
| 7 | **Fila legacy `Settings id='global'`** | Invisible para la app | Comportamiento deseado (ya no se lee ni escribe). Super admin la ve. |
| 8 | **5 rutas con `prisma.$transaction([...])`** | Transacción en otra conexión del pool → pierde el `SET LOCAL` → queries denegadas | Migrar a llamadas secuenciales sobre `tx` dentro del scope (fase A). |
| 9 | **Búsquedas globales legítimas en rutas autenticadas** | Cualquier query sin filtro de workspace en rutas de usuario se rompe | Es el objetivo de la fase: detectarlas en la prueba (paso 11 del checklist) y corregirlas o pasarlas a servicio si son legítimamente globales. |

---

## 10. Plan de prueba y rollback

### Prueba (tenant de prueba, antes de producción)

1. Crear 2 workspaces de prueba (A y B) con usuarios distintos.
2. Habilitar RLS por fases (§8) con la app corriendo contra el tenant de prueba.
3. Verificar aislamiento: usuario de A no ve ni lee ni escribe datos de B (ni por API ni por query directa con `crm_app`).
4. Verificar super admin: ve ambos workspaces (con y sin `X-Workspace-Id`).
5. Verificar cron (`GET /api/automations/run-due` con `CRON_SECRET`) y worker (encolar job real).
6. Verificar `/book/[slug]` público (GET disponibilidad + POST reserva).
7. Verificar flujo completo de login/registro (upsert de `User`, creación de workspace).

### Rollback (scripts de reversa — SENTENCIA SQL en este doc, NO ejecutados)

```sql
-- Reversa por tabla (repetir para cada tabla habilitada)
DROP POLICY IF EXISTS "contact_select" ON "Contact";
DROP POLICY IF EXISTS "contact_insert" ON "Contact";
DROP POLICY IF EXISTS "contact_update" ON "Contact";
DROP POLICY IF EXISTS "contact_delete" ON "Contact";
ALTER TABLE "Contact" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "Contact" DISABLE ROW LEVEL SECURITY;

-- Reversa global (si hay que volver atrás entero)
-- 1) DISABLE RLS en las 39 tablas (script generado con: SELECT 'ALTER TABLE "'||tablename||'" DISABLE ROW LEVEL SECURITY;' FROM pg_tables WHERE schemaname='public')
-- 2) DROP de las policies (script generado con: SELECT 'DROP POLICY IF EXISTS "'||polname||'" ON "'||tablename||'";' FROM pg_policies WHERE schemaname='public')
-- 3) Volver DATABASE_URL/DIRECT_URL al usuario postgres (rollback de .env)
-- 4) RE-GRANT a PUBLIC si se ejecutó el REVOKE: GRANT ALL ON ALL TABLES IN SCHEMA public TO PUBLIC;
```

> El rollback de RLS es **no destructivo** (no borra datos): solo desactiva policies.
> El punto crítico del rollback es volver `DATABASE_URL` a `postgres` si `crm_app` quedó
> sin privilegios por un `REVOKE` mal ejecutado.

---

## 11. Checklist de habilitación (para ejecutar después, en Plan Mode con Reiner)

| # | Paso | Validar |
|---|---|---|
| 1 | Aplicar migración `20260919120000_require_apikey_workspace_scope` (`npx prisma migrate deploy`) + backfill manual de `ApiKey` con `workspaceId` NULL si la migración aborta | `ApiKey` sin NULLs; `npx prisma generate`; `tsc --noEmit` limpio |
| 2 | Crear roles `crm_app` y `crm_service` + grants (SQL editor Supabase, como `postgres`) | `SELECT rolname, rolbypassrls FROM pg_roles WHERE rolname LIKE 'crm_%'` |
| 3 | Actualizar `.env` (DATABASE_URL/DIRECT_URL → `crm_app`; nueva `SERVICE_ROLE_DATABASE_URL` → `crm_service`) + `db.ts` con `servicePrisma` | La app sigue funcionando sin RLS (aún no habilitado) con `crm_app` |
| 4 | Migrar `engine.ts::runDueWorkflows()` y `pipeline-worker.ts` a `servicePrisma` | Cron responde `{ok:true,...}`; worker procesa un job real |
| 5 | Implementar `withWorkspaceScope` + adaptar `getRoleContext`/`requireRole`/`requirePermission` + migrar rutas a `tx` | `tsc --noEmit` limpio; rutas autenticadas responden igual que antes |
| 6 | Migrar las 5 rutas con `prisma.$transaction([...])` a llamadas sobre `tx` | Esas 5 rutas pasan sus tests manuales |
| 7 | Resolver `/api/public/booking/[slug]` (policy pública acotada + scoping post-lookup) | GET y POST de `/book/[slug]` funcionan sin auth |
| 8 | Crear schema `app` + 3 funciones helper (`current_workspace_id`, `current_user_id`, `is_super_admin`) | `SELECT app.current_workspace_id()` devuelve NULL sin sesión |
| 9 | Habilitar RLS + policies por fases B→C→D→E (§8) en **tenant de prueba**, validando tras cada fase | Aislamiento A/B; rutas del módulo de cada fase responden OK |
| 10 | FORCE RLS en tablas críticas + `REVOKE ALL ... FROM PUBLIC` | Acceso vía `crm_app` intacto; acceso anónimo a tablas de tenant denegado |
| 11 | Prueba de aislamiento cross-tenant completa (2 workspaces, todas las operaciones) | Usuario A no ve/lee/escribe nada de B; 404/403 donde corresponde |
| 12 | Prueba super admin cross-tenant (con y sin `X-Workspace-Id`) | Ve todos los workspaces; sin header cae en el propio |
| 13 | Prueba cron + worker en tenant de prueba | Runs pendientes se retoman; jobs del pipeline se procesan |
| 14 | Prueba `/book/[slug]` público | Reserva end-to-end OK |
| 15 | Drill de rollback (ejecutar reversa en tenant de prueba y volver a habilitar) | Reversa completa en <15 min, sin pérdida de datos |
| 16 | Repetir pasos 9–14 en **producción** (ventana de mantenimiento) | Ídem tenant de prueba |

---

## 12. Pendientes / no resuelto

1. **Refactor mecánico de ~100 rutas** a `withWorkspaceScope`/`tx`: diseñado (§3) pero no
   implementado — es el grueso del trabajo de la sub-fase 0.4.
2. **Grep de control de accesos anónimos**: `/api/public/booking` es el único público
   detectado; antes de habilitar RLS conviene un grep de rutas sin `requireRole`/`getAuth`
   para no dejar otro acceso anónimo roto.
3. **Backfill manual de `ApiKey` legacy**: depende de datos reales (a qué workspace
   pertenece cada key) — decisión de Reiner.
4. **Confirmar que el pooler de Supabase acepta roles custom con password** (se valida en
   el paso 2 del checklist; si no, usar `DIRECT_URL` para `crm_app` y documentar).
5. **`agency_owner` sin bypass cross-tenant** (decisión cerrada en la auditoría): las
   policies no distinguen `agency_owner` — solo `super_admin` tiene la cláusula OR.