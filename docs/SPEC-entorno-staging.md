# SPEC — Entorno de staging (Bloque 0)

Estado: **v1 (10 oct 2026) — cerrada para la parte de repositorio; la infraestructura la aprueba y provisiona Reiner (§5).**
Rama prevista: `rai-chore-staging-entorno` (desde la punta de `rai-feat-login-registro-ui`). Va ANTES del bloque A del prompt maestro, pero sus slices de repositorio no dependen de la infraestructura: pueden avanzar mientras Reiner provisiona.

## 1. Objetivo
Tener un entorno separado de producción donde probar migraciones, registro/login real, el planificador de publicación y la integración con Meta (modo Desarrollo) sin poner en riesgo la única base de datos actual.

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
- **S0-4 Guardia de base de datos:** `scripts/db-guard.mjs` y scripts npm `staging:migrate` / `staging:seed` que se ABORTAN si `APP_ENV` no es `staging` o si el host de `DATABASE_URL` coincide con `PROD_DB_HOST` (variable que Reiner define y que contiene el host de producción, no secretos). Tests de la lógica de comparación.
- **S0-5 Plantilla y documentación:** `.env.staging.example` (solo nombres y valores de ejemplo `<placeholder>`), y `docs/ENTORNOS.md` con la matriz local/staging/producción: qué base, qué Upstash, qué bucket, qué app Meta, qué URL, quién puede aplicar migraciones.
- **S0-6 Seed de staging:** `scripts/seed-staging.mjs` idempotente que crea un workspace y usuarios de demostración con datos falsos, usando la misma utilidad de hash que `register/route.ts`. Se niega a correr si `APP_ENV !== 'staging'`. Credenciales de demo en el propio archivo de seed, nunca reales ni impresas en logs.

## 4. Criterios de aceptación (repositorio)
1. `tsc`, lint, `vitest run` y `build` verdes; tests nuevos para `app-env` y la lógica de `db-guard`.
2. `env-check` nunca imprime valores completos ni secretos (test con valores ficticios).
3. `db-guard` aborta con `APP_ENV=production` y con host de producción; solo continúa con `APP_ENV=staging` y host distinto.
4. La insignia no aparece con `APP_ENV=production` ni sin la variable.
5. `docs/ENTORNOS.md` completo y enlazado desde el panel y `ESTADO-SESION.md`.
6. Sin push, merge, deploy ni acciones sobre bases remotas.

## 5. Infraestructura que aprueba y provisiona Reiner (el agente deja las instrucciones exactas y marca `blocked`; no pregunta)
| Id | Acción | Quién | Notas |
|---|---|---|---|
| R1 | Crear proyecto Supabase `crm-rai-staging` | Reiner (o el agente con su aprobación explícita y confirmación de costo) | El plan gratuito suele permitir 2 proyectos activos; **no verificado**. |
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
