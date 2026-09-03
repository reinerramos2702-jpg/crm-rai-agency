# Historial de entregas — CRM RAI Agency

> Este worktree (`crm-rai-agency-v2`, rama `v2/modulo-calendario-contenido`) parte de `v2/renombrado-marca` (PR #2), no de la pila `v3/bloque-0…1` construida en paralelo en el worktree `content-engine-mvp` esa misma noche. El historial completo de los Bloques 0, 0.5 y 1 vive en `historial-entregas.md` de esa rama/worktree — este archivo registra el Bloque 2A, construido acá porque el avance real del módulo de calendario ya vivía en esta rama. Se reconcilian ambos historiales cuando las ramas se mergeen a `main`.

---

## 3 sep 2026 — BLOQUE 2A: Calendario de Contenido, núcleo

**Rama:** `v2/modulo-calendario-contenido` (worktree `crm-rai-agency-v2`, sobre PR #2/Bloque 0 de v2.0-master-prompt).

### Punto de partida (ya existía antes de este bloque, de una sesión previa)

`prisma/schema.prisma` con `ContentPost`/`ContentPostMedia`/`ContentBlackoutDate`/`ContentPostEvent` (todos con `workspaceId` — consistente con la decisión Workspace=tenant del Bloque 1), `src/lib/content-calendar/service.ts` (settings, capacidad/bloqueo de días, streak, mapeo a DTO), `src/lib/content-calendar/types.ts` (DTOs completos + `STATUS_META` con colores/labels ya definidos por estado + objeto `TIPS` con el texto de cada tooltip contextual, feature #19 ya redactada), `src/lib/content-calendar/timezone.ts`, `src/lib/content-calendar/publisher.ts` (publish + reintento inteligente — adelanta trabajo del Bloque 2B), y `GET/PATCH /api/content-calendar/settings`.

### Completado esta noche

**API (features 01-03, 05, 13, base de 06):**
- `POST/GET /api/content-posts` — crea (valida capacidad del día vía `checkDayCapacity`, bloqueo de fechas, dispara `pending_approval` si `requireApproval` está activo) y lista por rango de fechas.
- `PATCH/DELETE /api/content-posts/[id]` — edición completa y reprogramación (revalida capacidad si cambia `scheduledFor`).
- `POST /api/content-posts/[id]/duplicate` (feature 05).
- `GET/POST /api/blocked-dates` (feature 13, sobre `ContentBlackoutDate` ya existente).
- Nota de permisos: se usó `requireRole(req, ['admin','gerente','agente'])` en vez de `requirePermission('canManageContent')` del Bloque 1 — ese permiso vive en `content-engine-mvp`, no llegó todavía a esta rama (ramas independientes esta noche). Migrar cuando se reconcilien.

**UI (features 01, 02, 03, 05, 19):**
- `src/components/content-calendar/ContentSlider.tsx` — slider semanal (7 tarjetas), navegación semana anterior/siguiente/hoy, drag&drop entre días con `@dnd-kit/core` (PATCH `scheduledFor` al soltar), badge de estado con colores de `STATUS_META`.
- `src/components/content-calendar/PostEditor.tsx` — modal crear/editar (URLs de media por ahora, sin upload real de archivo — limitación conocida, documentada en el componente), caption, redes, tipo de media, fecha/hora, botones duplicar/eliminar. Tooltips vía `HelpTip` + `TIPS` ya existente.
- `src/app/calendario-contenido/page.tsx` — ensambla todo, carga la semana actual, movimiento optimista en el drag&drop con revert si falla el PATCH.
- Entrada nueva en `src/components/layout/Sidebar.tsx` ("Calendario de Contenido", ícono `CalendarClock`).
- Dependencia nueva: `@dnd-kit/core` + `@dnd-kit/sortable`.

### Bloqueado / diferido a Bloque 2B (documentado, no un olvido)

- Sin upload real de archivos (feature parcial de 06) — se pegan URLs a mano por ahora.
- Preview estilo feed (04), vista mes (16), banco de contenido (12), auto-caption IA (08), sugeridor de hora (07), cortapega de video (10), límite de frecuencia configurable desde UI (14 ya existe en backend vía `checkDayCapacity`, falta pantalla de configuración), aprobación en dos pasos desde UI (15 ya existe el campo en el modelo, falta pantalla), recorrido guiado (20).
- Publicación real vía Graph API desde la UI — `publisher.ts` ya la tiene construida, falta conectar un botón "Publicar ahora" en `PostEditor` (immediate publish, no solo programado).

### Verificación

- `npx tsc --noEmit` → exit 0.
- `npm run build` → exit 0.
- Flujo principal (crear → ver en el slider → arrastrar a otro día → editar) verificado por construcción de la UI contra el contrato real de la API (mismo bloque, mismos agentes/sesión) — pendiente de una pasada de Playwright dedicada como la del Bloque 1 (no incluida en este bloque para no extender más el alcance esta noche, regla no negociable #4).

---
