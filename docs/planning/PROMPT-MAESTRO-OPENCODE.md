# PROMPT MAESTRO — OpenCode (orquestador) — 10 oct 2026 (ampliado 11 oct)

> **ESTADO: BORRADOR — NO ENVIADO a OpenCode.** Reiner decidió (11 oct) irlo ampliando poco a poco; solo se envía con su autorización expresa en el chat. Las novedades del 11 oct están en la §9 (adendas).

> Este archivo es el prompt completo. Reiner solo pega en OpenCode la línea de arranque indicada en el chat. Si algo de aquí contradice `AGENTS.md` o `.opencode/agent/orchestrator.md`, gana lo MÁS RESTRICTIVO.

## 0. Misión
Eres el orquestador director. Ejecutas, con mínima interacción, estos tres bloques EN ESTE ORDEN, cada uno desde su spec cerrada, y dejas el panel con evidencia verificable:

| Orden | Bloque | Spec (fuente de verdad del comportamiento) | Rama |
|---|---|---|---|
| 0 | Entorno de staging (parte de repositorio, slices S0-1…S0-6) | `@docs/SPEC-entorno-staging.md` | `rai-chore-staging-entorno` (créala desde la punta de la rama actual) |
| A | Login/registro premium + auto-registro | `@docs/SPEC-login-registro-ui.md` (v4) | `rai-feat-login-registro-ui` (ya existe; el Bloque 0 va antes, en su propia rama, y A continúa en esta rama) |
| B | Sistema visual premium | `@docs/SPEC-sistema-visual-premium.md` | `rai-feat-visual-premium` (créala desde la punta de A cuando A esté cerrado) |
| C | Publicación programada IG+FB (slices 1–7 con Meta simulado) | `@docs/SPEC-publicacion-contenido-ig-fb.md` (v2.1) | `rai-feat-publicacion-ig-fb` (créala desde la punta de B cuando B esté cerrado) |

Tres autoridades: el panel `docs/planning/panel-control.html` = estado y alcance; las specs = comportamiento y criterios de aceptación; el repo (código, tests, git) = implementación. Si panel y repo discrepan en implementación, manda el repo y corriges el panel. Infraestructura de staging (R1–R8 de la spec del Bloque 0): la provisiona Reiner; tú dejas las instrucciones exactas y el ítem `blocked`. Fuera de alcance: Hidromáticos (PAUSADO por Reiner), generación de imágenes, cuentas de clientes, publicación real en Meta, RLS, migraciones remotas, deploy.

## 1. Preflight (obligatorio, antes de tocar nada)
1. `git status` y `git branch --show-current`. Si hay cambios que no son tuyos (por ejemplo `docs/INTEGRACION-HIDROMATICOS.md`, `docs/clientes/`, `docs/referencia/`): NO los toques, NO los commitees, NO los descartes.
2. Verifica que existen `scripts/gate.mjs`, `scripts/panel-check.mjs`, `scripts/rules-guard.mjs` y `.rai-rules.lock`. Si NO existen: detente y reporta "faltan guardrails: Reiner debe integrar la rama `rai-chore-orquestador-guardrails`". No continúes sin ellos.
3. Corre `node scripts/rules-guard.mjs`. Si falla, detente y reporta qué archivo de reglas cambió. Nunca regeneres el lock tú.
4. Corre el gate BASE completo `node scripts/gate.mjs` (en Windows) y registra el resultado real (tsc, lint, vitest, build). Esa es la línea base; no atribuyas a tu trabajo fallos previos.
5. Lee: `AGENTS.md`, `docs/ESTADO-SESION.md`, el panel, las 3 specs, `docs/planning/GUARDRAILS-ORQUESTADOR.md`, `docs/planning/roadmap-agentes-rai.html`.

## 2. Plan gigante (UNA sola puerta de aprobación)
Escribe `docs/planning/PLAN-EJECUCION-OPENCODE.md` con: grafo de dependencias 0→A→B→C, y por cada slice/tarea: ID (`A-01`, `B-01`, `C-01`…), objetivo, archivos probables, criterio de aceptación medible (tomado de la spec), gate, riesgo y dependencias. Registra en el panel (solo atributos aditivos permitidos: `data-id`, `data-phase`, `data-depends-on`, `data-attempts`, `data-commit`) los ítems que correspondan. Luego muestra a Reiner un resumen de máximo 25 líneas y PÍDELE UNA SOLA APROBACIÓN ("¿apruebo el plan? sí/no/cambios"). Tras su "sí", ejecuta TODO sin volver a preguntar, salvo los casos de la sección 7.

## 3. Bucle por tarea (repite hasta agotar lo abordable)
1. Orienta: spec + estado + archivos afectados. Registra `started_at`, rama y archivos objetivo (nota en el panel).
2. Delega a `@backend`/`@frontend`; la verificación la hace `@qa` (distinto del implementador) y TÚ confirmas con `node scripts/gate.mjs --fast`. Un solo escritor a la vez; no cambies de rama mientras otro agente use el directorio.
3. Si falla: diagnostica la causa raíz, corrige, re-verifica. Misma estrategia 3 veces → cambia de enfoque; si persiste → ítem `blocked` con causa exacta y pasas al siguiente ítem abordable. Lleva `data-attempts`.
4. Si pasa: `node scripts/gate.mjs` completo cuando cierres un slice/bloque (con build). Commit local atómico con ID de tarea: `feat(A-03): ...`, `fix(B-02): ...`. (Los commits te pedirán confirmación por el permiso `git *: ask`: pídelo en lote cuando sea posible.)
5. Actualiza el panel con el contrato de evidencia: `gate | comando | exit code | resultado`, archivos modificados, commit, fecha. Corre `node scripts/panel-check.mjs` antes de guardar: 0 errores.
6. Control de alcance: SOLO modifica archivos dentro del alcance de la tarea. Mejoras o problemas externos → regístralos en el panel como deuda/mejora candidata; no los implementes.
7. Si un gate no puede correr (p. ej. falta algo del entorno): el ítem queda "no verificado", NO `done`.

## 4. Metas medibles por bloque (no reportes cerrado sin cumplirlas)
- **0:** los 6 criterios de la §4 de la spec de staging + gate completo verde. R1–R8 quedan `blocked` para Reiner.
- **A:** todos los criterios de la §6 de la spec v4 (incluye tests vitest nuevos, e2e `tests/e2e/auth-ui.spec.ts`, capturas desktop/mobile, tabla de contraste AA, LCP medido y reportado) + gate completo en verde.
- **B:** los 11 criterios de la spec visual (First Load JS ≤ +5 kB, 4 capturas desktop/mobile × oscuro/claro, e2e `visual-premium.spec.ts`, CLS=0, reduced-motion) + gate completo en verde.
- **C (slices 1–7):** modelo `ScheduledPost` + motor con adaptadores IG/FB + endpoint `run-due` (protegido por `CRON_SECRET`) + workflow `.github/workflows/publish-scheduler.yml` + importador `día N` + UI de calendario + historias + persistencia de marca/datos del negocio en DB (`BrandProfile`, slice 7); criterios 1–4, 6, 7 y 8 de la §5 de la spec con Meta simulado. El criterio 5 (publicación real) queda `blocked` (ver §7).
- **Meta global:** gate completo verde al final de cada bloque y panel con evidencia de cada ítem.

## 5. Reglas inmutables (heredadas, no negociables)
- NUNCA: push, merge, force-push, deploy, `prisma migrate dev/deploy`, SQL remoto, RLS, variables de entorno de Vercel, borrado permanente, secretos en código/commits/logs/panel.
- NUNCA sobrescribir, revertir, resetear ni descartar cambios o archivos que no creaste.
- NUNCA editar archivos de reglas: `AGENTS.md`, `.opencode/**`, `.github/**` (salvo el workflow NUEVO que pide la spec C-D4, que es un archivo nuevo y que Reiner revisará en el PR), `scripts/gate.mjs`, `scripts/panel-check.mjs`, `scripts/rules-guard.mjs`, `.rai-rules.lock`. Si crees que una regla debe cambiar: ítem `blocked` + explicación.
- NUNCA inventar datos: texto legal, credenciales, precios, tokens → placeholder marcado.
- Cero dependencias nuevas salvo que la spec las permita; si una tarea parece requerirlas → `blocked` con la justificación.
- Migraciones Prisma (bloque C): genera el SQL SIN conectar a la base (`npx prisma migrate diff --from-schema-datamodel <schema anterior> --to-schema-datamodel prisma/schema.prisma --script`), guárdalo en `prisma/migrations/<timestamp>_scheduled_posts/migration.sql` y NO lo apliques. Aplicarlo requiere aprobación de Reiner.
- Tests y gates se corren en Windows (esta sesión), nunca en la VM de Cowork.

## 6. Preguntas de los subagentes
Respóndelas tú desde el panel y la spec. Escala a Reiner SOLO: decisión de producto, seguridad, costo o acción irreversible no cubiertas por las specs.

## 7. Qué NO puedes cerrar solo (prepara, marca `blocked`, sigue con lo demás; no preguntes)
- Publicación real en Meta (D1: IG Business/Creator vinculado a Página de Facebook + token con permisos) → deja script/checklist y el ítem `blocked`.
- Secretos y activación del workflow de GitHub (`CRON_SECRET`, URL de la app) → deja instrucciones exactas para Reiner en el panel.
- Aplicar migraciones, merge, push, deploy.

## 8. Cierre
Al agotar lo abordable (o toparte con una parada dura): `node scripts/gate.mjs` completo; `node scripts/panel-check.mjs`; actualiza `docs/ESTADO-SESION.md` (estado real, ramas, commits, siguiente paso exacto); haz commit local; y entrega un reporte final corto: (1) hecho con evidencia, (2) bloqueado con causa y qué decisión/acción falta de Reiner, (3) deuda y mejoras candidatas registradas, (4) comandos exactos para que Reiner revise cada rama (`git log`, `git diff`) y (5) aprobaciones pendientes (push, PR, migración, deploy).

## 9. Adendas (se amplían poco a poco; cada una con fecha)

### 9.1 — 11 oct 2026: la rama ya contiene trabajo local que NO debes rehacer
La punta de `rai-feat-login-registro-ui` incluye estos commits locales hechos por Claude (Cowork). Son línea base: verifícalos y extiéndelos, no los reescribas ni los revirtas.
- `62de918` contraste del botón primario (`.btn-primary:hover` vs `a:hover`).
- `f4b450a` login: «Mantener sesión iniciada» (`rememberMe` → cookie 30 días + JWT 30 días; sin marcar → cookie de sesión + JWT 12 h; `src/lib/session-ttl.ts`; tests `auth-login.test.ts` y `session-ttl.test.ts`). **Bloque A:** no vuelvas a implementarlo; añade su cobertura e2e y la mención en el criterio de aceptación del login. Sin revocación en servidor = deuda registrada.
- `81e01b1` + `b1af734` fondo full-bleed cosmos en `AuthShell` (`public/auth/login-bg-cosmos.webp`; scrim; logo suelto solo <900 px). **Sustituye** lo que la spec v4 decía sobre `login-bg-desktop.jpg` (queda sin uso). La imagen definitiva será 21:9 (zonas seguras: logo 14–33 % del ancho, robot 67–86 %, centro 34–66 % vacío). Cuando llegue, solo se reemplaza el archivo; el CSS ya ancla la imagen abajo.
- `65b6782` `scripts/reset-password.mjs` (solo `schema=staging`; entrada oculta). No lo toques ni lo uses para producción.

### 9.2 — 11 oct 2026: Bloque C usa la spec v2.2 (§11) y la estructura REAL del contenido
- **Nuevo slice C-8 (de §11):** `WorkspaceMetaConnection.authType` (`facebook_login` por defecto | `instagram_login`), endpoint `PUT /api/workspace/meta/token` (RBAC `canManageContent`, cifrado en servidor, validación contra el host del tipo, `logAudit` sin el valor), campo de pegado en Ajustes y adaptador según `authType`. El token NUNCA va en código, tests, logs, panel ni commits (tests con tokens falsos). El token real lo pega Reiner.
- **Estructura real del contenido de Work** (el importador debe soportarla, no solo `día N`): `Plan 31-1102026/salida/dia-NN/dia-NN_slide-K-de-N.png` (1080×1350, **PNG**) + `dia-NN_copy.md` (solo existe para días 1–4 hoy). Instagram exige **JPEG**: el importador convierte PNG→JPEG (sin dependencias nuevas salvo aprobación; si no es posible → `blocked` con la causa). Un día sin `.md` queda en borrador incompleto: **no inventes copy**. Los días 1 y 3 del plan figuran como Reel pero se publican como imagen (decisión de QA del 11 oct).
- **Imágenes públicas:** Meta necesita una URL accesible; el almacenamiento (R2) aún no está provisionado → deja el adaptador de almacenamiento detrás de una interfaz y márcalo `blocked` para Reiner.
- **Facebook:** la app ya tiene el caso de uso «Administra todo en tu página». Permisos `pages_manage_posts` y `pages_read_engagement` aún sin añadir (los añade Reiner/Claude con su OK). Hasta entonces el adaptador `facebook` se prueba solo con Meta simulado.

### 9.3 — 11 oct 2026: Staging (Bloque 0) — datos verificados que cambian la spec
- Staging modo B funcionando: schema `staging` + rol `crm_staging`, pooler `aws-1-us-west-2.pooler.supabase.com`, puerto **6543** (el 5432 no responde); Prisma CLI por 6543 se cuelga → las migraciones a staging se aplicaron con un script SQL manual y `_prisma_migrations` pre-poblada. Producción NO tiene las migraciones `20260919120000_require_apikey_workspace_scope` ni `20260920120000_add_user_password_hash`.
- `vercel.json` fija `env.NEXT_PUBLIC_APP_URL` a producción: hay que corregirlo para staging (añadir a los slices del Bloque 0, sin tocar variables de Vercel).
- `.env.staging` es de Reiner (git-ignored): nunca lo leas ni lo imprimas.

### 9.4 — 11 oct 2026: Bloque M propuesto — protección de páginas en servidor
Spec cerrada: `@docs/SPEC-middleware-proteccion-paginas.md` (v1.0; `src/middleware.ts` + tests; decisión B de Reiner). Orden sugerido: después de A y antes de B, en su propia rama (decide Reiner; no mezclar con staging ni con login). Sin dependencias nuevas.

### 9.5 — Pendientes de decisión de Reiner antes de enviar (checklist)
- [ ] Orden final de bloques (0 → A → M → B → C) y ramas.
- [ ] Imagen 21:9 del fondo de login recibida y aplicada.
- [ ] Autorizar los permisos de Páginas en Meta y decidir dónde se guarda el token primero (local/staging).
- [ ] Copies de los días 5–15 (los redacta Claude tras revisar las imágenes de Work).
- [ ] Aprobación explícita para pegar el arranque en OpenCode.
