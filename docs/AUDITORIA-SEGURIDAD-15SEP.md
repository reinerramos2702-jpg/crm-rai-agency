# Auditoría de Seguridad — 15 sep 2026

> Documento consolidado de la Fase 0 de remediación de seguridad multi-tenant. Reemplaza y corrige las cifras de la auditoría previa (13 rutas / 41 tablas). Insumo directo para las sub-fases 0.2 a 0.7. Ver plan completo en el chat de la sesión que generó este documento.

## 1. Resumen ejecutivo

- **Root cause confirmado**: `getRoleContext()` (`src/lib/roles.ts:39-45`) siempre resuelve el workspace vía `getOrCreateWorkspace(auth.userId)` (`src/lib/workspace.ts:16-29`), que hace `Workspace.findFirst({ where: { ownerId: userId } })`. Nunca consulta `WorkspaceMember` ni ningún header/param de request. El modelo de datos `WorkspaceMember` ya soporta membership multi-workspace (un `User` puede tener muchas filas `WorkspaceMember` en distintos workspaces), pero esa capacidad nunca se conecta al flujo real de autorización — un usuario invitado como miembro de un workspace ajeno no tiene, hoy, ninguna forma de operar en él a través del helper estándar.
- **16 rutas** (no 13) filtran datos de tenant por `userId` en vez de `workspaceId`.
- **Cero RLS** en Postgres: grep de `RLS`/`row level security`/`row-level security` sobre todo el repo (código + `prisma/migrations/*`) → cero resultados. Todo el aislamiento de tenant depende 100% de que cada query de aplicación incluya el filtro correcto — no hay ninguna barrera a nivel de base de datos.
- **DEV_BYPASS_AUTH** sin guard de `NODE_ENV` — riesgo de bypass total de autenticación si la env var quedara en `'true'` en producción por error de configuración.
- **Clave Stripe**: hallazgo abierto y no confirmado — ver sección 7.
- **Auditoría (`AuditEvent`)**: solo 2 de 11 módulos de negocio generan trazabilidad hoy (hotel y Meta/Instagram).

## 2. Modelo de datos multi-tenant (39 modelos)

`prisma/schema.prisma` tiene **39 modelos**, no 41 (corrección de cifra respecto a la auditoría previa — no se identificó de dónde salía el "41" original; puede haber contado enums o una versión anterior del schema).

### 2a. Modelos con `workspaceId` propio (22)

| Modelo | `workspaceId` | Notas |
|---|---|---|
| Workspace | n/a (es el tenant) | `ownerId` → `User`, root de todo el modelo |
| WorkspaceMetaConnection | requerido, `@unique` | 1:1 con Workspace |
| ContentGrid | requerido | también tiene `userId` (creador) |
| ApiKey | **nullable** | ⚠️ leak conocido, marcado en comentario del propio schema — ver §3, fila `keys` |
| Campaign | requerido | |
| Settings | **nullable, `@unique`** | ⚠️ leak histórico ya parcialmente cerrado (migración `20260904090000_scope_settings_by_workspace`) — fila legacy `id='global'` queda huérfana con `workspaceId NULL`, código nuevo no la usa. Ver §8. |
| Contact | requerido | |
| Snippet | requerido | |
| ActivationLink | requerido | |
| CalendarGroup | requerido | |
| CalendarResource | requerido | también `groupId` FK |
| Appointment | requerido | `calendarId`, `contactId` FKs |
| WorkspaceMember | requerido | `userId` nullable (invitación pendiente sin `User` aún); `@@unique([workspaceId, email])` |
| WorkflowFolder | requerido | |
| Workflow | requerido | `folderId` FK |
| AIAgent | requerido | |
| KnowledgeBase | requerido | |
| Guest | requerido | `contactId` FK opcional |
| Site | requerido | |
| RoomType | requerido | |
| Room | requerido | `siteId`, `roomTypeId` FKs |
| Booking | requerido | `guestId`, `siteId`, `roomId` FKs |
| Payment | requerido | `guestId`, `bookingId`, `siteId` FKs; `createdById`/`approvedById` son `String` planos sin FK declarada |
| AuditEvent | requerido | `userId` `String` plano sin FK declarada |

### 2b. Modelos SIN `workspaceId` propio — escalados transitivamente vía FK a un padre (13)

| Modelo | Padre (FK) | Nota |
|---|---|---|
| ContentGridAsset | `gridId` → ContentGrid | |
| Execution | `campaignId` → Campaign | usado por 2 de las 16 rutas afectadas (`events/[campaignId]`, `executions/[id]`) |
| Task | `executionId` → Execution | usado por `retry/[taskId]`, `webhook/dispatch` y el worker BullMQ |
| Asset | `taskId` → Task | |
| Event | `executionId` → Execution | |
| InventoryItem | `campaignId` → Campaign | |
| Conversation | `contactId` → Contact | `agentId` FK opcional |
| Message | `conversationId` → Conversation | |
| Note | `contactId` → Contact | |
| ContactTask | `contactId` → Contact | |
| WorkflowRun | `workflowId` → Workflow | también `contactId` `String` plano sin FK |
| KnowledgeBaseItem | `knowledgeBaseId` → KnowledgeBase | |
| AIAgentKnowledgeBase | join table: `agentId` + `knowledgeBaseId` | |
| PaymentEvent | `paymentId` → Payment | `actorUserId` `String` plano sin FK |

**Implicación para RLS (sub-fase 0.4)**: los 22 modelos de §2a admiten una policy directa (`USING ("workspaceId" = current_workspace_id())`); los 13 de §2b necesitan policy con subquery/join hacia el padre — ninguno queda "sin política por comodidad".

**`User`** no está en ninguna de las dos tablas: es la identidad root, cross-workspace por diseño (un usuario puede ser owner de un workspace y member de otros).

## 3. Las 16 rutas afectadas (userId en vez de workspaceId)

| # | Archivo | Método(s) | Mecanismo actual | Requiere migración de schema |
|---|---|---|---|---|
| 1 | `src/app/api/campaigns/route.ts` | GET | `where: { userId }` | No — `Campaign.workspaceId` ya existe |
| 2 | `src/app/api/campaigns/[id]/route.ts` | GET, DELETE | `findFirst({ id, userId })` | No |
| 3 | `src/app/api/chat/route.ts` | POST | `findFirst({ id: campaignId, userId })` | No |
| 4 | `src/app/api/content-grids/route.ts` | GET, POST | `where: { userId }` | No — `ContentGrid.workspaceId` ya existe |
| 5 | `src/app/api/content-grids/[id]/route.ts` | GET, PATCH, DELETE | `getOwnedGrid()`: `grid.userId !== userId` | No |
| 6 | `src/app/api/content-grids/[id]/chat/route.ts` | POST | `findFirst({ id, userId })` | No |
| 7 | `src/app/api/content-grids/[id]/generate-image/route.ts` | POST | `findFirst({ id, userId })` | No |
| 8 | `src/app/api/cost-estimate/route.ts` | GET | `findFirst({ id: campaignId, userId })` | No |
| 9 | `src/app/api/events/[campaignId]/route.ts` | GET (SSE) | `findFirst({ id: executionId, userId, campaignId })` | No — `Execution` sin `workspaceId` propio, fix vía join a `campaign.workspaceId` |
| 10 | `src/app/api/executions/[id]/route.ts` | GET | `findFirst({ id, userId })` | No — mismo caveat que #9 |
| 11 | `src/app/api/finalize/route.ts` | POST | `findFirst({ id: campaignId, userId })` | No — **no estaba en la auditoría previa** |
| 12 | `src/app/api/keys/route.ts` | GET, POST, DELETE | `where: { userId }` en todas las operaciones | **Sí** — `ApiKey.workspaceId` existe pero nullable, marcado en el propio schema como el leak "más peligroso del repo" |
| 13 | `src/app/api/process/route.ts` | POST | `findFirst({ id: campaignId, userId })` | No |
| 14 | `src/app/api/research/competitors/route.ts` | POST | `findFirst({ id: campaignId, userId })` | No |
| 15 | `src/app/api/retry/[taskId]/route.ts` | POST | check en memoria post-fetch: `task.execution.campaign.userId !== auth.userId` | No — **no estaba en la auditoría previa** |
| 16 | `src/app/api/webhook/dispatch/route.ts` | POST | check en memoria post-fetch: `task.execution.campaign.userId !== auth.userId` | No — **no estaba en la auditoría previa** |

**Causa raíz compartida adicional**: `src/lib/llm-providers.ts::resolveApiKey()`/`getLLM()` resuelven claves BYOK por `userId`, no por `workspaceId` — afectan directamente a las rutas #3, #6, #7, #14, y además (fuera de esta lista de 16 pero con el mismo bug) a `research/ads-library` e `inventory`. Se corrige con un único cambio de firma en la sub-fase 0.5.

**Grep de control** (`getOrCreateWorkspace|getRoleContext|requireRole|requirePermission` sobre `src/app/api`): no se detectó una 17ª ruta con el mismo patrón de filtro por `userId` en datos de tenant fuera de las 16 listadas arriba y las 6 indirectamente afectadas por `llm-providers.ts`.

## 4. Procesos batch/cron/worker que necesitan bypass de RLS controlado

| Proceso | Archivo | Comportamiento hoy |
|---|---|---|
| Cron de automatizaciones | `src/lib/automations/engine.ts::runDueWorkflows()` | Invocado por `GET /api/automations/run-due`, auth solo vía `CRON_SECRET` opcional en header (no es un request de usuario). Hace `prisma.workflowRun.findMany({ where: { status:'pending', nextRunAt:{lte:now} } })` **sin filtro workspaceId**, y `prisma.workflow.findMany({ where: { status:'active' } })` **global** — después sí escopea manualmente cada sub-handler por `wf.workspaceId`. Bajo RLS, esto se rompe salvo que corra con un rol de servicio con `BYPASSRLS`. |
| Worker BullMQ | `src/workers/pipeline-worker.ts` (queue `content-pipeline`) | Busca `Task`/`Execution`/`Campaign` puramente por ID del payload del job (`job.data: { taskId, executionId, userId }`), **cero chequeo de workspace/ownership en la query** — confía en que quien encoló el job ya validó. Bajo RLS, se rompe salvo bypass de servicio. |

Ambos usan el mismo Prisma client compartido (`src/lib/db.ts`) con una única `DATABASE_URL` de service role. No hay hoy ningún `SET LOCAL` de variable de sesión por request/tenant en ningún lado del código.

**Webhooks entrantes**: no existen hoy (no hay `/api/webhooks/stripe` ni `/api/webhooks/meta`, ni verificación de firma de ningún proveedor). `webhook/dispatch/route.ts` es **saliente** (manda a n8n), no un receptor. No es un problema actual, pero queda documentado para cuando se implemente Stripe billing (README lo marca como pendiente).

## 5. Matriz de permisos rol × módulo (7 roles × 11 módulos)

Roles (`src/lib/roles-shared.ts`): `super_admin`, `agency_owner`, `admin`, `gerente`, `agente`, `staff`, `viewer`.

`R` = solo lectura · `RW` = lectura + escritura (crear/editar/eliminar) · `—` = sin acceso al módulo.

| Módulo | super_admin | agency_owner | admin | gerente | agente | staff | viewer |
|---|---|---|---|---|---|---|---|
| Contactos | RW | RW | RW | RW | RW | R | R |
| Campañas | RW | RW | RW | RW | RW | R | R |
| Workflows | RW | RW | RW | RW | R | R | R |
| Citas (Calendarios) | RW | RW | RW | RW | RW | RW | R |
| Pagos | RW | RW | RW | R | — | — | R |
| Configuración | RW | RW | RW | R | — | — | — |
| Equipo / Team | RW | RW | RW | — | — | — | — |
| Facturación | RW | RW | RW | — | — | — | — |
| Reportes | RW | RW | RW | RW | R | — | R |
| Agentes de IA | RW | RW | RW | RW | R | — | R |
| Conversaciones | RW | RW | RW | RW | RW | R | R |

> Esta matriz es el input directo de la sub-fase 0.3 (`MODULE_ACCESS`, `PERMISSIONS_BY_ROLE` en `roles-shared.ts`). Antes de codificar, confirmar celda por celda con Reiner — en particular `staff` en Pagos/Configuración, que hoy no está definido en ningún lado del código existente, y la equivalencia `super_admin`/`agency_owner` (¿son siempre idénticos en permisos, o `agency_owner` debería estar acotado a su propio workspace mientras `super_admin` es cross-tenant? El código actual (`hasModuleAccess`) ya trata a `super_admin` como bypass total — `agency_owner` no tiene ese trato especial hoy).

**Estado actual del código** (antes de la sub-fase 0.3): `MODULE_ACCESS` solo lista roles para `admin | gerente | agente | viewer` — a los 3 roles nuevos (`super_admin`, `agency_owner`, `staff`) les falta entrada explícita en cada módulo. Además `hasModuleAccess()` tiene **fail-open**: `if (!allowed) return true` — cualquier ruta no mapeada en `MODULE_ACCESS` permite acceso a cualquier rol. Esto se cierra en la sub-fase 0.3.

## 6. Deuda de auditoría (`AuditEvent`)

`logAudit()` (`src/lib/audit.ts:18-36`) escribe a `AuditEvent` pero **falla silenciosamente** (try/catch con solo `console.warn`). Lo llaman 15 archivos, todos del módulo **hotel** (rooms, room-types, sites, guests, bookings, payments) o **Meta/Instagram** (workspace/meta oauth, publish/instagram).

**Módulos sin ninguna auditoría hoy**: Contactos, Conversaciones, Campañas, Workflows, Calendarios, Agentes de IA, ApiKey/Keys, Settings, Team/WorkspaceMember (creación/edición/borrado, cambios de rol). Se amplía parcialmente en la sub-fase 0.7 (login + cambios de rol en `/api/team`); el resto queda como deuda documentada en el cierre.

## 7. Clave Stripe expuesta — hallazgo abierto, NO resuelto en esta auditoría

- Documentado en `docs/planning/panel-control.html:407-408`, fechado 5-sep-2026: *"Clave `sk_live_...` mal puesta en `DEV_BYPASS_AUTH` — identificada 5 sep... Pendiente que Reiner la ubique y decida."*
- **No se pudo confirmar el contenido real** de `.env.production` (archivo local, gitignored, salió redactado al leerlo durante esta auditoría) — no hay forma de verificar por lectura de archivo si la clave sigue ahí hoy.
- No existe ningún `sk_live_`/`sk_test_` hardcodeado en código trackeado (grep sobre todo el repo, cero matches fuera de esta referencia documental).
- No existe la variable `STRIPE_SECRET_KEY` en `.env.example` ni `.env.production.example` — Stripe billing está listado en `README.md` como pendiente/no implementado.
- **Acción pendiente de Reiner** (no automatizable desde este agente, ver sub-fase 0.6): confirmar si el valor real de `DEV_BYPASS_AUTH` en producción contiene la clave; si es así, rotarla en el dashboard de Stripe (se considera comprometida independientemente de si se usó); confirmar con `git log --all --full-history -p -- .env.production .env` que nunca quedó en el historial de git.

## 8. DEV_BYPASS_AUTH

`src/lib/auth.ts:43-68`, `getAuth(req)`: si `process.env.DEV_BYPASS_AUTH === 'true'`, devuelve un usuario hardcodeado `dev-user-001` **sin verificar JWT y sin chequeo de `NODE_ENV`**. Si esta variable quedara en `'true'` en producción por error, cualquier request no autenticado se trata como ese usuario fijo. El cache de auth para el bypass nunca expira (vs. TTL de 5 min para JWT real). `.env.example` trae `DEV_BYPASS_AUTH=true` por defecto (riesgoso como plantilla); `.env.production.example` trae `false` (correcto). Se endurece en la sub-fase 0.2 con un guard `NODE_ENV !== 'production'`.

## 9. Discrepancias de cifras vs. auditoría previa

| Dato de la auditoría previa | Cifra confirmada contra código | Detalle |
|---|---|---|
| 41 tablas | **39 modelos** | No se identificó el origen de la cifra "41"; puede corresponder a una versión anterior del schema. |
| 13 rutas afectadas | **16 rutas** | 3 no estaban documentadas: `finalize/route.ts`, `retry/[taskId]/route.ts`, `webhook/dispatch/route.ts`. Además `content-grids/*` (mencionado como comodín) en verdad cubre 4 archivos distintos, y `campaigns/[id]` tenía una hermana `campaigns/route.ts` (GET, listado) con el mismo bug, no mencionada por separado. |

## 10. Diseño: resolución de workspace activo

*(Pendiente — se completa en la sub-fase 0.2.)*
