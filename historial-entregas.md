# Historial de entregas — CRM RAI Agency

> Registro de cada bloque cerrado durante la ejecución nocturna de `v3.0-master-prompt/MASTER-PROMPT-V3-NOCTURNO.md`. Un bloque por sección, fecha + qué se entregó + qué quedó bloqueado. No se borra entre sesiones.

---

## 3 sep 2026 — BLOQUE 0: Diagnóstico, sincronización y fix de entorno

**Rama:** `v3/bloque-0-diagnostico-sincronizacion` · **PR:** (este mismo bloque, ver enlace en el mensaje del PR)

### Completado

1. **Clon local localizado y confirmado.** `content-engine-mvp` (worktree principal, rama `main`) con remote `https://github.com/reinerramos2702-jpg/crm-rai-agency.git` — ya no dice `content-engine-mvp` como nombre de repo remoto, solo la carpeta local conserva el nombre viejo.
2. **Sincronización modo espejo:** `git fetch origin` + comparación de HEAD — `main` local ya estaba **100% al día** con `origin/main` (`8eb1ccc`), sin divergencia. No hizo falta pull/rebase.
3. **`GITHUB_TOKEN` inválido — diagnosticado, workaround aplicado, fix permanente PENDIENTE de aprobación del usuario:**
   - Causa confirmada: variable de entorno de **usuario** de Windows `GITHUB_TOKEN` con un token `ghp_...` expirado/inválido, que `gh` prioriza sobre la cuenta autenticada por device flow (keyring, cuenta `reinerramos2702-jpg`, scopes `gist, read:org, repo`).
   - Intento de borrarla (`[Environment]::SetEnvironmentVariable("GITHUB_TOKEN", $null, "User")`) fue **bloqueado por el permission classifier** de Claude Code (cambio de entorno persistente del sistema, fuera de alcance sin confirmación explícita del usuario).
   - **Workaround aplicado toda la noche:** anteponer `GITHUB_TOKEN= GH_TOKEN=` a cada invocación de `gh`, forzando el uso de la cuenta del keyring. Confirmado funcional (usado para pushear ramas, comentar y abrir PRs).
   - **Acción pendiente para el usuario:** borrar manualmente la variable de entorno de usuario `GITHUB_TOKEN` en Windows (Panel de Control → Variables de entorno, o `[Environment]::SetEnvironmentVariable("GITHUB_TOKEN", $null, "User")` en una PowerShell propia) para que `gh auth status` vuelva a mostrar `Active account: true` en la cuenta correcta sin necesitar el workaround.
4. **Diagnóstico real del repo confirmado vía `gh pr list --state all`:**
   - **PR #1** (fix build Fase 1) → **MERGEADO**, confirmado en el historial de commits (`Merge pull request #1 from fase-1/estabilizacion`).
   - **PR #2** "BLOQUE 0 — Renombrado de marca" (`v2/renombrado-marca` → `main`) → **ABIERTO**, sigue esperando aprobación/merge explícito del usuario. No se tocó (regla no negociable #2).
   - **Rama Instagram huérfana** `claude/rai-instagram-crm-automation-ykkwg2` → seguía suelta, sin PR. Diverge de `main` en `4d60003` con 5 commits propios (módulo completo de auto-publicación + DMs por keyword, `src/lib/instagram.ts` 527 líneas, 34 archivos, +3201/-52). **Se abrió PR #3** de revisión (`main` ← rama Instagram) para que el usuario decida integrar/descartar — no se mergeó.
   - **Playwright:** está en `package.json` como dependencia (`"playwright": "^1.60.0"`) pero **sin configurar** — no existe `playwright.config.ts`, ni carpeta `tests/`/`e2e/`, ni script de test. El testing obligatorio de la sección 3 del master prompt necesita instalar `@playwright/test` y crear la configuración desde cero en el Bloque 1 (no solo "usarlo", hay que armarlo).
   - **Deploy vivo con residuos de otro proyecto** (`content-engine-mvp.vercel.app` mostrando "Cargando KPIs del hotel…") — confirmado, sigue sin resolver. Es un problema de configuración de deploy en Vercel, no de código; queda documentado, no se toca desde este bloque (fuera de alcance de diagnóstico de git/código).
   - **Check de Cloudflare Workers en rojo en PR #2** — confirmado presente, no bloqueante (Vercel preview sí compiló). Sigue sin decidirse si la integración de Cloudflare sigue siendo necesaria; queda para revisión del usuario junto con el merge de PR #2.
5. **Worktree `crm-rai-agency-v2`** (rama `v2/modulo-calendario-contenido`, construida sobre PR #2) — reconciliado en sesión previa (3 sep), trabajo pendiente ya comiteado (`05257e8`) y pusheado a `origin/v2/modulo-calendario-contenido`.
6. **`npx tsc --noEmit` NO estaba limpio — ni en el worktree del calendario ni en `main`** (regla explícita de esta sesión: confirmar limpio antes de tocar el módulo de calendario). 5 errores, **preexistentes en `main`, no introducidos por el módulo de calendario**:
   - `src/app/api/payments/[id]/transition/route.ts` — `PaymentEvent.meta` (campo `Json` de Prisma) recibía un `Record<string, unknown>` sin el cast que ya usa el resto del repo (`Prisma.InputJsonValue`, patrón visto en `src/agents/orchestrator.ts`, `src/app/api/finalize/route.ts`). Fix: mismo patrón `as unknown as Prisma.InputJsonValue`.
   - `src/app/api/workspace/brand-doc/route.ts` — `getOrCreateWorkspace()` devuelve `Workspace | CachedWorkspace` (el tipo cacheado solo tiene `{id,name,ownerId}`), así que TS no dejaba leer `brandDocName/Text/UpdatedAt` del resultado. Fix acotado a este archivo: consulta propia con `prisma.workspace.findUnique({select:...})` para esos 3 campos en vez de leerlos del objeto cacheado — evita además servir un doc de marca desactualizado si cambió después de cachear el workspace (bug de staleness real que hubiera quedado si solo se ensanchaba el tipo cacheado). No se tocó `src/lib/workspace.ts` (usado por todos los módulos) para no arriesgar un cambio ancho por un fix de 2 archivos.
   - Bloqueaba el criterio "`tsc` limpio" de **todos** los bloques siguientes del master prompt, por eso se corrigió aquí en vez de solo documentarlo. `npx tsc --noEmit` → exit 0 confirmado en ambos worktrees tras el fix.

### Orden de ejecución decidido para el resto de la noche

- **Bloque 0.5 (auditoría de arquitectura)** — sigue inmediatamente, obligatorio antes de tocar cualquier código de producto, aunque el diagnóstico sugiera que partes del Bloque 1/2A ya podrían existir en `v2/modulo-calendario-contenido`.
- **Bloque 1 (multi-tenant + RBAC + Meta híbrido)** — su necesidad real (¿ya existe algo?) se confirma en el 0.5, no aquí.
- **Bloque 2A/2B (calendario)** — el worktree `crm-rai-agency-v2` ya tiene avance real (`service.ts`, `publisher.ts`, `settings/route.ts`, schema) — el 0.5 debe inventariarlo en detalle para no reconstruir.
- **Bloques 3-6** — sin cambios de orden respecto al master prompt (dependen de los anteriores).

### Bloqueado

- Fix permanente de `GITHUB_TOKEN` (variable de entorno de usuario) — requiere acción manual del usuario, ver arriba. No bloquea el resto de la noche gracias al workaround por sesión.
- Deploy vivo con residuos de Hotel MPV — fuera de alcance de este bloque (config de Vercel, no código/git).

### Verificación

- `git rev-parse HEAD origin/main` → mismo hash, confirmado sincronizado.
- `gh pr list --state all` (con workaround) → funcional, 3 PRs abiertos/cerrados listados correctamente.
- `tsc`/`build`: este bloque no tocó código de producto (solo diagnóstico + este archivo), no aplica.

---

## 3 sep 2026 — BLOQUE 0.5: Auditoría de arquitectura

**Rama:** `v3/bloque-0.5-auditoria-arquitectura` (apilada sobre `v3/bloque-0-diagnostico-sincronizacion`) · **Doc completo:** `docs/AUDITORIA-ARQUITECTURA-BLOQUE-0.5.md`

### Completado

Inventario de los 8 puntos exigidos por el master prompt (modelo Prisma, auth, roles, middleware, estructura de carpetas, patrones de API, componentes reutilizables, estado del frontend) + plan de inserción de multi-tenant/RBAC sobre el código real. Hallazgos clave:

- **`Workspace` ya es el tenant** — no hace falta crear un modelo `Tenant`/`tenantId` nuevo, solo tratar `Workspace` como el tenant del master prompt.
- **2 fugas cross-tenant reales a cerrar primero en el Bloque 1:** `Settings` (singleton global compartido por todos los tenants) y `ApiKey` (ligado a `User`, no a `Workspace`).
- **Roles:** enum plano de 4 (`admin/gerente/agente/viewer`), sin permisos granulares, usado en 32 rutas API vía `requireRole`/`isRoleContext` — el RBAC formal debe extender esto (7 roles + permisos explícitos), no reemplazarlo, para no forzar una migración masiva de las 32 rutas en una noche.
- **Sin middleware, sin capa repository/service** — acceso a Prisma directo desde cada route handler. Punto de inserción recomendado: `src/middleware.ts` nuevo + `src/repositories/` incremental, migrando módulo por módulo.
- **`AuditEvent`/`logAudit()` ya funcionan** (17 usos, módulo hotelero) — reusar tal cual para las acciones críticas de los bloques 1-6, no crear un sistema paralelo.
- **Playwright instalado pero sin configurar** — el Bloque 1 debe crear `playwright.config.ts` + `tests/e2e/` desde cero.

### Bloqueado

Ninguno — bloque de solo lectura/documentación, sin dependencias externas.

### Verificación

- `npx tsc --noEmit` → exit 0 (bloque no tocó código de producto).
- Inventario de los 8 puntos + plan de inserción documentados en `docs/AUDITORIA-ARQUITECTURA-BLOQUE-0.5.md`.

---

## 3 sep 2026 — BLOQUE 1: Fundación multi-tenant + RBAC + Meta híbrido

**Rama:** `v3/bloque-1-multitenant-rbac-meta` (apilada sobre 0.5) · Siguiendo el plan de inserción de la auditoría — sin reescritura masiva (regla no negociable #5).

### Completado

**Multi-tenant (Fase 2):**
- Confirmado `Workspace` = tenant (sin modelo `Tenant` nuevo).
- Cerrada la fuga cross-tenant de `ApiKey`: agregado `workspaceId` (nullable, migración aditiva, sin backfill automático — ver `prisma/migrations/20260903120000_add_meta_hybrid_and_apikey_workspace/migration.sql`).
- Capa `repository`/`service` **iniciada** en `src/repositories/` (`base.ts` con `assertWorkspaceScope`, `workspaceMetaRepository.ts`) — patrón de referencia aplicado al módulo Meta (nuevo esta noche), **no retrofit de las 32 rutas existentes** (mega-refactor prohibido). Sigue como deuda documentada, migración incremental futura.
- La fuga de `Settings` (singleton global compartido entre tenants) **queda documentada, no resuelta** — tocar sus 10 archivos consumidores era más alcance del que este bloque podía cerrar con calidad esta noche (regla #4: mejor entregar la mitad completa que todo a medias). Ver "Bloqueado" abajo.

**RBAC formal (Fase 3):**
- `src/lib/roles-shared.ts` extendido de 4 a los 7 roles del master prompt (`super_admin`, `agency_owner`, `admin`, `gerente`, `agente`, `staff`, `viewer`) **sin renombrar los 4 originales** — mantiene compatibilidad con las 32 rutas que ya usan esos strings.
- 8 permisos explícitos (`canCreateLead`, `canViewReports`, `canManageTeam`, `canManageBilling`, `canConnectMeta`, `canManageContent`, `canApproveContent`, `canManageAdvisors`) + `PERMISSIONS_BY_ROLE` (default por rol) + `hasPermission()` con soporte de overrides puntuales.
- `requirePermission()` nuevo en `src/lib/roles.ts`, hermano de `requireRole` (no reemplazo) — autorización siempre en backend.
- **Pruebas:** 43/43 unit tests pasando (`npx vitest run`) — `src/lib/__tests__/roles-shared.test.ts` (37, cobertura de `hasPermission`/`isAdmin`/`hasModuleAccess` para los 7 roles) + `src/lib/__tests__/roles.test.ts` (6, `requireRole`/`requirePermission` devolviendo 401/403/RoleContext correctamente vía mocks).

**Meta híbrido (Fase 4):**
- Modelo `WorkspaceMetaConnection` nuevo (1:1 con `Workspace`): `metaMode` (`shared_app`/`own_app`), credenciales own_app cifradas (AES-256-GCM, `src/lib/crypto.ts` reusado), access token cifrado, `igBusinessId`, `pageId`, expiración.
- `GET/PATCH/DELETE /api/workspace/meta` — gestión del modo y credenciales, permiso `canConnectMeta`, audit log en cada cambio.
- `GET /api/workspace/meta/oauth/start` + `/oauth/callback` — flujo OAuth dinámico completo (Container API, canje de token corto→largo, resolución de página/IG business), `state` firmado con HMAC (reusa `JWT_SECRET`) para que el callback (redirect de browser sin header `Authorization`) no pueda forjarse hacia el workspace de otro tenant.
- **Fix real del leak identificado en la auditoría:** `POST /api/publish/instagram` migrado de `Settings.igBusinessId` global + `ApiKey` por usuario → `WorkspaceMetaConnection` por workspace. Agrega audit log de éxito/fallo de publicación (adelanta un requisito del Bloque 2B).
- Variables nuevas documentadas en `.env.example`: `META_SHARED_APP_ID`, `META_SHARED_APP_SECRET`, `META_OAUTH_REDIRECT_URI`.
- **No probado en vivo:** requiere una app de Meta real verificada (Business Verification) que no existe en este entorno — el código sigue la spec del Graph API v19 correctamente, pero el flujo OAuth completo (start→Meta→callback) no se ejecutó contra Meta real esta noche. Riesgo conocido a validar por el usuario con credenciales reales.

**Testing (Fase 5 — obligatorio por bloque, sección 3):**
- `vitest` + `@playwright/test` instalados y configurados desde cero (`vitest.config.ts`, `playwright.config.ts` con proyectos desktop + mobile `hasTouch`/`isMobile` para paridad móvil del Bloque 3).
- `tests/e2e/login.spec.ts` — **3/3 passed, ejecutado de verdad** contra el dev server real. Hallazgo: no existe login UI real (auth JWT-bearer desde SSO externo, sin form propio) — el test cubre el bypass de dev y documenta cómo se probaría un JWT real.
- `tests/e2e/tenant-isolation.spec.ts` — prueba más crítica del bloque (2 workspaces demo, confirma que ninguno ve datos del otro), con cleanup completo. **Skip-guardado por falta de `DATABASE_URL`** en este sandbox — no es un falso positivo, es una skip explícita y documentada.
- `tests/e2e/core-flows.spec.ts` — 1/2 passed. El de publicación (sin Meta conectado → 401/422 claro) pasa. **El de creación de lead encontró un bug real preexistente, no introducido esta noche:** el botón "Crear" de `AddOpportunityModal` (`src/app/clientes-potenciales/page.tsx`) es un placeholder de Fase 1 — solo hace `toast.success(...)` sin persistir nada vía API. El test falla intencionalmente con mensaje diagnóstico claro apuntando al archivo/línea exacta, en vez de dar falso positivo. **Queda como hallazgo para un bloque futuro** (Bloque 2A/4), no se arregló aquí (fuera del alcance de multi-tenant/RBAC/Meta).
- `npx tsc --noEmit` y `npm run build` limpios con todo lo anterior integrado.

### Bloqueado / diferido (documentado, no abandonado)

- **`Settings` (leak cross-tenant) sin resolver** — 10 archivos consumidores (`llm-providers.ts`, `automations/engine.ts`, `automations/actions.ts`, `webhook/dispatch`, `settings/route.ts`, `keys/route.ts`, `automations/route.ts`, `music-agent.ts`, `audio-agent.ts`, más el ya migrado `publish/instagram`). Requiere su propio bloque de migración incremental — anotado como deuda técnica explícita, no un olvido.
- **OAuth Meta no probado contra la API real** — requiere credenciales de una app de Meta verificada que no existen en este entorno. Riesgo conocido, documentado arriba.
- **Migración a `repository`/`service` solo del módulo Meta** — las 32 rutas existentes con `prisma` directo quedan igual, siguiendo el patrón documentado en `docs/AUDITORIA-ARQUITECTURA-BLOQUE-0.5.md` para migración incremental futura.
- **Bug preexistente descubierto por testing** (creación de oportunidad no persiste) — documentado arriba, no corregido en este bloque (fuera de alcance).
- **`npx prisma migrate deploy` + `npx prisma generate` contra la DB real** — la migración quedó escrita a mano (`prisma/migrations/20260903120000_.../migration.sql`) siguiendo la regla de migraciones seguras del master prompt; **el usuario debe correrla en Windows PowerShell** contra la DB real antes de que el código nuevo (`WorkspaceMetaConnection`, `ApiKey.workspaceId`) funcione en un entorno con datos reales. `npx prisma generate` (solo client, sin tocar DB) sí se corrió aquí para que `tsc` compile.

### Verificación

- `npx tsc --noEmit` → exit 0.
- `npm run build` → exit 0 (tras limpiar `.next` corrupto de un build previo — no relacionado con este bloque).
- `npx vitest run` → 43/43 passed.
- `npx playwright test` → login 3/3 passed, tenant-isolation 4/4 skipped (sin DB, documentado), core-flows 1/2 passed (1 falla documentando un bug real preexistente).

---

## 3 sep 2026 — CIERRE DE LA NOCHE

**Bloques completados:** 0, 0.5, 1, 2A, 2B (primera pieza acotada). Ver detalle de cada uno arriba (Bloques 0/0.5/1) y en `historial-entregas.md` del worktree `crm-rai-agency-v2` (Bloques 2A/2B, rama distinta esa noche).

**Bloques 3, 4, 5, 6 — bloqueados, no iniciados, decisión deliberada:** todos dependen explícitamente en el propio master prompt de que el Bloque 1 esté "completo" (Bloque 4: "requiere Bloque 1 completo primero") y/o el Bloque 4 esté completo (Bloques 5 y 6). El Bloque 1 sigue como PR abierto sin revisar (#6) — construir Captación de Asesores/RRHH-lite (rol `STAFF`, `AGENCY_OWNER`) sobre un RBAC que todavía puede cambiar en revisión habría arriesgado exactamente lo que la sección 3 del master prompt más cuida: arquitecturas paralelas y deuda técnica compuesta. Se decidió no forzarlo — regla no negociable #4 ("cuando exista conflicto entre velocidad y arquitectura, gana arquitectura") y Principio de Evolución del Producto (sección 13).

**PRs abiertos al cierre (ninguno mergeado, todos esperando revisión — regla no negociable #2):**
1. #1 — fix build Fase 1 → **ya mergeado antes de esta noche**, no aplica.
2. #2 — Bloque 0 renombrado de marca (v2.0-master-prompt) → sigue abierto, anterior a esta noche.
3. #3 — Revisión rama Instagram huérfana → abierto esta noche, informativo (decidir integrar/descartar).
4. #4 — Bloque 0: diagnóstico, sincronización, fix `tsc` repo-wide.
5. #5 — Bloque 0.5: auditoría de arquitectura + plan de inserción.
6. #6 — Bloque 1: multi-tenant + RBAC + Meta híbrido (43 tests unitarios, Playwright configurado).
7. #7 — Bloque 2A: Calendario de Contenido, núcleo (slider, drag&drop, estados, API CRUD).
8. #8 — Bloque 2B (pieza): botón Publicar ahora.

**Total: 6 PRs nuevos esta noche (#3-#8) + 1 preexistente (#2) — 7 esperando tu revisión.**

**Decisiones que necesitan tu aprobación mañana:**
- Borrar manualmente la variable de entorno de usuario `GITHUB_TOKEN` (inválida, Windows) — bloqueaba `gh`, hay workaround de sesión pero no es permanente.
- Orden de revisión sugerido: #4 → #5 → #6 (son secuenciales/apilados) → #7 → #8 (secuenciales) → #2 y #3 (independientes, cuando quieras).
- Correr `npx prisma migrate deploy` + `npx prisma generate` en Windows PowerShell contra la DB real (Bloque 1 agrega `WorkspaceMetaConnection` y `ApiKey.workspaceId`; Bloque 2A ya tenía su migración de una sesión previa) — nada de esto se aplicó a una DB real esta noche, solo se escribió el SQL.
- Decidir si `Settings` (singleton global, leak cross-tenant documentado en la auditoría) se scoping en un bloque dedicado próximo, o se pospone.
- Decidir si el bug real encontrado por testing (botón "Crear" de oportunidades en `/clientes-potenciales` no persiste, solo `toast`) se arregla como parte de un futuro Bloque 2A/4, o antes.
- Credenciales reales de una app de Meta verificada — el flujo OAuth híbrido del Bloque 1 está completo en código pero nunca se probó contra Meta real (no hay app verificada en este entorno).

**Ningún dato de producción tocado, ninguna migración aplicada a una DB real, ningún merge ni deploy hecho por esta sesión.**

---
