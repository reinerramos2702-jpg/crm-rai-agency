# Estado de sesión — CRM RAI Agency
Última actualización: 10 octubre 2026 (sesión Cowork, rama `rai-feat-login-registro-ui`; verificado 10 oct: sin cambios de código desde el 5 oct, implementación del login sin iniciar). Las secciones marcadas "25 sep" son el cierre anterior de OpenCode, conservado como historial.

## Estado actual (5 oct 2026) — punto de reanudación
- Rama activa: `rai-feat-login-registro-ui` = `origin/security/fase-0` (`69277fb`) + 3 commits locales solo de documentación e imágenes (`b455270`, `a76be0b`, `0355e6b`). Ninguno está publicado en remoto.
- Bloque en curso: login/registro premium + auto-registro con workspace propio. Especificación cerrada en `docs/SPEC-login-registro-ui.md` (v3) y registrada en `docs/planning/panel-control.html` (FASE 00). **La implementación no ha empezado**: verificado el 5 oct que `register/route.ts` no tiene rate-limit ni creación de Workspace, `AuthShell.tsx` no tiene fondo ni `@keyframes`, y `/registro` conserva el texto "solo por invitación".
- Verificación del 5 oct: `tsc --noEmit` sin errores en código fuente (único error: tipos obsoletos en `.next/types`, ignorado por Git, de la rama de calendario). `vitest` no se puede ejecutar desde la VM de Cowork (el `node_modules` es de Windows y falta el binario nativo de rollup para Linux); debe correrse en Windows u OpenCode. Última validación completa documentada: 189/189 tests el 25 sep.
- Hidromáticos Oriente: la propuesta `docs/INTEGRACION-HIDROMATICOS.md` quedó versionada en la rama local `hidromaticos-docs-integracion-crm` (`35ba210`, base `origin/security/fase-0`, sin publicar). Sigue existiendo una copia sin versionar en el árbol de la rama de login; no debe incluirse en commits del login.
- Calendario de contenido: `rai-feat-calendario-contenido` está publicada en remoto (`d6f362d`). Estado del PR: sin dato.

## Decisiones (1-5 oct 2026)
- Registro: se reemplaza "solo por invitación" por auto-registro abierto con `Workspace` propio (dueño sin fila en `WorkspaceMember`, `businessName` recortado a 120 caracteres con valor por defecto "Mi negocio"). Quedó registrado como tarjeta de decisión en el panel; la anterior se conserva como historial.
- El registro abierto reutiliza `checkRateLimit` del login (claves `register:<email>` y `register:ip:<ip>`), sin crear un mecanismo nuevo.
- Interfaz: fondo completo con las imágenes reales de `public/auth/`, capa oscura para legibilidad, tarjeta flotante, animaciones CSS puras con `prefers-reduced-motion`, y sin el logo duplicado de `AuthShell`.
- Base de la documentación de Hidromáticos: `security/fase-0`, no `main`, porque el documento cita archivos que solo existen allí (`PLAN-RLS.md`, `AGENTS.md`, `rate-limit.ts`, ruta de login). `origin/main` (`16d2476`) solo añade el workflow `claude-review.yml`; la rama `main` local está obsoleta (`f00b239`).

## Pendiente (orden de ejecución)
1. OpenCode: releer la spec v3 y salir de modo Plan; ejecutar el bloque con `@backend`, `@frontend` y `@qa` hasta cumplir los criterios de la sección 6 de la spec.
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
