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

### 3b. Hallazgo adicional (sub-fase 0.2): rutas que se saltean `getRoleContext`

19 archivos de ruta resuelven el workspace llamando a `getOrCreateWorkspace(auth.userId)` directamente, sin pasar por `getRoleContext`/`requireRole`/`requirePermission`. Filtran correctamente por `workspaceId` (por eso no están en la tabla de 16), pero:

1. **Muchas de sus operaciones de escritura no tienen ningún control de rol** — p.ej. `contacts` POST, `contacts/[id]` PATCH/DELETE, `notes` POST/DELETE, `appointments/[id]` PATCH/DELETE usan solo `getAuth` + `getOrCreateWorkspace`.
2. Quedan fuera del mecanismo único de resolución de workspace activo: un miembro nunca opera en el workspace pedido vía `X-Workspace-Id`, siempre cae en el suyo propio.

Hoy **no es explotable** (un miembro no-owner siempre aterriza en su propio workspace, así que no puede tocar datos ajenos), pero es exactamente el patrón de "soluciones paralelas" que esta fase elimina. Archivos: `launchpad`, `workspace/brand-doc`, `snippets`, `notes`, `conversations/[id]`, `conversations/[id]/messages`, `content-grids` (también en la tabla de 16), `contacts`, `contacts/[id]`, `contact-tasks`, `calendars`, `calendars/[id]`, `calendar-groups`, `automations`, `automations/runs`, `automations/[id]` (mezcla `requireRole` + `getOrCreateWorkspace` en el mismo handler), `appointments`, `appointments/[id]`, `activation-links`.

**Se corrige en la sub-fase 0.3**, que aplica el guard de permisos a todas las rutas de escritura: cada una pasa a obtener `workspace` y `role` desde `requirePermission`/`getRoleContext`.

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
| Configuración | RW | RW | RW | R | — | R | — |
| Equipo / Team | RW | RW | RW | — | — | — | — |
| Facturación | RW | RW | RW | — | — | — | — |
| Reportes | RW | RW | RW | RW | R | — | R |
| Agentes de IA | RW | RW | RW | RW | R | — | R |
| Conversaciones | RW | RW | RW | RW | RW | R | R |

> Esta matriz es el input directo de la sub-fase 0.3 (`MODULE_ACCESS`, `PERMISSIONS_BY_ROLE` en `roles-shared.ts`).
>
> **Decisiones confirmadas por Reiner (15 sep, durante la sub-fase 0.2):**
> - `agency_owner` **no** tiene bypass cross-tenant: tiene todos los permisos, pero solo dentro de su propio workspace. El acceso cross-tenant es exclusivo de `super_admin`.
> - `staff` **sin acceso** a Pagos; en Configuración **como máximo lectura**, nunca edición.
>
> Las demás celdas se toman como propuestas y se validan al revisar el PR de la sub-fase 0.3.

### 5a. Discrepancias matriz ↔ código detectadas al aplicar la sub-fase 0.3 (16 sep)

| # | Discrepancia | Decisión | Estado |
|---|---|---|---|
| 1 | **Workflows / `agente`**: la matriz da `R`, pero el código le da `RW` (`automations` POST y `automations/[id]` PATCH/DELETE ya listan `agente` en su `requireRole`). | **Conservar el comportamiento actual (`agente` = RW).** Aplicar la matriz le quitaría a los agentes la capacidad de crear y editar automatizaciones que hoy usan; es una regresión funcional que no se mete antes de un go-live con cliente real. | **Abierta** — revisar con calma post-go-live. Si se confirma `R`, hay que tocar `MODULE_ACCESS['/automatizacion']`, los `requireRole` de las 3 rutas de automations, y avisar a los usuarios afectados. |
| 2 | **`/keys` / `gerente`**: `MODULE_ACCESS` le daba acceso, pero `ROLE_DESCRIPTIONS` dice explícitamente que gerente "NO administra las claves de IA (BYOK)". | **Aplicar la matriz**: `/keys` queda solo en nivel admin (`super_admin`, `agency_owner`, `admin`). | **Cerrada** en la sub-fase 0.3. |

> La tabla de §5 sigue siendo la fuente de verdad salvo por la fila 1, que queda explícitamente divergente hasta que se decida.

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

*(Sub-fase 0.2 — implementado en `src/lib/workspace.ts::resolveActiveWorkspace`.)*

### Opciones evaluadas

| Opción | Veredicto |
|---|---|
| Header `X-Workspace-Id` validado contra `WorkspaceMember` | **Elegida.** Sin estado, sin migración de schema, y es el mismo dato que después necesita el claim de RLS (`app.current_workspace_id`). Si no se manda, el comportamiento es idéntico al actual. |
| Workspace por defecto guardado en el perfil del usuario | Descartada como mecanismo de autorización: requiere migración y duplica lo que ya dice `WorkspaceMember`. Puede servir más adelante como *preferencia de UI* para decidir qué header manda el cliente. |
| Selector obligatorio en la UI | Descartada: fricción para el 100% de los usuarios actuales, que tienen un único workspace. Cuando exista multi-workspace real, el selector solo decide qué valor de header enviar. |

### Cómo se resuelve el workspace activo

**Un usuario dueño de su workspace** (el 100% de los usuarios reales hoy) no manda ningún header. `resolveActiveWorkspace()` cae al camino legacy — `getOrCreateWorkspace(auth.userId)` — y obtiene exactamente el mismo workspace que antes. No nota ninguna diferencia. Si igual manda `X-Workspace-Id` con el id de su propio workspace, se valida por `ownerId` y también funciona.

**Un usuario miembro (no dueño) de otro workspace** manda `X-Workspace-Id: <id>`. El servidor busca ese workspace y lo acepta solo si el usuario es su `ownerId` o tiene una fila `WorkspaceMember` con `status: 'active'` ahí (una invitación pendiente o una membresía suspendida no alcanza). Si el workspace no existe → 404; si existe pero no hay acceso → 403. **Nunca hay fallback silencioso al workspace propio**: esa sustitución silenciosa es justamente el tipo de bug que esta fase cierra. Con el workspace ya resuelto, `getRole()` calcula el rol dentro de ese workspace (owner → `admin`; si no, el `role` de su membresía).

```
request ──► getAuth(req) ──► ¿autenticado? ──no──► 401
                                   │ sí
                                   ▼
               resolveActiveWorkspace(req, auth)
                 │
                 ├─ sin X-Workspace-Id ──► getOrCreateWorkspace(userId)   (legacy)
                 │
                 └─ con X-Workspace-Id ──► workspace existe? ──no──► 404
                                              │ sí
                                              ├─ ownerId == userId ────────► OK
                                              ├─ WorkspaceMember active ───► OK
                                              └─ ninguno ──────────────────► 403
                                   │
                                   ▼
                 getRole(userId, workspace)  ──► RoleContext { auth, workspace, role }
                                   │
          ┌────────────────────────┼──────────────────────────┐
          ▼                        ▼                          ▼
   RBAC (0.3)            RLS: SET LOCAL                16 rutas corregidas
   requirePermission     app.current_workspace_id      (0.5) usan
                         (0.4)                         ctx.workspace.id
```

### Un solo punto de consumo

`getRoleContext()` es el único caller de `resolveActiveWorkspace()`. RBAC (0.3), el `SET LOCAL app.current_workspace_id` de RLS (0.4) y las rutas corregidas (0.5) toman el workspace de `ctx.workspace` — nunca lo vuelven a calcular. Las rutas de §3b que hoy llaman a `getOrCreateWorkspace` directamente se migran a este punto en la 0.3.

**Fidelidad de error:** para no romper la firma `RoleContext | null` que usan decenas de rutas, `getRoleContext()` convierte un `WorkspaceAccessError` en `null`, y quien llama responde 401. Un error que no sea de acceso (p.ej. la base de datos caída) se propaga y no se disfraza de 401.

### DEV_BYPASS_AUTH endurecido

`isDevBypassActive()` en `src/lib/auth.ts`: el bypass solo tiene efecto si `DEV_BYPASS_AUTH === 'true'` **y** `NODE_ENV !== 'production'`. En producción se ignora aunque la variable quede en `true` (se registra un `console.error` una sola vez) y se exige JWT real. Next.js fija `NODE_ENV=production` en `next build`/`next start`, así que un deploy en Vercel queda cubierto sin configurar nada extra.

Consecuencia sobre la clave Stripe (§7): si `DEV_BYPASS_AUTH` contiene hoy un `sk_live_...`, su valor no es `'true'` y el bypass **ya estaba inactivo** — la autenticación no quedó abierta por eso. El riesgo de ese hallazgo es la exposición del secreto, no un bypass de auth.

### Decisión: `super_admin` vía `SUPER_ADMIN_EMAILS` (Reiner, 15 sep)

**Decisión:** los super admins de la plataforma (RAI Agency, acceso a cualquier workspace) se definen **solo** con la variable de entorno `SUPER_ADMIN_EMAILS`, una lista de emails separados por coma. No hay campo en la DB ni migración.

**Implementación** (`isPlatformSuperAdmin(email)` en `src/lib/auth.ts`):
- La comparación ignora mayúsculas y espacios, y el email tiene que coincidir entero (no alcanza con que lo contenga).
- `resolveActiveWorkspace()`: un super admin puede mandar `X-Workspace-Id` de cualquier workspace sin ser miembro. Si no manda el header, cae en su propio workspace, así que el acceso a otros workspaces siempre es explícito.
- `getRole()`: si el email está en la lista, el rol es `super_admin`. Esa es la única forma de obtener ese rol.
- `agency_owner` **no** tiene este bypass (decisión confirmada): solo opera en workspaces donde es dueño o miembro.

**Hallazgo corregido junto con la decisión — escalada de privilegios vía Team:** `POST /api/team` y `PATCH /api/team/[id]` solo rechazaban asignar el rol `admin`, así que cualquier admin de un workspace podía darle a alguien `super_admin`. `getRole()` lo respetaba, y ese rol tiene todos los permisos más el bypass de `hasModuleAccess`. No llegaba a otros workspaces, pero sí saltaba todo el RBAC. Ahora:
1. las dos rutas de Team rechazan `super_admin` con 400;
2. `getRole()` ignora un `super_admin` guardado en `WorkspaceMember.role` y lo trata como `viewer`. Así se neutralizan filas que ya se hayan creado antes del fix, sin tocar datos.

**Supuesto de seguridad:** el email sale del JWT firmado por el SSO del CRM. La lista solo es confiable si el emisor firma emails **verificados** y no permite que un usuario cambie el suyo al de un super admin. Hay que confirmarlo del lado del SSO antes de cargar emails en la variable en producción.

**Revisar más adelante:** si la cantidad de super admins crece (más de un puñado, rotación frecuente, necesidad de auditar altas y bajas), migrar a un campo en `User` (p.ej. `isPlatformSuperAdmin`) gestionado con `logAudit`. Cambiar la variable exige redeploy y no deja traza de quién otorgó el acceso.

**Pendiente de decisión (no corregido):** Team todavía permite asignar `agency_owner`, que `isAdmin()` trata como equivalente a `admin`. Es el mismo tipo de hueco que se cerró para `admin` y `super_admin`: un admin puede otorgar un rol que la propia ruta dice que no se invita directamente.
