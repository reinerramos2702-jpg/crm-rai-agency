# SPEC — Entorno de staging (Bloque 0)

Estado: **v1.1 (11 oct 2026) — cerrada para la parte de repositorio; la infraestructura la aprueba y provisiona Reiner (§5). v1.1: modo B (schema `staging`) como arranque y modo A (proyecto Supabase aparte) como destino escalable.**
Rama prevista: `rai-chore-staging-entorno` (desde la punta de `rai-feat-login-registro-ui`). Va ANTES del bloque A del prompt maestro, pero sus slices de repositorio no dependen de la infraestructura: pueden avanzar mientras Reiner provisiona.

## 1. Objetivo
Tener un entorno separado de producción donde probar migraciones, registro/login real, el planificador de publicación y la integración con Meta (modo Desarrollo) sin poner en riesgo la única base de datos actual.

## 1b. Modos de staging (decisión del 11 oct)
Un único código soporta dos modos; cambiar de uno a otro es solo cambiar las URLs de conexión, sin tocar código ni datos de producción:
- **Modo B — `schema` (arranque, gratis):** mismo proyecto Supabase, schema `staging` (`DATABASE_URL`/`DIRECT_URL` con `?schema=staging`). No gasta el segundo cupo gratuito. Mitigación obligatoria del riesgo (misma instancia): un rol de base de datos `crm_staging` con permisos SOLO sobre el schema `staging` (sin acceso a `public`), de modo que una URL equivocada falle en vez de tocar producción.
- **Modo A — `project` (cuando entren clientes reales):** proyecto Supabase `crm-rai-staging` aparte. Aislamiento total.
`APP_ENV=staging` en ambos. La guardia de base de datos (S0-4) valida el modo: en B exige schema `staging` (nunca `public`) y rol distinto del de producción; en A exige host distinto de `PROD_DB_HOST`.

## 2. Estado real verificado (10 oct 2026)
- Supabase: **un solo proyecto** (`wckufllomfmuwxptegvm`, activo, región us-east-1, creado el 2 ago). No existe base de staging.
- Vercel: plan Hobby, proyecto `crm-rai-agency` conectado a GitHub (`reinerramos2702-jpg/crm-rai-agency`); ya genera previews por rama.
- Variables que el código lee (`.env.example`): `DATABASE_URL`, `DIRECT_URL`, `UPSTASH_REDIS_REST_URL/TOKEN`, `R2_*` (5), `JWT_SECRET`, `DEV_BYPASS_AUTH`, `SUPER_ADMIN_EMAILS`, `KEYS_ENCRYPTION_KEY`, `HARD_CAP_USD_PER_EXECUTION`, `N8N_WEBHOOK_URL`, `NEXT_PUBLIC_APP_URL`, `INVENTORY_ALLOWED_ROOTS`, `META_SHARED_APP_ID/SECRET`, `META_OAUTH_REDIRECT_URI`.
- `.env.local` y `.env.production` existen en local y están ignorados por git (no se leen ni se imprimen sus valores). **No verificado:** a qué base apunta hoy `.env.local` (se sospecha que a la única base). Verificarlo sin exponer secretos es la tarea S0-1.
- En builds de Vercel `NODE_ENV=production`, por lo que `DEV_BYPASS_AUTH` se ignora (`src/lib/auth.ts`): staging usa login real.

## 3. Alcance de repositorio (ejecutable por OpenCode)
Slices en orden, cada uno con gate (`node scripts/gate.mjs --fast`; el build completo al cerrar el bloque):
- **S0-1 Diagnóstico seguro de entorno:** script `scripts/env-check.mjs` que imprime SOLO el host enmascarado de `DATABASE_URL`/`DIRECT_URL` (p. ej. `db.wck…supabase.co`), el `APP_ENV` y qué variables obligatorias faltan (nombres, nunca valores). Con él Reiner confirma a qué base apunta cada archivo `.env*`.
- **S0-2 Variable `APP_ENV`:** valores `local | staging | production`. Helper `src/lib/app-env.ts` con validación y tests. Sin dependencias nuevas.
- **S0-3 Insignia de entorno:** cuando `APP_ENV !== 'production'`, una etiqueta pequeña y fija "STAGING"/"LOCAL" (esquina, contraste AA, no bloquea clics, ambos temas). No aparece en producción.
- **S0-4 Guardia de base de datos:** `scripts/db-guard.mjs` y scripts npm `staging:migrate` / `staging:seed` que se ABORTAN si `APP_ENV` no es `staging`. Modo B: abortan si el schema de la URL no es exactamente `staging` o si el usuario de conexión coincide con el de producción. Modo A: abortan si el host de `DATABASE_URL` coincide con `PROD_DB_HOST` (variable que Reiner define y que contiene el host de producción, no secretos). Tests de la lógica de comparación para ambos modos.
- **S0-5 Plantilla y documentación:** `.env.staging.example` (solo nombres y valores de ejemplo `<placeholder>`), y `docs/ENTORNOS.md` con la matriz local/staging/producción: qué base, qué Upstash, qué bucket, qué app Meta, qué URL, quién puede aplicar migraciones.
- **S0-6 Seed de staging:** `scripts/seed-staging.mjs` idempotente que crea un workspace y usuarios de demostración con datos falsos, usando la misma utilidad de hash que `register/route.ts`. Se niega a correr si `APP_ENV !== 'staging'`. Credenciales de demo en el propio archivo de seed, nunca reales ni impresas en logs.

## 4. Criterios de aceptación (repositorio)
1. `tsc`, lint, `vitest run` y `build` verdes; tests nuevos para `app-env` y la lógica de `db-guard`.
2. `env-check` nunca imprime valores completos ni secretos (test con valores ficticios).
3. `db-guard` aborta con `APP_ENV=production`, con host de producción (modo A), y con schema `public` o sin schema (modo B); solo continúa con `APP_ENV=staging` y un destino válido para su modo.
4. La insignia no aparece con `APP_ENV=production` ni sin la variable.
5. `docs/ENTORNOS.md` completo y enlazado desde el panel y `ESTADO-SESION.md`.
6. Sin push, merge, deploy ni acciones sobre bases remotas.

## 5. Infraestructura que aprueba y provisiona Reiner (el agente deja las instrucciones exactas y marca `blocked`; no pregunta)
| Id | Acción | Quién | Notas |
|---|---|---|---|
| R1 | **Modo B:** crear schema `staging` y rol `crm_staging` limitado a ese schema (SQL aditivo, reversible con `DROP SCHEMA staging CASCADE`). **Modo A:** crear proyecto Supabase `crm-rai-staging` | Reiner (o el agente con su aprobación explícita) | Verificado el 10 oct: el plan gratuito permite 2 proyectos activos y hoy hay 1; el modo B no gasta el cupo. |
| R2 | Obtener `DATABASE_URL` y `DIRECT_URL` de staging | Reiner | Solo en Vercel/archivo local ignorado; nunca en chat ni commits. |
| R3 | Crear rama `staging` y variables de entorno **de Preview** en Vercel apuntando a staging | Reiner | Variables específicas por rama en Hobby: **no verificado**. Alternativa: dominio/alias fijo para la rama. |
| R4 | Upstash y R2 separados (otra base/otro bucket, o prefijo) | Reiner | Evita mezclar colas y archivos. |
| R5 | `JWT_SECRET`, `KEYS_ENCRYPTION_KEY`, `CRON_SECRET` distintos de producción | Reiner | Generados al azar; nunca reutilizados. |
| R6 | App Meta en modo Desarrollo: añadir la URL de staging a los redirect URIs | Reiner | `RAI Agency Publisher` ya está en modo Desarrollo. |
| R7 | Aplicar migraciones a staging (`prisma migrate deploy` vía `staging:migrate`) | Reiner | Producción solo después, con aprobación aparte. |
| R8 | Secretos de GitHub Actions del planificador de staging | Reiner | Ver spec de publicación D4/D8. |

## 6. Prueba de humo en staging (cuando R1–R7 estén hechos)
Registro → login → dashboard en la URL de staging, con la insignia visible y sin tocar producción. Evidencia: capturas o salida de `env-check`.

## 7. Reglas fijas
- Nunca leer, imprimir ni commitear valores de `.env*`; nunca pegar cadenas de conexión en el chat.
- Nada contra producción: sin migraciones, seeds ni SQL remotos.
- Cero dependencias nuevas.
- Archivos de reglas intactos (ver `GUARDRAILS-ORQUESTADOR.md`).

## 8. Deuda a registrar
RLS en staging y producción (ver `PLAN-RLS.md`), refresco periódico de datos de staging, procedimiento de promoción staging → producción, respaldos, y el hallazgo del superusuario `postgres` en `DATABASE_URL`.
