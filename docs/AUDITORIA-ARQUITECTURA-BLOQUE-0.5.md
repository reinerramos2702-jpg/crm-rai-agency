# Auditoría de arquitectura — Bloque 0.5 (v3.0-master-prompt)

> Inventario del repo real **antes** de construir multi-tenant + RBAC formal (Bloque 1). Objetivo: no crear `tenantId` duplicado, roles incompatibles, migraciones conflictivas, ni patrones de API paralelos a los que ya existen. Repo auditado: `content-engine-mvp` (worktree `main`), 3 sep 2026.

---

## 1. Modelo Prisma actual

29 modelos en `prisma/schema.prisma`. **`Workspace` es, de hecho, el tenant actual** — cada fila tiene `ownerId → User`, y casi todos los módulos de negocio (contactos, calendarios, automatizaciones, agentes IA, hotelería, pagos, auditoría) cuelgan de `workspaceId`. No existe un campo `tenantId` separado; el multi-tenant real hoy ocurre a nivel de `Workspace`.

**Modelos con `workspaceId` directo:** `ContentGrid`, `Campaign`, `Contact`, `Snippet`, `ActivationLink`, `CalendarGroup`, `CalendarResource`, `Appointment`, `WorkspaceMember`, `WorkflowFolder`, `Workflow`, `AIAgent`, `KnowledgeBase`, `Guest`, `Site`, `RoomType`, `Room`, `Booking`, `Payment`, `AuditEvent`.

**Modelos "hijos"** sin `workspaceId` propio (heredan el filtro vía join al padre — funciona hoy pero es frágil ante queries directas): `ContentGridAsset`, `Execution`, `Task`, `Asset`, `Event`, `InventoryItem`, `Conversation`, `Message`, `Note`, `ContactTask`, `WorkflowRun`, `KnowledgeBaseItem`, `AIAgentKnowledgeBase`, `PaymentEvent`.

**Los 2 puntos más peligrosos de fuga cross-tenant, a resolver primero en el Bloque 1:**
- **`Settings`** (schema.prisma:270) — singleton global (`id @default("global")`): SLA, webhooks n8n, IG business ID, kill-switch de automatizaciones **compartidos entre TODOS los tenants**.
- **`ApiKey`** (122) — ligado solo a `userId`, no a `workspaceId`. Si un usuario pertenece a varios workspaces, sus BYOK keys quedan compartidas entre todos ellos.

**`User` es global** — un mismo `User.id` (identidad replicada de un JWT externo) puede tener múltiples `Workspace`s como owner y múltiples `WorkspaceMember`ships simultáneas. No existe una capa "Organization" por encima de `Workspace` que agrupe varios workspaces bajo una misma cuenta de facturación.

**Migraciones (6, orden cronológico):** `init` (CRM ligero base) → `add_calendarios_module` → `add_automations_module` (aquí aparece `WorkspaceMember`) → `content_grid_generador_imagenes` → `add_ai_agents_module` → `add_hotel_module` (Guest/Site/Room/Booking/Payment + `AuditEvent`, el más reciente). Lectura evolutiva: el proyecto acumuló verticales de negocio sobre el mismo `Workspace`, sin romper el modelo base — buen precedente para insertar RBAC de la misma forma (incremental, no reescritura).

## 2. Auth actual

`src/lib/auth.ts` — **JWT propio verificado con `jose`** (HS256, `JWT_SECRET`), no NextAuth ni Supabase Auth. La identidad viene de un SSO externo (el CRM de RAI Agency emite el JWT), replicada localmente en `User` vía upsert.

Flujo `getAuth(req)`: lee `Authorization: Bearer <token>` → `jwtVerify` → extrae `sub/email/name` → upsert local con cache en memoria (TTL 5 min). Devuelve `AuthContext = { userId, email, displayName? }` — **sin rol ni workspace**, eso se resuelve aparte en `roles.ts`.

⚠️ **`DEV_BYPASS_AUTH=true`** (auth.ts:44) bypassea la autenticación por completo con un usuario dummy fijo (`dev-user-001`). Debe auditarse que nunca quede activo en producción antes de construir RBAC encima.

## 3. Roles existentes

`src/lib/roles-shared.ts` + `src/lib/roles.ts`. Enum plano de 4 roles: `'admin' | 'gerente' | 'agente' | 'viewer'`, con un mapa estático `MODULE_ACCESS` (rol → rutas del sidebar permitidas) y helpers (`canWrite`, `isAdmin`, `isAdminOrManager`, `hasModuleAccess`).

Resolución: `getRole(userId, ws)` — si `ws.ownerId === userId` → `'admin'` implícito; si no, busca `WorkspaceMember` activo; **sin membresía activa, degrada a `'viewer'`** (deliberado, para no romper invitaciones pendientes).

`requireRole(req, allowed[])` → `RoleContext | NextResponse` (401/403), con `isRoleContext()` como type guard. **32 rutas API** ya usan este patrón. **34+ archivos** además referencian los strings de rol directamente fuera de `roles-shared.ts` — acoplamiento disperso real al modelo de 4 roles fijos.

No hay permisos granulares por acción (`canCreateLead`, `canManageBilling`, etc.) ni ownership a nivel de registro — es rol único por (usuario, workspace).

## 4. Middleware

**No existe `middleware.ts`** (ni raíz ni `src/`). Toda autorización es manual, por ruta, vía `requireRole`/`requireAuth` dentro de cada `route.ts` — **fail-open por omisión**: una ruta nueva que olvide llamar al guard queda desprotegida por defecto. Control de acceso a páginas (`hasModuleAccess`) parece depender del cliente (Sidebar), no de un middleware server-side.

Punto de inserción natural para el RBAC formal: `src/middleware.ts` centralizado que resuelva tenant + rol antes de cada request, sin tener que tocar los 32+ route handlers existentes uno por uno.

## 5. Estructura de carpetas real

| Esperado | Estado |
|---|---|
| `src/app` | ✅ 21+ carpetas de páginas + `src/app/api` |
| `src/components` | ✅ `ui/`, `layout/`, `campaign/`, `dashboard/`, `hotel/`, `inventory/`, `pipeline-ig/` |
| `src/services` | ❌ no existe — lógica de negocio inline en `route.ts` + `src/lib/*` |
| `src/repositories` | ❌ no existe — acceso a datos directo vía `prisma` desde cualquier route handler |
| `src/lib` | ✅ `audit.ts`, `auth.ts`, `automations/`, `crypto.ts`, `db.ts`, `llm-providers.ts`, `n8n-dispatcher.ts`, `r2.ts`, `redis.ts`, `roles(-shared).ts`, `workspace.ts`, etc. |
| `src/hooks` | ❌ no existe |
| `src/types` | ❌ no existe — tipos inline junto a su módulo |
| — (extra) | `src/agents/` (pipeline IA: orchestrator + 7 agentes), `src/workers/` (BullMQ) |

**Conclusión:** arquitectura "route handler + prisma directo + helpers en `lib/`", sin capas services/repositories. La regla no negociable de la sección 3 del master prompt (nada de `prisma.model.findMany()` directo desde negocio) es un cambio real de patrón, no cosmético — ver plan de inserción abajo.

## 6. Patrones de API existentes

Consistente en ~40 rutas: `export const runtime = 'nodejs'` casi siempre; `export const dynamic = 'force-dynamic'` solo en listados/dashboards que leen `searchParams`. Dos mecanismos de auth conviven: `requireRole` (módulo CRM/hotel, con control de rol) vs. `getAuth` directo (módulo pipeline/marketing, sin rol granular) — **el RBAC formal del Bloque 1 debe unificar esto**, no dejar dos caminos.

Errores: parseo manual de `req.json()` con try/catch, validación manual campo por campo (Zod está instalado pero subutilizado — casi ninguna ruta lo usa). Respuestas siempre objeto con la entidad nombrada (`{ payments, summary }`), nunca array suelto.

## 7. Componentes reutilizables existentes

`src/components/ui/`: `Badge`, `Button`, `Card`, `HelpTip`, `Input`, `Modal` (backdrop+blur, tamaños sm/md/lg, cierre Escape), `Spinner`. `layout/`: `Sidebar` (lucide-react + `usePathname`), `TopBar`. `ModulePlaceholder.tsx` — plantilla genérica para módulos "próximamente" (reusable para pantallas nuevas aún sin construir).

**No hay tabla ni formulario genérico** — cada módulo construye su propia lista inline. `globals.css` (1822 líneas, 124 clases): `.card`, `.btn-primary/secondary/danger/ghost`, `.badge*`, `.modal*`, `.form-group`, `.progress-bar`, `.chat-*`, `.app-layout/sidebar/main`, `.grid-2/3/4`, utilitarios tipo Tailwind-lite (`.flex`, `.gap-*`, `.mb-*`, etc.) — **usar estas clases para todo lo nuevo, no crear un sistema paralelo.**

## 8. Estado real del frontend

21+ rutas ya funcionando bajo `src/app/` (nombres en español, sin route groups): `/`, `/agentes-ia(+[id]+base-conocimiento)`, `/automatizacion`, `/book/[slug]`, `/calendarios`, `/campaign(+[id]+new)`, `/clientes-potenciales`, `/contactos`, `/contenido-multimedia`, `/conversaciones`, `/facturacion`, `/generador-imagenes`, `/informes`, `/keys`, `/launchpad`, `/marketing`, `/marketplace`, `/pagos`, `/pasajeros`, `/reputacion`, `/reservas`, `/settings`, `/sitios`. Layout raíz único (`src/app/layout.tsx`), todo plano, sin agrupar por rol/auth.

### Extra relevante para bloques siguientes

- **Capa de IA:** `src/agents/orchestrator.ts` ya es un orquestador real (DAG Copy→Visual+Audio→Video→Music, paralelo, con pausa ante fallo y dispatch a n8n). **No hay tabla `AiUsageLog`/`ModelUsage`** — el campo `Task.costUsd` existe pero la mayoría de agentes usa `costUsd: 0` o estimados fijos hardcodeados (placeholders reales, no cálculo por tokens). La capa `/services/ai` del Bloque 1/2B debe construirse envolviendo esto, no reemplazándolo, y agregar el logging real que falta.
- **Auditoría:** `src/lib/audit.ts` → `logAudit()` ya escribe en `AuditEvent` (workspaceId, userId, action, entityType, entityId, meta, createdAt), nunca lanza excepción (falla silenciosa con `console.warn`). **17 usos en 11 archivos, todos del módulo hotelero** — el módulo de pipeline/IA no audita nada todavía. Este es el patrón exacto a replicar para las acciones críticas de los bloques 1-6.
- **Stack instalado vs. master prompt:** `bullmq` + `ioredis` (Redis clásico, **no** `@upstash/redis` REST) ✅, `@aws-sdk/client-s3` (R2) ✅, Vercel AI SDK + 4 providers ✅, `jose` (JWT propio, no next-auth) ✅, `zod` instalado pero subutilizado, `playwright` instalado **sin configurar** (sin `playwright.config.ts` ni `tests/`).

---

## Plan de inserción — multi-tenant + RBAC sobre el código real (no diseño desde cero)

1. **Tenant = `Workspace`, no un modelo nuevo.** No crear `tenantId`/`Tenant` paralelo — el master prompt usa "tenant" como sinónimo conceptual de lo que este repo ya llama `Workspace`. Confirmar esta equivalencia explícitamente en el Bloque 1 y usarla en todo el código nuevo (evita el error que la sección 3 del master prompt advierte: "no crear `tenantId` duplicado").
2. **Cerrar las 2 fugas cross-tenant reales primero** (antes de RBAC): mover `Settings` a scoped-por-`Workspace` (o separar lo que sí debe ser global de lo que no) y agregar `workspaceId` a `ApiKey`.
3. **Capa repository/service — insertar, no reescribir:** crear `src/repositories/` con un wrapper por modelo de negocio (empezando por los que ya tienen `workspaceId`) que inyecte el filtro automáticamente; los 32 route handlers existentes se migran incrementalmente a usar esta capa en vez de `prisma` directo, priorizando los módulos que tocan datos de más de un tenant (contactos, pagos, calendarios) sobre los que ya son de bajo riesgo.
4. **RBAC formal sobre `roles.ts`, no reemplazándolo:** extender el enum de 4 roles a los 7 del master prompt y agregar la capa de permisos explícitos (`canCreateLead`, etc.) como una función `hasPermission(role, permission)` nueva en `roles-shared.ts`, manteniendo `requireRole`/`isRoleContext` como el mecanismo de guard ya usado en 32 rutas (agregar `requirePermission` como hermano, no reemplazo, para no forzar una migración masiva de las rutas existentes en una sola noche — regla no negociable #5, sin refactors masivos).
5. **Middleware nuevo (`src/middleware.ts`)** para resolver `workspace` + `role` una vez por request y cerrar el fail-open actual — las rutas ya migradas a la capa repository/service lo consumen, las que no, siguen funcionando con `requireRole` mientras se migran.
6. **Unificar los dos mecanismos de auth de API** (`requireRole` vs. `getAuth` directo) — todo lo nuevo usa `requireRole`/`requirePermission`, y las rutas de pipeline/marketing existentes se documentan como deuda técnica a migrar, no se tocan todas esta noche.
7. **`AuditEvent` y `logAudit()` ya sirven tal cual** para el requisito de auditoría de acciones críticas — extender su uso a los módulos nuevos (Meta connect/disconnect, cambio de rol, aprobación de contenido, kanban de asesores), no crear un sistema de auditoría paralelo.
8. **Testing:** instalar y configurar Playwright desde cero (`playwright.config.ts` + carpeta `tests/e2e/`) como parte del Bloque 1, ya que el Bloque 0 confirmó que la dependencia existe pero nunca se configuró.

---

**Meta del bloque:** inventario de los 8 puntos ✅ + plan de inserción sobre código real ✅. `tsc`/`build`: este bloque es solo lectura y documentación, no debería romper nada (ver verificación abajo).
