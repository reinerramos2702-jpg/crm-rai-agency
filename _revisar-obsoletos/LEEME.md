# Carpeta de revisión de obsoletos

Creada el 17 oct 2026 tras una auditoría de solo lectura del repositorio. **Nada se borró**: lo que no tiene ningún uso se movió aquí conservando su ruta original, para que Reiner lo revise y decida.

- La carpeta está excluida de TypeScript (`tsconfig.json` → `exclude`) y de las pruebas; no entra en el build.
- **Restaurar un archivo:** mover de vuelta a la misma ruta relativa (por ejemplo, `_revisar-obsoletos/src/components/ui/Button.tsx` → `src/components/ui/Button.tsx`).
- **Eliminar definitivamente:** solo lo decide Reiner; cuando lo haga, borrar esta carpeta completa.

## Qué hay aquí (evidencia: 0 importaciones o referencias en `src`, `scripts`, `docs`, pruebas y configuraciones)

| Ruta aquí | Motivo |
|---|---|
| `src/components/ui/Button.tsx`, `Card.tsx`, `Input.tsx` | Biblioteca de componentes sin ninguna importación; `CLAUDE.md` indica no usarla. Último cambio: 21 jun 2026 |
| `src/components/campaign/AssetPreview.tsx`, `DayGrid.tsx`, `PlanningChat.tsx` | Sin importaciones; el módulo de campañas ya usa los componentes de `src/app/campaign/new/` |
| `docs/planning/COWORK-BRIEFING.md` | Se declara a sí mismo «documento histórico» (1 sep 2026); hoy el código lo ejecuta OpenCode. Solo lo citaba otro documento de planning, ya actualizado |
| `src/app/marketing/_components/styles.ts` | Solo reexportaba las 4 hojas de estilo de /marketing; desde el 21 oct 2026 todo el CSS se carga desde `src/styles/modules.ts` (evita el parpadeo sin estilos al navegar) y nadie lo importa |
| `css/globals-reglas-sin-uso.css` | 49 reglas CSS retiradas de `src/app/globals.css` (clases `.cn-chips/.cn-input/.cn-starters`, `.lp-checkbox*`, `.lp-progress-*`, `.lp-check-icon`, `.lp-ring-pct`, `.lp-next-cta`, `.dash-duo`, `.dash-pulse*` de contenedor, `.dash-auto-head`, `.dash-empty-*`, `.rai-sync-status`, `.rai-progress`, `.rai-cfg-pct`) sin ningún uso en `.ts`/`.tsx`. Para restaurar, pegar la regla en `globals.css` |

## Dudoso: NO se movió, requiere decisión de Reiner

| Elemento | Por qué se dejó |
|---|---|
| `src/components/inventory/InventoryScanner.tsx` | Sin importaciones, pero es reciente (25 sep) y existe `api/inventory`; puede ser una interfaz pendiente de montar (Hidromáticos) |
| `src/app/api/audit/route.ts`, `api/automations/templates/route.ts`, `api/executions/[id]/route.ts` | Sin llamadas internas; podrían ser APIs para integraciones externas. `executions/[id]` figura en una prueba de aislamiento por workspace |
| `public/auth/login-bg-amanecer.webp`, `login-bg-cosmos.webp`, `login-bg-desktop.jpg`, `login-bg-mobile.jpg` | Fondos de login alternativos sin uso (~1,6 MB); son opciones de diseño que Reiner puede querer conservar |
| Clases `.skeleton`, `.skeleton-card`, utilidades genéricas (`.text-gold`, `.p-2`, …), `.au-btn--block`, `.au-skel-row`, `.fx-elev-2/3` | Documentadas o vocabulario de utilidades; retirarlas requiere decidir el sistema de clases |
| `docs/planning/BRAINSTORM-FUNCIONALIDADES-NUEVAS.md`, `docs/AUDITORIA-ARQUITECTURA-BLOQUE-0.5.md` | Todavía los citan documentos vivos (catálogo GHL e historial de entregas) |
| 6 ramas locales ya contenidas en la rama actual (`rai-chore-orquestador-guardrails`, `rai-feat-automatizacion-config`, `rai-feat-automatizacion-ui`, `rai-feat-login-registro-ui`, `rai-feat-programacion-ig`, `security/fase-0`) | Ninguna está en `main`; borrar ramas solo con el «sí» explícito de Reiner |

## No se tocó (reglas bloqueadas o archivos de Reiner)
`AGENTS.md`, `scripts/gate.mjs`, `scripts/panel-check.mjs`, `scripts/rules-guard.mjs`, `.github/`, `.opencode/`, `prisma/`, `docs/INTEGRACION-HIDROMATICOS.md`, `docs/clientes/`, `docs/referencia/`, `docs/planning/Plan 31-1102026/`, `public/auth/login-bg-nocturno.webp`.
