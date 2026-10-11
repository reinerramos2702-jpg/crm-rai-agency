# Estado de sesión — CRM RAI Agency
Última actualización: 10 octubre 2026 (sesión Cowork, rama `rai-feat-login-registro-ui`; verificado 10 oct: sin cambios de código desde el 5 oct, implementación del login sin iniciar; specs login v4 y sistema visual premium escritas el 10 oct). Las secciones marcadas "25 sep" son el cierre anterior de OpenCode, conservado como historial.

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
