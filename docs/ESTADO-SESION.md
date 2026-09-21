# Estado de sesión — CRM RAI Agency
Última actualización: 20 septiembre 2026 (sesión OpenCode, rama `security/fase-0`)

## Hecho en la última sesión
- **Etapa 1 — Panel reconciliado** (commits docs `4908ab0`, `628f92b`): `docs/planning/panel-control.html` marcó Prioridad 0 (auth real) cerrada, items de FASE 00 con sus commits reales y fecha actualizada.
- **Etapa 2 — Seguridad sin RLS** (commits `8fceff5`, `a7743bb`, `4533e43`, `cb2f057`, verificado en ese orden): scope por `workspaceId` en 19 rutas + migración `require_apikey_workspace_scope` (no ejecutada), staff hotel operativo, cron fail-closed, Commit 4 con super_admin/agency_owner en guards. 152/152 tests.
- **Etapa 3 — Auth real por invitación (Prioridad 0)** (commit `2ee646f`): `User.passwordHash`, scrypt nativo (`src/lib/password.ts`), rate-limit en memoria (`src/lib/rate-limit.ts`), `/api/auth/register` (403 sin invitación, excepción SUPER_ADMIN_EMAILS) + `/api/auth/login`, páginas `/login` + `/registro`, `AuthShell`, cookie `rai_session` httpOnly, `signJwt()` en auth.ts, Sidebar vía `apiFetch`. Migración `20260920120000_add_user_password_hash` creada NO ejecutada. 173/173 tests, tsc limpio.
- **Etapa 4 — Plan RLS** (commit docs `9d2f280`): `docs/planning/PLAN-RLS.md` — políticas por tabla, roles `crm_app`/`crm_service`, inyección vía `SET LOCAL` dentro de `$transaction`. Hallazgo crítico: `DATABASE_URL` usa superusuario `postgres` → hay que crear `crm_app` antes de habilitar RLS. Ejecución bloqueada (Plan Mode con Reiner).
- **Etapa 5 — CI + ESLint** (commit `4b2c2d9`): `.github/workflows/ci.yml` (prisma generate + tsc + lint + vitest por push/PR), ESLint con reglas de seguridad (0 errores/67 warnings), scripts `lint` y `typecheck` en package.json.
- **Comprobación de Etapa 6 — Saneo git (parcial):** `96ee2c8` YA está en main (pendiente anotado antes quedó resuelto). PR #3 (módulo Instagram huérfano) y PR #7 (B2A, conflictuado) siguen abiertos remotos y tocan archivos afectados por seguridad — requieren decisión de Reiner.

## Decisiones tomadas
- Registro SOLO por invitación (descartado registro público/manual); única excepción bootstrap via `SUPER_ADMIN_EMAILS`. Reutiliza flujo de invitación existente vía `POST /api/team` con `status='invited'`.
- Implementación auth con scrypt nativo de Node (bcryptjs no está en deps). JWT HS256 7 días, mismo payload que `verifyJwt`.
- RLS: inyección del workspace con `SET LOCAL` dentro de `$transaction` interactivo por request (el pooler transaction-mode recicla conexiones; SET de sesión no sobrevive). Se descartó header+set_config y derivar del rol JWT.
- ESLint corre con reglas de seguridad como `error` y deuda legacy como `warning` (no bloquear CI con ruido pre-existente).
- Quadro Café: se activará recién cuando RLS esté diseñado Y probado (mantiene vigencia).

## Archivos/módulos tocados
- `prisma/schema.prisma` (`User.passwordHash`), `prisma/migrations/20260920120000_add_user_password_hash/migration.sql` (nueva, sin ejecutar).
- `src/lib/{password,rate-limit,client-api}.ts` (nuevos), `src/lib/auth.ts` (signJwt, SESSION_COOKIE, getAuth cookie+Bearer).
- `src/app/api/auth/{register,login}/route.ts` (nuevos), `src/app/{login,registro}/page.tsx`, `src/components/auth/AuthShell.tsx` (nuevos), `src/components/layout/Sidebar.tsx`.
- Tests: `src/lib/__tests__/{password,rate-limit,auth-register,auth-login}.test.ts` (nuevos).
- `.github/workflows/ci.yml`, `.eslintrc.cjs` (nuevos), `package.json` (scripts lint/typecheck + deps dev eslint/TS/security/next/react-hooks), `package-lock.json`.
- `docs/planning/PLAN-RLS.md` (nuevo), `docs/planning/panel-control.html`, `docs/ESTADO-SESION.md` (este).

## Pendiente para la próxima sesión
- **Etapa 7 — Producto** (próximo gran bloque): orden vigente B2A calendario núcleo → B2B automatización → 4 → 3 → 5 → 6 del catálogo GHL; actualizar `panel-control.html` con cada cierre. Confirmar con Reiner si arranca B2A (PR #7 viejo conflictuado puede servir de insumo).
- **RLS (bloqueado, requiere Plan Mode con Reiner):** ejecutar `PLAN-RLS.md` en 16 pasos; primero crear `crm_app`/`crm_service`, mover `DATABASE_URL`/`DIRECT_URL`, migrar `engine.ts` (cron) y `pipeline-worker.ts` a `crm_service`; probar en tenant de prueba.
- **Migraciones Prisma pendientes:** `20260919120000_require_apikey_workspace_scope` (requiere backfill manual de claves legacy) y `20260920120000_add_user_password_hash` — ambos con `migrate deploy` tras aprobación.
- **Env de Vercel (hacerlo Reiner):** `SUPER_ADMIN_EMAILS` (sin esto nadie puede crear la primera cuenta), `JWT_SECRET`, `CRON_SECRET`; rotación de Stripe key; decisión del plan Hobby (cron).
- **PRs remotos:** decidir destino de PR #3 (Instagram huérfano: resucitar/descartar; toca roles-shared/Sidebar/schema/vercel.json) y PR #7 (B2A conflictuado). `git push` de esta rama + merge a main requieren aprobación.