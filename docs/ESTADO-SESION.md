# Estado de sesión — CRM RAI Agency
Última actualización: 10 octubre 2026 (sesión Cowork, rama `rai-feat-login-registro-ui`; verificado 10 oct: sin cambios de código desde el 5 oct, implementación del login sin iniciar; specs login v4 y sistema visual premium escritas el 10 oct). Las secciones marcadas "25 sep" son el cierre anterior de OpenCode, conservado como historial.

## Actualización 15 oct 2026 — Contenido IG (rama `rai-feat-programacion-ig`, solo commits locales)
- Cadena de ramas locales (sin push): `rai-feat-automatizacion-config` (Corte A) → `rai-feat-automatizacion-ui` (Corte C: UI premium, tour, responsive) → `rai-feat-programacion-ig` (Corte B + extensión premium/tour a las demás pestañas; commits da14717, 0229698).
- Corte B (programar y publicar solo) listo en modo SIMULADO; 275 tests y `tsc` en verde. Detalle, deuda y comandos en `docs/SPEC-programacion-publicacion-instagram.md` (sección «Corte B — implementación local»).
- Para verlo en vivo en staging: pegar `docs/planning/staging-scheduledpost.sql` en el SQL editor (solo schema staging), luego `npx prisma generate` y reiniciar con `node --env-file=.env.staging node_modules/next/dist/bin/next dev`.
- Bloqueado hasta autorización de Reiner: push, merge, migración en producción, `IG_PUBLISH_MODE=live`, secretos de GitHub (`APP_URL`, `CRON_SECRET`).

## Estado actual (5 oct 2026) — punto de reanudación
- Rama activa: `rai-feat-login-registro-ui` = `origin/security/fase-0` (`69277fb`) + 3 commits locales solo de documentación e imágenes (`b455270`, `a76be0b`, `0355e6b`). Ninguno está publicado en remoto.
- Bloque en curso: login/registro premium + auto-registro con workspace propio. Especificación cerrada en `docs/SPEC-login-registro-ui.md` (v4 desde el 10 oct) y registrada en `docs/planning/panel-control.html` (FASE 00). **La implementación no ha empezado**: verificado el 5 oct que `register/route.ts` no tiene rate-limit ni creación de Workspace, `AuthShell.tsx` no tiene fondo ni `@keyframes`, y `/registro` conserva el texto "solo por invitación".
- Verificación del 5 oct: `tsc --noEmit` sin errores en código fuente (único error: tipos obsoletos en `.next/types`, ignorado por Git, de la rama de calendario). `vitest` no se puede ejecutar desde la VM de Cowork (el `node_modules` es de Windows y falta el binario nativo de rollup para Linux); debe correrse en Windows u OpenCode. Última validación completa documentada: 189/189 tests el 25 sep.
- Hidromáticos Oriente: la propuesta `docs/INTEGRACION-HIDROMATICOS.md` quedó versionada en la rama local `hidromaticos-docs-integracion-crm` (`35ba210`, base `origin/security/fase-0`, sin publicar). Sigue existiendo una copia sin versionar en el árbol de la rama de login; no debe incluirse en commits del login.
- Calendario de contenido: `rai-feat-calendario-contenido` está publicada en remoto (`d6f362d`). Estado del PR: sin dato.

## Decisiones (1-5 oct 2026)
- Registro: se reemplaza "solo por invitación" por auto-registro abierto con `Workspace` propio (dueño sin fila en `WorkspaceMember`, `businessName` recortado a 120 caracteres con valor por defecto "Mi negocio"). Quedó registrado como tarjeta de decisión en el panel; la anterior se conserva como historial.
- El registro abierto reutiliza `checkRateLimit` del login (claves `register:<email>` y `register:ip:<ip>`), sin crear un mecanismo nuevo.
- Interfaz: fondo completo con las imágenes reales de `public/auth/`, capa oscura para legibilidad, tarjeta flotante, animaciones CSS puras con `prefers-reduced-motion`, y sin el logo duplicado de `AuthShell`.
- Base de la documentación de Hidromáticos: `security/fase-0`, no `main`, porque el documento cita archivos que solo existen allí (`PLAN-RLS.md`, `AGENTS.md`, `rate-limit.ts`, ruta de login). `origin/main` (`16d2476`) solo añade el workflow `claude-review.yml`; la rama `main` local está obsoleta (`f00b239`).

- Specs (10 oct): login pasa a v4 (copy de `/login`, aislamiento de tema oscuro con `data-auth-shell`, `acceptTerms`, honeypot `website`, páginas placeholder `/terminos` y `/privacidad`, UX/a11y, e2e, contraste AA, deuda diferida en §7). Nueva `docs/SPEC-sistema-visual-premium.md` (efectos `fx-*`, rama `rai-feat-visual-premium`, precondición: login cerrado).
- Decisión de Reiner (10 oct): no pegar nada en OpenCode hasta terminar las specs; OpenCode produce primero un "plan gigante"; orquestador director autónomo con reglas fijas inmutables y panel + `roadmap-agentes-rai.html` en mano; convertir el proceso en una skill reutilizable. Cualquier cambio de permisos/guardrails requiere su aprobación.

## Pendiente (orden de ejecución)
00. Bloque 0 — staging: `docs/SPEC-entorno-staging.md` v1 cerrada (decisión de Reiner 10 oct: se arma antes de enviar el prompt maestro); falta que Reiner apruebe/provisione R1–R8 (Supabase de staging, variables Preview de Vercel, etc.).
0. Nuevos (10 oct, sin spec/implementación): publicación automática IG+FB (`docs/SPEC-publicacion-contenido-ig-fb.md` v2: decisiones D2–D7 cerradas el 10 oct; falta que Reiner verifique IG Business↔Página y token (D1) y configure secretos/workflow de GitHub (D8); slices 1–6 ejecutables con Meta simulado). **Actualización 10 oct (spec v2.1):** Reiner confirmó `@raiagency__` como Instagram Business y `raiagency.net` como dominio oficial; no tiene Página de FB (usa perfil personal, no sirve para publicar por API) → crear Página gratis y vincularla; nuevo slice 7 + decisión D9: persistir marca/datos del negocio en DB por workspace (hoy `ContentIGTab` guarda solo en `localStorage`). Claude rellenó el formulario Contenido IG en el navegador 2 como carga provisional (tarea fija: mantenerlo lleno y verificado). Carpeta `Plan 31-1102026/salida`: días 1–4 = 13 PNG sin `.md` de copy. El navegador 2 no tiene sesión de Instagram; Reiner debe iniciarla y endurecimiento del orquestador (aprobado; preparado en rama local `rai-chore-orquestador-guardrails` `754ec87`, falta que Reiner revise el diff, `CODEOWNERS` y checks en CI) + skill reutilizable `orquestador-panel-autonomo` (propuesta mostrada a Reiner).
1. OpenCode: releer la spec v4 y salir de modo Plan; ejecutar el bloque con `@backend`, `@frontend` y `@qa` hasta cumplir los criterios de la sección 6 de la spec.
2. Correr `tsc --noEmit`, lint, `vitest run` y `build` en Windows y registrar resultados reales en el panel.
3. Preparar el PR del login y esperar aprobación explícita; sin push, merge ni deploy por inferencia.
4. Hidromáticos: **PAUSADO (decisión de Reiner, 10 oct)** hasta reunirse con el cliente para que responda las 9 preguntas bloqueantes (§9 del documento); después decidir la base de implementación. No escribir código ni planear implementación antes.
5. Limpieza menor: la copia sin versionar de `INTEGRACION-HIDROMATICOS.md` en la rama de login y un `.git/index.lock` vacío residual (inofensivo; no se concedió permiso de borrado).
6. Siguen bloqueados hasta aprobación: RLS, migraciones remotas, variables de Vercel, merge a `main` y deploy.

---
## Historial — cierre del 25 sep 2026 (OpenCode, rama `security/fase-0`)

## Hecho (25 sep)
- Ejecutada la primera corrida jerárquica del orquestador con subagentes backend, frontend y QA en scopes separados; QA revisó después del autor.
- Cerrada la lectura arbitraria del filesystem en inventario (`21b2f5f`): raíces administradas por servidor, aislamiento `<base>/<workspaceId>`, bloqueo de traversal/prefix bypass/symlink exterior y errores sin rutas internas. Se añadieron pruebas de helper y endpoint.
- Eliminadas las 67 advertencias de ESLint (`9e3d3aa`) sin cambiar comportamiento funcional; lint quedó en 0 errores/0 warnings.
- Versionados `AGENTS.md`, los cuatro agentes y el comando de cierre (`36eaaf3`); reforzados después los permisos contra variantes de Git, Prisma, Vercel y borrado (`c418bef`).
- Adaptado `docs/planning/roadmap-agentes-rai.html` al sistema de agentes de este CRM y sincronizado `docs/planning/panel-control.html` (`2c17fdf`).
- Validación final: 189/189 tests, `tsc --noEmit` limpio, ESLint limpio y build de 62 páginas. Persiste solo el warning no bloqueante de BullMQ por `@valkey/valkey-glide`.
- Eliminados, con aprobación explícita, los artefactos sin seguimiento: `.playwright-mcp/`, `test-mcp.png`, `docs/planning/Claude outputs/` y el `ROADMAP.md` deprecado.
- Publicada `security/fase-0` hasta `c418bef` en `origin/security/fase-0`. No hubo merge a `main`, migraciones ni deploy.

## Decisiones (25 sep)
- `docs/planning/panel-control.html` sigue siendo la única fuente de backlog; `roadmap-agentes-rai.html` registra solo capacidades y madurez de agentes.
- El inventario usa bases administradas y una subcarpeta obligatoria por workspace; se descartó aceptar rutas arbitrarias proporcionadas por el cliente por riesgo multi-tenant.
- Las advertencias de lint se corrigieron por lotes con QA posterior, no ocultando reglas globalmente; las supresiones restantes son puntuales y justificadas.
- Los agentes exigen confirmación técnica para Git y acciones destructivas; migraciones de desarrollo quedan denegadas y producción/Vercel requieren aprobación humana.
- El Calendario de Contenido será el próximo bloque, pero no se mezclará automáticamente con `security/fase-0`: primero se decidirá la base de la rama sin mergear seguridad a `main` por inferencia.

## Archivos/módulos tocados (25 sep)
- Inventario: `.env.example`, `src/lib/inventory-paths.ts`, `src/app/api/inventory/route.ts`, `src/agents/vision-analyzer.ts`, UI y pruebas asociadas.
- Limpieza lint: 25 archivos de frontend/backend/tests/worker, sin cambios funcionales previstos.
- Operación OpenCode: `AGENTS.md`, `.opencode/agent/{orchestrator,backend,frontend,qa}.md`, `.opencode/command/cierre.md`.
- Documentación: `docs/planning/panel-control.html`, `docs/planning/roadmap-agentes-rai.html`, `docs/ESTADO-SESION.md`.

## Pendiente (25 sep, parcialmente superado por la sección actual)
- Reiniciar OpenCode para cargar los agentes y permisos versionados.
- Leer este archivo y `docs/planning/panel-control.html`; verificar que `security/fase-0` está sincronizada con remoto.
- Preparar BLOQUE 2A — Calendario de Contenido en rama `rai-feat-calendario-contenido`. Antes de crearla, decidir técnicamente si debe partir de `main` o de `security/fase-0`; no mergear a `main` sin aprobación. Auditar el PR #7 antiguo y rescatar selectivamente solo código compatible con RBAC, `apiFetch` y aislamiento por workspace.
- Mantener bloqueados RLS, migraciones remotas, variables de Vercel, merge y deploy hasta aprobación explícita.
- Antes de cualquier deploy futuro, configurar `INVENTORY_ALLOWED_ROOTS` y crear `<base>/<workspaceId>` para cada workspace que use inventario.

## Actualización 11 oct 2026 — staging, Quadro Café, contenido y Facebook
- **Staging modo B creado** en la BD CRM (proyecto Supabase `CRM RAI Agency`, `bskdozxkgbxifftuulvc`): schema `staging` + rol `crm_staging` (NOLOGIN). Verificado por Reiner: `schema_staging=1`, `rol_crm_staging=1`, `tablas_public_legibles_por_rol=0`. Pendiente (solo Reiner, fuera del chat): contraseña/LOGIN del rol, `DATABASE_URL`/`DIRECT_URL` con `?schema=staging`, `prisma migrate` contra staging.
- **Quadro Café (proyecto `wckufllomfmuwxptegvm`) NO se toca.** Por un error de mapeo previo, ahí quedaron un schema `staging` y un rol `crm_staging` vacíos (rol sin objetos, schema sin tablas). Se dejan tal cual; Reiner decidirá en el futuro (reversión segura documentada en el chat de 11 oct).
- **Contenido IG:** por ahora solo 4 días generados (dia-01 a dia-04, copy listo en `Contenido RRSS/Instagram/Plan 31-1102026/salida`). Se programan esos 4 para probar el sistema; los demás días cuando Reiner tenga las imágenes (se generan en ChatGPT Work, lento).
- **Facebook:** Página "RAI Agency" (categoría Agencia de marketing) creada el 11 oct desde Browser 2. Pendiente: vincularla a @raiagency__, completar datos (sitio raiagency.net) y token Meta (D1, tarea de Reiner).
- **Skills:** `orquestador-panel-autonomo` v2.1 guardada; `cierre-continuidad-sesion` (punto 19) pendiente de actualizar con la nomenclatura de chats. `git-buenas-practicas` es el punto 12, no el 19.

## Actualización 11 oct 2026 (b) — Staging B: tablas creadas y verificadas

- Tablas de staging creadas vía script SQL (`.env.staging.sql`, git-ignored) aplicando las 11 migraciones en el schema `staging` del proyecto CRM (`bskdozxkgbxifftuulvc`); `_prisma_migrations` de staging pre-poblada con 11 filas (checksum sha256).
- Verificación read-only (Supabase): `staging` = 40 tablas; `public` = 41 (intacto); `staging._prisma_migrations` = 11; `staging."User".passwordHash` existe; `crm_staging` tiene CRUD en staging y 0 de 41 tablas legibles en `public`.
- Hallazgo: producción (`public`) NO tiene las migraciones `20260919120000_require_apikey_workspace_scope` ni `20260920120000_add_user_password_hash` (sin `User.passwordHash`). Staging sí. Aplicarlas a producción = decisión explícita de Reiner.
- Hallazgo pooler: puerto 5432 (session) del pooler `aws-1-us-west-2` no responde; usar 6543 para `DATABASE_URL` y `DIRECT_URL` en `.env.staging`. Prisma CLI sobre 6543 se cuelga en `migrate status`/`deploy` (pgbouncer + advisory lock) → migraciones futuras en staging: SQL manual hasta resolver camino (R7 abierto para futuras).
- RLS: sin tocar (decisión separada, `PLAN-RLS.md`); se corrió con "Run without RLS".
- Pendiente Reiner: R3 rama `staging` + env Vercel Preview; R4 Upstash/R2 separados; R5 `JWT_SECRET`/`KEYS_ENCRYPTION_KEY`/`CRON_SECRET` distintos; R6 redirect URIs Meta; R8 secrets GitHub Actions.

### Smoke test local contra staging (11 oct 2026)
- `.env.staging` ahora incluye `JWT_SECRET`, `KEYS_ENCRYPTION_KEY`, `CRON_SECRET` únicos de staging (R5 hecho), `SUPER_ADMIN_EMAILS`, `NEXT_PUBLIC_APP_URL=http://localhost:3000`. Sin `DEV_BYPASS_AUTH`. Sin Upstash/R2/Meta aún (R4/R6 abiertos).
- Prueba en copia aislada (sin `.env.local`/`.env.production`) con Next dev + DB staging por 6543: `/login` 200, `/registro` 200, registro sin invitación 403, registro super admin 200, login mala clave 401, login buena 200 + cookie `rai_session`. Usuario de prueba borrado (staging `User` = 0).
- Observación: no existe `src/middleware.ts`; rutas de página (ej. `/contactos`) devuelven 200 sin cookie. La protección vive en la API/cliente. Revisar si es decisión de producto (candidato a pendiente de seguridad).
- Skill `cierre-continuidad-sesion` con sección de nomenclatura: ya guardada (verificado en skills sincronizadas).

### Decisión 11 oct 2026 — middleware (B)
- Reiner eligió B: proteger páginas en servidor. Spec en `docs/SPEC-middleware-proteccion-paginas.md` (v1.0). Pendiente de ejecución; nada enviado a OpenCode.
- Facebook: Página "RAI Agency" creada y con sitio web raiagency.net (id 61595435214179). Vincular IG @raiagency__ bloqueado: Business Suite abre el portafolio "Vida Fácil" (no el de Reiner) y pide verificación de cuenta → decisión/acción de Reiner.
- Verificado: `.env.local` local solo contiene `VERCEL_OIDC_TOKEN` (no apunta a ninguna base).

### Fix 11 oct 2026 — texto ilegible en botón primario (hover)
- Causa: `a:hover` (texto dorado, especificidad 0,1,1) ganaba a `.btn-primary:hover` (no declaraba `color`) en botones renderizados como `<a class="btn btn-primary">` → dorado sobre dorado (visto en `/registro` "Ir a iniciar sesión").
- Cambio mínimo en `src/app/globals.css`: `color:#0A0A0F` fijo en `.btn-primary`/`button.primary` para `:hover`, `:focus-visible`, `:active` (contraste ~11:1); `.btn-danger:hover` ahora fija `color: var(--rai-error)` (mismo bug latente). Tema claro intacto (su regla base posterior fija texto blanco).
- Evidencia: prueba Playwright con el CSS real: color en hover = rgb(10,10,15) (primario) y rgb(230,57,70) (peligro); captura revisada. `tsc --noEmit` OK; `eslint` del gate no terminó en el tiempo de la VM (cambio solo CSS).
- Mejora tipográfica más amplia del botón (peso/tamaño/espaciado) queda para `SPEC-sistema-visual-premium.md`; no se inventó nada fuera del bug.

### Facebook ↔ Instagram vinculados (11 oct 2026)
- Página de Facebook "RAI Agency" (id 61595435214179) conectada a Instagram @raiagency__ (conexión hecha por Reiner desde la app móvil de Instagram). Verificado en `facebook.com/settings/?tab=linked_instagram`: "Connected Instagram — @raiagency__", con acceso de administración a ambos.
- Foto de perfil y portada de la Página subidas por Reiner. Copias en `Contenido RRSS/Instagram/Plan 31-1102026/entrada/logo/`: `logo_rai-agency-facebook-perfil.png`, `portada_rai-agency-facebook-robot.png` (versión elegida), `portada_facebook_1640x624.jpg` (alternativa).
- Ajuste pendiente: "Permitir acceso a los mensajes de Instagram en la bandeja de entrada" está **desactivado**; activarlo cuando se integre la bandeja de conversaciones del CRM.
- Aún pendiente (Reiner): token Meta (D1) y app Meta (modo Desarrollo) — requisitos del módulo de publicación IG/FB.

### Registro 11 oct 2026 (c) — App Meta y hallazgos para staging (insumo para OpenCode; nada enviado)
- App Meta existente: **RAI Agency Publisher**, App ID `1455971076448253` (el ID no es secreto), modo **En desarrollo**, sin portafolio empresarial, "Sin publicar". Caso de uso configurado: "Administrar mensajes y contenido en Instagram"; panel también muestra "Inicio de sesión con Facebook para empresas". Hay otras dos apps de Reiner (`RAI Agency Conecta` 2062659554401494 y `Asistente JB Creaciones` 1058459147183794, ligadas a Educación en libros): **no usar para el CRM**.
- **Falta** (tarea de Reiner, D1): token de acceso. No generado. Pendiente verificar si hace falta añadir el caso de uso de publicar en Páginas de Facebook (hoy solo se ve el de Instagram).
- Hallazgo `vercel.json`: define `env.NEXT_PUBLIC_APP_URL = https://crm-rai-agency.vercel.app` (producción) para todos los entornos. En un preview de staging puede pisar la URL propia (afecta OAuth redirect de Meta). Hay que verificar precedencia vercel.json vs panel de Vercel y, si pisa, quitar esa clave de `vercel.json` (cambio de código → spec, no se ha hecho).
- Hallazgo build: `buildCommand` = `npx prisma generate && npm run build`; NO ejecuta migraciones (correcto: un deploy de staging no toca la base).
- Rama actual `rai-feat-login-registro-ui`: 51 commits por delante de `origin/main` (tracking `origin/security/fase-0`, 25 por delante). Empujar una rama `staging` desde aquí publicaría todo ese trabajo: requiere aprobación explícita de Reiner (no dada).
- R3 (Vercel Preview con variables de staging): pendiente; los valores secretos (`DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `KEYS_ENCRYPTION_KEY`, `CRON_SECRET`) los pega Reiner; el agente no escribe secretos en formularios. Variables por rama en plan Hobby: no verificado.
- Meta (11 oct, lectura de pantalla): el caso de uso "API de Instagram con inicio de sesión de Instagram" de `RAI Agency Publisher` (Instagram app ID `1411922921057127`, no secreto) lista solo `instagram_business_basic`, `instagram_business_manage_comments` e `instagram_business_manage_messages`. **Falta `instagram_business_content_publish`** (necesario para publicar). Para generar token: asignar a @raiagency__ el rol "Instagram tester" en Roles de la app (aceptar la invitación en Instagram) → "Añadir cuenta" → generar token. Publicar en la Página de Facebook requerirá además el caso de uso/permiso de Páginas (p. ej. `pages_manage_posts`) — por verificar. Decisión de Reiner 11 oct: NO subir rama `staging` todavía (recomendación de Claude: primero cerrar docs/specs).
- **Corrección (11 oct, verificado por pantalla en Permisos y funciones):** `instagram_business_content_publish` YA está añadido a `RAI Agency Publisher` ("Listo para prueba"); también `instagram_business_basic` y `instagram_business_manage_insights`. La nota anterior de que "falta" era incorrecta (el paso 1 del asistente solo lista 3 permisos). Rol "Evaluador de Instagram" de `raiagency__` asignado e invitación autorizada en Instagram. Reiner generó el token (D1 paso 3) y lo guarda en Proton Pass; el agente no lo ve. Pendiente: verificar caducidad del token (largo ≈ 60 días, por confirmar) y definir dónde se registra en `WorkspaceMetaConnection` (cifrado) sin escribirlo en chat/commits.

## Registro del token Meta en el CRM + caso de uso de Páginas (11 oct 2026)
- Token de Instagram Login generado por Reiner: guardado solo en su nota de Proton Pass. No está en repo, chat ni `.env`.
- Verificado en pantalla (app `RAI Agency Publisher`): un solo caso de uso, "Administrar mensajes y contenido en Instagram". El caso de uso **"Administra todo en tu página"** existe en el catálogo y **no está agregado** (no se agregó nada; pendiente de decisión de Reiner). Permisos exactos de Páginas (p. ej. `pages_manage_posts`) sin verificar.
- Hallazgo de código: el CRM solo conecta por OAuth de **Facebook Login** (`graph.facebook.com`, `me/accounts`). El token de Reiner es de **Instagram Login** (`instagram_business_*`) → no encaja con el motor actual. No hay entrada manual de token.
- `docs/SPEC-publicacion-contenido-ig-fb.md` pasa a **v2.2**: nueva §11 (campo `authType`, endpoint `PUT /api/workspace/meta/token` con cifrado en servidor, UI de pegado, adaptador por tipo, expiración/renovación, criterios de aceptación). Migración solo local/dev.
- Nada enviado a OpenCode. Nada pusheado.
- Pendiente (Reiner): decidir si agrega el caso de uso de Páginas; decidir cuándo autorizar el envío a OpenCode.
- Pendiente (verificar): duración real del token largo de Instagram Login y endpoint de renovación (docs oficiales).

## Login: «Mantener sesión iniciada» + fondo full-bleed (11 oct 2026)
- Petición de Reiner: no volver a escribir la cuenta cada vez. Hallazgo: la cookie `rai_session` ya duraba 7 días fijos (sin opción en la UI).
- Implementado y commiteado en local, rama `rai-feat-login-registro-ui` (`f4b450a`): `rememberMe: true` → cookie persistente 30 días + JWT 30 días; sin marcar → cookie de sesión + JWT 12 h. `signJwt` acepta `expiresInSec` (defecto 7 días intacto). Archivos: `src/lib/session-ttl.ts` (nuevo), `src/lib/auth.ts`, `src/app/api/auth/login/route.ts`, `src/app/login/page.tsx`, `src/app/globals.css` (bloque `.remember-toggle`), `src/lib/__tests__/auth-login.test.ts`, `src/lib/__tests__/session-ttl.test.ts`.
- Evidencia: 182/182 tests en `src/lib/__tests__`, `tsc --noEmit` limpio, JWT medido (30 d / 12 h / 7 d defecto). Reiner lo vio funcionando en `localhost:3000/login`.
- Cambio de comportamiento: sin marcar la casilla, la sesión ya no dura 7 días (se cierra con el navegador o a las 12 h).
- Deuda: JWT sin estado y sin endpoint de cierre de sesión que lo revoque en servidor; sin capturas de tema claro/móvil del toggle; `docs/SPEC-login-registro-ui.md` actualizada con una nota (no cambia sus criterios).
- Fondo full-bleed para `/login` y `/registro`: Reiner generará la imagen en ChatGPT (prompt entregado: 16:9 2560×1440, centro oscuro vacío, robot a la derecha, logo a la izquierda, sin texto ni blur). Pendiente: recibir la imagen, versión móvil 9:16, optimizar a WebP, aplicar con scrim oscuro; si el logo va en la imagen, quitar el logo suelto de `AuthShell` (la spec v4 ya lo prevé). Existen `public/auth/login-bg-desktop.jpg` y `login-bg-mobile.jpg` (1 oct) sin usar en código.
- Panel de control (`docs/planning/panel-control.html`) actualizado: resumen del 11 oct, publicación IG+FB v2.2, y 3 ítems nuevos (toggle de sesión = hecho local; fondo full-bleed = espera imagen; caso de uso de Páginas en Meta = espera decisión). `panel-check`: 0 errores, 27 avisos preexistentes. Copia sincronizada en la carpeta `planning`.
- Nada enviado a OpenCode. Nada pusheado.

## Meta caso de uso de Páginas + fondo full-bleed aplicado + reset de clave staging (11 oct 2026, tarde)
- Meta (verificado en pantalla, autorizado por Reiner): caso de uso «Administra todo en tu página» **agregado** a `RAI Agency Publisher`. Permisos ya «Listo para prueba»: `pages_show_list`, `public_profile`, `business_management`. Disponibles sin agregar: `pages_manage_posts`, `pages_read_engagement`, `pages_manage_engagement`, `pages_manage_metadata`, `pages_read_user_content`, `read_insights`. Pendiente: autorización de Reiner para añadir `pages_manage_posts` + `pages_read_engagement`.
- Fondo full-bleed (`81e01b1`): imagen `public/auth/login-bg-cosmos.webp` aplicada en `/login` y `/registro` vía `AuthShell`. Verificado con capturas reales. Reiner vio recorte: su área visible es 1920×826 (2,32:1) vs imagen 16:9 → mitigado anclando la imagen abajo y zoom 1,02; falta imagen 21:9 con zonas seguras.
- Reiner olvidó la clave de la cuenta creada en staging: no existe «olvidé mi clave». Se añadió `scripts/reset-password.mjs` (`65b6782`): corre solo si `DATABASE_URL` tiene `schema=staging`, pide email y clave nueva por consola con entrada oculta (nunca en chat), mismo hash scrypt que `src/lib/password.ts`; 2 tests de compatibilidad. Uso: `node --env-file=.env.staging scripts/reset-password.mjs`. Deuda: no hay flujo de recuperación de clave en el producto.
- Work está generando los días hasta el 15. Pendiente de Claude: revisar cada imagen (errores) y redactar los copies (sin inventar datos; alineados a `PLAN-AUTORIDAD-B2B-31-dias.md`).
- Prompt maestro para OpenCode: NO se creó un archivo nuevo (evita duplicar la fuente de verdad); se amplió el existente `docs/planning/PROMPT-MAESTRO-OPENCODE.md` con la §9 (adendas del 11 oct) y quedó marcado **BORRADOR — NO ENVIADO**. Reiner lo irá ampliando.
- Nada enviado a OpenCode. Nada pusheado.

## Registro abierto + fondo amanecer + modelo freemium (11 oct 2026, noche)
- Decisión de Reiner: el registro NO es solo por invitación; cualquiera se registra y usa el CRM gratis. Funciones básicas gratis; intermedias/complejas de pago (p. ej. publicación automática IG). Planes 34 / 49 / 67 USD. Detalle y preguntas abiertas: `docs/SPEC-planes-monetizacion.md` (v0.1 BORRADOR).
- Implementado local (`d387b05`, rama `rai-feat-login-registro-ui`, sin push): `POST /api/auth/register` abierto con workspace propio (`businessName` opcional → `Mi negocio` por defecto, máx. 120), `acceptTerms` obligatorio, honeypot `website`, rate limit por email e IP (429 + `Retry-After`), 409 si el email ya tiene cuenta (anti account-takeover de usuarios SSO sin clave; **desviación endurecida respecto a spec v4**). Invitación pendiente → se une al workspace (sin crear otro). Super admin → bootstrap sin workspace.
- UI: `/registro` (negocio opcional, casilla de términos, honeypot) y `/login` sin «(solo con invitación)» → «Regístrate gratis». Placeholders `/terminos` y `/privacidad` (sin texto legal inventado).
- Fondo: Reiner cambió a una imagen menos saturada («amanecer», 1672×941; no es 8K real). `public/auth/login-bg-amanecer.webp` (239 KB). Verificado con capturas de `/login` y `/registro`. Sin usar: `login-bg-cosmos.webp`, `login-bg-nocturno.webp` (sin trackear), `login-bg-desktop/mobile.jpg`.
- Evidencia: 192/192 tests en `src/lib/__tests__` (registro 13), `tsc --noEmit` limpio.
- **RIESGO:** no desplegar el registro abierto a producción antes del gating de planes (hoy un usuario nuevo accede a todo). Falta: verificación de email, rate limit distribuido, revocación de sesión, e2e `tests/e2e/auth-ui.spec.ts`, fuerza/mostrar contraseña, cuenta regresiva y a11y restante de la spec v4.
- Nada enviado a OpenCode. Nada pusheado.

## Recuperar contraseña + fondo galaxia + card premium (11 oct 2026, noche)
- Detalle y estado en el panel (`recuperar-contrasena`, `login-fondo-full-bleed`) y en `docs/SPEC-recuperar-contrasena.md`. Pendiente de Reiner: migración en staging y proveedor de email/SMS. Propuesta de planes en `docs/SPEC-planes-monetizacion.md` §2b.

### Dashboard premium + Guía de Inicio responsive (15 oct 2026, rama `rai-feat-dashboard-premium`, local)
- Dashboard (`/`): hero con saludo + 4 acciones rápidas, tarjeta Instagram (lee `/api/content-planner/schedule`; si falla muestra "no disponible"), tarjeta Automatización, stats con barra de proporción, búsqueda + chips de filtro, `ConfirmDialog` (reemplaza `confirm()`), aviso Hotel descartable (`rai-dash-hotel-hint-dismissed`), recorrido `rai-tour-dash-v1`, estado vacío guiado. Badge `processing` → "En proceso".
- Fix hidratación: caché de localStorage se aplica en `useEffect` (no en `useState`).
- Guía de Inicio (`/launchpad`): badge de % unificado (`.lp-pct`, ancho fijo, cifras tabulares), categorías pasan a chips con scroll horizontal ≤900px, filas de pasos sin wrap ≤520px.
- Evidencia: tsc limpio, 275 tests OK, 20 rutas a 390px sin overflow horizontal; `/launchpad` 0 overflow a 320/390/768/1024/1440.
- Nota dato: saludo muestra "Rainer" porque el displayName de la cuenta es "Rainer" (no es código).

### Recorrido guiado premium en todo el CRM (16 oct 2026, rama `rai-feat-dashboard-premium`, local)
- Componente único `src/components/tour/ProductTour.tsx` (el de `pipeline-ig/` ahora reexporta): foco que se desliza entre pasos, pulso, flecha hacia el elemento, barra de progreso, contenido en cascada, marcas numeradas 1-2-3 en cascada sobre sub-elementos (`step.hints`), pasos `optional` (se omiten solos) y `desktopOnly`, teclado (← → Esc, Tab atrapado), hoja inferior en móvil, sin blur, respeta `prefers-reduced-motion`. Estilos en `tour/tour.css` (prefijo `rtour-`; CSS viejo `rai-tour-*` eliminado de globals.css).
- `TourHost` (montado en `layout.tsx`): botón «?» flotante con menú (Guía de esta pantalla / Recorrido general del CRM / Reactivar guías automáticas), arranque automático una sola vez por módulo (clave `rai-tour-mod-<id>-v1`), opción «No volver a mostrar guías automáticas» (`rai-tour-auto-off-v1`).
- Registro `tour/tours.ts`: guía propia de Guía de Inicio + 19 módulos + recorrido general del menú. Dashboard y Automatización conservan su recorrido en la página (Dashboard ganó marcas en «Accesos rápidos»).
- Evidencia: tsc limpio, 281 tests (6 nuevos del registro), verificado en vivo (Guía de Inicio, tour general con marcas en el menú, Dashboard, Automatización, móvil 390px sin overflow).
- Deuda: textos de módulos sin pantalla revisada son genéricos (revisar con Reiner); botón «Guía de esta pantalla» no existe en `/` y `/automatizacion` (usan su botón «Ver recorrido»).
- Limpieza (16 oct): eslint de todo el repo en 0 errores (se corrigió una regex insegura de IPv4 en `scheduled-posts.ts`, ahora sin backtracking). Deuda de tamaño documentada: `ContentIGTab.tsx` ~1200 líneas y `automatizacion/page.tsx` ~1000 → dividir por pestaña en un corte aparte (sin cambiar comportamiento, con tests de humo).


## Nueva Campaña premium + guía propia (15 oct 2026)
- `/campaign/new`: barra de progreso de 3 pasos (se completa sola; check con trazo SVG y relleno de color), secciones con entrada escalonada y acento dorado al enfocar, ideas rápidas en el chat vacío, textos con ortografía corregida. Sin blur ni efectos decorativos.
- Responsive verificado en 320/390/768/1024/1440: 0 desborde horizontal. En móvil el panel de configuración y el chat se apilan.
- Guía propia `CAMPAIGN_NEW` (7 pasos, pistas numeradas en cascada) en `src/components/tour/tours.ts`; marcadores `data-tour="cn-*"` y test que verifica que existan en la página.
- Corrección global: en móvil `.top-bar` quedaba 56 px más abajo y tapaba el inicio del contenido (`top:56px` → `top:0`).
- Zona horaria por defecto `America/Caracas`; la API de programación responde 503 `schema_pending` si falta la tabla `ScheduledPost`.
