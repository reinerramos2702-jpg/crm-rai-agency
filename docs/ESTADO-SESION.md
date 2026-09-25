# Estado de sesión — CRM RAI Agency
Última actualización: 25 septiembre 2026 (sesión OpenCode, rama `security/fase-0`)

## Hecho en la última sesión
- Ejecutada la primera corrida jerárquica del orquestador con subagentes backend, frontend y QA en scopes separados; QA revisó después del autor.
- Cerrada la lectura arbitraria del filesystem en inventario (`21b2f5f`): raíces administradas por servidor, aislamiento `<base>/<workspaceId>`, bloqueo de traversal/prefix bypass/symlink exterior y errores sin rutas internas. Se añadieron pruebas de helper y endpoint.
- Eliminadas las 67 advertencias de ESLint (`9e3d3aa`) sin cambiar comportamiento funcional; lint quedó en 0 errores/0 warnings.
- Versionados `AGENTS.md`, los cuatro agentes y el comando de cierre (`36eaaf3`); reforzados después los permisos contra variantes de Git, Prisma, Vercel y borrado (`c418bef`).
- Adaptado `docs/planning/roadmap-agentes-rai.html` al sistema de agentes de este CRM y sincronizado `docs/planning/panel-control.html` (`2c17fdf`).
- Validación final: 189/189 tests, `tsc --noEmit` limpio, ESLint limpio y build de 62 páginas. Persiste solo el warning no bloqueante de BullMQ por `@valkey/valkey-glide`.
- Eliminados, con aprobación explícita, los artefactos sin seguimiento: `.playwright-mcp/`, `test-mcp.png`, `docs/planning/Claude outputs/` y el `ROADMAP.md` deprecado.
- Publicada `security/fase-0` hasta `c418bef` en `origin/security/fase-0`. No hubo merge a `main`, migraciones ni deploy.

## Decisiones tomadas
- `docs/planning/panel-control.html` sigue siendo la única fuente de backlog; `roadmap-agentes-rai.html` registra solo capacidades y madurez de agentes.
- El inventario usa bases administradas y una subcarpeta obligatoria por workspace; se descartó aceptar rutas arbitrarias proporcionadas por el cliente por riesgo multi-tenant.
- Las advertencias de lint se corrigieron por lotes con QA posterior, no ocultando reglas globalmente; las supresiones restantes son puntuales y justificadas.
- Los agentes exigen confirmación técnica para Git y acciones destructivas; migraciones de desarrollo quedan denegadas y producción/Vercel requieren aprobación humana.
- El Calendario de Contenido será el próximo bloque, pero no se mezclará automáticamente con `security/fase-0`: primero se decidirá la base de la rama sin mergear seguridad a `main` por inferencia.

## Archivos/módulos tocados
- Inventario: `.env.example`, `src/lib/inventory-paths.ts`, `src/app/api/inventory/route.ts`, `src/agents/vision-analyzer.ts`, UI y pruebas asociadas.
- Limpieza lint: 25 archivos de frontend/backend/tests/worker, sin cambios funcionales previstos.
- Operación OpenCode: `AGENTS.md`, `.opencode/agent/{orchestrator,backend,frontend,qa}.md`, `.opencode/command/cierre.md`.
- Documentación: `docs/planning/panel-control.html`, `docs/planning/roadmap-agentes-rai.html`, `docs/ESTADO-SESION.md`.

## Pendiente para la próxima sesión
- Reiniciar OpenCode para cargar los agentes y permisos versionados.
- Leer este archivo y `docs/planning/panel-control.html`; verificar que `security/fase-0` está sincronizada con remoto.
- Preparar BLOQUE 2A — Calendario de Contenido en rama `rai-feat-calendario-contenido`. Antes de crearla, decidir técnicamente si debe partir de `main` o de `security/fase-0`; no mergear a `main` sin aprobación. Auditar el PR #7 antiguo y rescatar selectivamente solo código compatible con RBAC, `apiFetch` y aislamiento por workspace.
- Mantener bloqueados RLS, migraciones remotas, variables de Vercel, merge y deploy hasta aprobación explícita.
- Antes de cualquier deploy futuro, configurar `INVENTORY_ALLOWED_ROOTS` y crear `<base>/<workspaceId>` para cada workspace que use inventario.
