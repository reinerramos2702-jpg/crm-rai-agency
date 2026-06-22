# CONTEXT.md — Estado operativo y línea del tiempo

> Documento vivo. Se actualiza al cerrar cada sesión.
> Para stack, convenciones y arquitectura → ver `MEMORY.md`.

---

## ▶️ SIGUIENTE PASO (actualizar cada sesión)

**Tarea activa (jun 20 2026): Construir tab "Pipeline IG" como 5ta tab dentro de `/automatizacion`. Sistema multi-agente de contenido automático para Hotel MPV (cliente piloto + producto vendible del CRM).**

📦 **Paquete fuente:** `../HOTEL_MPV_PIPELINE/` (15 docs en 11 carpetas):
- `README.md` — mapa maestro
- `01_BRIEF/BRIEF_HOTEL_MPV.md` — brief de marca con `[CONFIRMAR]`
- `02_ARQUITECTURA/SISTEMA_MULTIAGENTE.md` — blueprint + modelos Prisma (§5)
- `03_AGENTES/PROMPTS_AGENTES.md` — prompts de los 12 agentes (A0-A11)
- `04_CALENDARIO/CALENDARIO_30_DIAS.md` — calendario completo del piloto
- `05_CONTENIDO_HOY/{CARRUSEL,REEL}_HOY.md` — primeras piezas listas
- `06_INSTAGRAM_API/SETUP_GUIDE.md` — Meta Developer + tokens
- `07_N8N/{INSTALL_VPS_HOSTINGER,WORKFLOWS_BLUEPRINT}.md` — motor de orquestación
- `08_MODULO_CRM/SPEC_MODULO.md` — spec funcional completa (rutas, API, Prisma, componentes)
- `09_QC/CHECKLIST_QC.md` — quality control pre-publicación
- `11_OPS/{MVP_VS_PRO,LO_QUE_NECESITO_DE_TI}.md` — comparativo + pendientes usuario
- `HANDOFF_CLAUDE_CODE.md` ← **INSTRUCCIÓN QUIRÚRGICA PARA CC** (qué editar, dónde, con qué código)

🎯 **Decisiones cerradas con el usuario:**
- Nombre tab: "Pipeline IG"
- Ubicación: 5ta tab en `/automatizacion` (entre Plantillas y Actividad)
- Cliente piloto: Hotel Muévete por Vargas (Maiquetía, La Guaira)
- Modo de arranque: manual asistido → semi-auto → full-auto cuando Meta App Review pase
- Logo del Hotel: regla dura SSIM≥0.99, jamás regenerar por IA, insertar desde PNG original

🚧 **Pendiente jun 19 (heredado):**
- Capa hotelera Prisma (Guest/Site/Room/Booking/Payment) — corrió OK
- `npx prisma migrate deploy` + `npx prisma generate` (verificar en Windows)
- Módulos esqueleto pendientes detalle: Contenido multimedia, Reputación, Informes, Marketplace

### Modo de trabajo (reglas operativas)

1. Usuario envía captura(s) de GoHighLevel como inspiración + nombre de la pantalla.
2. Identificar si el módulo ya existe en `src/app/` → **actualizar**. Si no existe → **crear ruta nueva**.
3. Replicar SOLO frontend. **Sin** lógica, **sin** DB, **sin** APIs nuevas.
4. **Estética RAI siempre**: paleta oscura dorada, clases CSS de `src/app/globals.css`, iconos `lucide-react`.
5. **Empty states** ("aún no tienes X. Crea el primero") — sin datos demo, MVP nuevo.
6. **Sidebar:** mantener actual + agregar entries solo para módulos nuevos.
7. **Botones:** existen pero muestran `toast('Próximamente')`. Forms renderizan pero no envían.
8. **Componente reutilizable** `src/components/ModulePlaceholder.tsx` para módulos en cascarón.
9. Al terminar cada captura → actualizar este archivo (tabla + bullets de la sesión).
10. Si la pantalla es módulo nuevo grande → actualizar también `MEMORY.md` (tabla §4 Módulos del CRM, comentarios de modelos Prisma si toca).

### Estado al cerrar sesión (jun 18 2026, fin del día)

- ✅ Bulk-skeleton GHL completo (8 módulos esqueleto + componente reutilizable)
- ✅ Launchpad ajustado (círculo SVG + % por item)
- ✅ Contactos detalle (4 tabs)
- ✅ Clientes Potenciales detalle (kanban + modal + drawer + 4 tabs)
- ✅ Agentes IA enhancement Bot Goals (Reserva citas + Workflow triggers en tab Objetivos)
- ✅ **Perf fix dashboard + global** (jun 18 tarde): cache auth+workspace en memoria, fetch timeout 8s, localStorage cache, skeleton cards, headers SWR
- ⏳ Esqueletos esperando captura: Pasajeros, Pagos, Sitios, Contenido multimedia, Reputación, Informes, Aplicaciones del mercado

### Próximo paso inmediato cuando reanudes

**Nuevo flujo (jun 19):** el usuario captura cada módulo GHL a su carpeta en `ghl-capturas/<NN>-<modulo>/` (ver `ghl-capturas/README.md` para convención).

Cuando recibas orden tipo **"replica /pasajeros — carpeta `ghl-capturas/05-pasajeros/`"**:
1. Lee TODAS las imágenes de la carpeta en una sola pasada.
2. Replica el módulo COMPLETO (vista + tabs + modales + drawer + empty states) en una sesión.
3. Estética RAI, sin lógica, empty states, `toast('Próximamente')` en botones.
4. Actualiza esta tabla, marca ✅ en `ghl-capturas/README.md`, agrega bullet al historial.

**Siguiente módulo esperado:** `05-pasajeros/` (hotel-specific).

### Pendientes de Fase 2 (después de terminar replicación)

- **Migración Agentes de IA en DB:** ejecutar en Windows PowerShell:
  ```powershell
  cd content-engine-mvp
  npx prisma migrate deploy   # aplica 20260612060000_add_ai_agents_module
  npx prisma generate
  ```
  El usuario ya corrió `npm run dev` con éxito en puerto **3001** (jun 18). Falta validar visual de `/agentes-ia`.
- **Bot Goals — campos Prisma pendientes** para persistir reserva citas + workflow triggers (ver comentario en modelo `AIAgent` en `MEMORY.md`): `bookingEnabled`, `bookingCalendarId`, `transferAfterBooking`, `nextHandlerKind`, `workflowTriggers Json[]`.
- **n8n multicanal:** 3 ramas pendientes del Switch (WhatsApp/Email/Slack). Telegram ya wired (chat_id `1104381351`).
- **Activar funcionalidades de los módulos replicados** (botón por botón, módulo por módulo, con APIs reales y persistencia DB).

---

## Estado actual de módulos (jun 2026)

| Módulo | Estado | Última acción |
|---|---|---|
| Dashboard `/` | ✅ | Card resumen automatización wired |
| Launchpad `/launchpad` | ✅ | 18 pasos, tutoriales SVG generados |
| Nueva Campaña `/campaign/new` | ✅ | Fix "Continuar planificación", fix streaming |
| Generador Imágenes `/generador-imagenes` | ✅ | Wizard 5 nodos, BYOK, multiproveedor |
| **Agentes de IA `/agentes-ia`** | ✅ código / ⏳ migración DB pendiente | Módulo + **Bot Goals enhancement (jun 18)**: Reserva citas + Workflow triggers en tab Objetivos |
| Conversaciones `/conversaciones` | ✅ | Inbox completo, DB real |
| Calendarios `/calendarios` | ✅ | Citas, disponibilidad, reservas online |
| **Contactos `/contactos`** | ✅ Frontend (jun 18) | 4 tabs: Listas inteligentes / Acciones en lote / Tareas / Empresas |
| **Clientes Potenciales `/clientes-potenciales`** | ✅ Frontend (jun 18) | Kanban 6 etapas + modal Añadir + drawer Personalizar + 4 top-tabs |
| Pasajeros `/pasajeros` | ⏳ Esqueleto | Hotel-specific. Esperando captura |
| Pagos `/pagos` | ⏳ Esqueleto | Esperando captura |
| Sitios `/sitios` | ⏳ Esqueleto | Esperando captura |
| Contenido multimedia `/contenido-multimedia` | ⏳ Esqueleto | Esperando captura |
| Reputación `/reputacion` | ⏳ Esqueleto | Esperando captura |
| Informes `/informes` | ⏳ Esqueleto | Esperando captura |
| Aplicaciones del mercado `/marketplace` | ⏳ Esqueleto | Esperando captura |
| Automatización `/automatizacion` | ✅ + ⏳ Pipeline IG tab | 15 plantillas certificadas, webhook n8n OK. **Nueva 5ta tab "Pipeline IG" en construcción (jun 20)** — sistema multi-agente Hotel MPV. Ver `../HOTEL_MPV_PIPELINE/HANDOFF_CLAUDE_CODE.md` |
| Marketing `/marketing` | ✅ | 8 tabs (datos vacíos — sin DB real aún) |
| Facturación `/facturacion` | ✅ | 10 tabs (datos vacíos — sin DB real aún) |
| Claves de IA `/keys` | ✅ | BYOK funcional |
| Configuración `/settings` | ✅ | n8n, equipo, privacidad |

---

## Historial de replicación GHL (Fase 1 — frontend only)

| Pantalla GHL | Ruta proyecto | Acción | Estado |
|---|---|---|---|
| Guía de configuración (Launchpad) | `/launchpad` | Ajustado (círculo SVG con % por item) | ✅ |
| Contactos (4 sub-tabs) | `/contactos` | Creado nuevo (Listas inteligentes / Acciones en lote / Tareas / Empresas) | ✅ |
| Clientes Potenciales | `/clientes-potenciales` | **Detalle completo** (kanban 6 etapas + modal añadir + drawer personalizar + 4 top-tabs) | ✅ |
| Pasajeros | `/pasajeros` | Esqueleto bulk (Todos / Reservas / Check-in / Check-out) | ⏳ Esqueleto |
| Pagos | `/pagos` | Esqueleto bulk (Transacciones / Suscripciones / Productos / Cupones) | ⏳ Esqueleto |
| Sitios | `/sitios` | Esqueleto bulk (Embudos / Webs / Formularios / Encuestas) | ⏳ Esqueleto |
| Contenido multimedia | `/contenido-multimedia` | Esqueleto bulk (Imágenes / Videos / Documentos) | ⏳ Esqueleto |
| Reputación | `/reputacion` | Esqueleto bulk (Reseñas / Solicitudes / Plantillas / Widgets) | ⏳ Esqueleto |
| Informes | `/informes` | Esqueleto bulk (Resumen / Ventas / Campañas / Fuentes) | ⏳ Esqueleto |
| Aplicaciones del mercado | `/marketplace` | Esqueleto bulk (Destacados / Todas / Instaladas) | ⏳ Esqueleto |

**Leyenda:** ✅ = página replicada en detalle · ⏳ Esqueleto = ruta + header + tabs + empty state, falta detalle (esperando captura).

---

## Historial de sesiones

### Sesión jun 20 2026 — Planificación Pipeline IG (Hotel MPV) + handoff a Claude Code

**Contexto:** usuario pidió armar pipeline completo de contenido IG multi-agente con orquestador + 11 subagentes para Hotel Muévete por Vargas (cliente piloto), que debe quedar como módulo vendible del CRM RAI Agency. Sesión en Cowork mode (Claude desktop). Plan completo entregado, código pendiente — handoff técnico a CC.

**Entregables (todos en `../HOTEL_MPV_PIPELINE/`):**

- `README.md` — mapa maestro + glosario + reality check
- `01_BRIEF/BRIEF_HOTEL_MPV.md` — Constitución de marca, audiencia (3 segmentos), 5 pilares, voz/tono, reglas duras (logo intocable + transfer no-gratis + cero invento), CTAs, hashtags, KPIs
- `02_ARQUITECTURA/SISTEMA_MULTIAGENTE.md` — blueprint 1+11 agentes, diagrama ASCII, loop de corrección con MAX_CICLOS=3, **6 modelos Prisma listos para pegar** (PipelineCampaign/Post/PostImage/QcRun/Metric/HistoryEntry), triggers, modos del sistema
- `03_AGENTES/PROMPTS_AGENTES.md` — prompts completos A0-A11 con criterios OK/KO en JSON estricto
- `04_CALENDARIO/CALENDARIO_30_DIAS.md` — 30 piezas (12 carrusel · 9 reel · 9 post) balanceadas 6 por pilar
- `05_CONTENIDO_HOY/CARRUSEL_HOY.md` + `REEL_HOY.md` — primeras piezas con guion, captions, JSONs Veo 3.1
- `06_INSTAGRAM_API/SETUP_GUIDE.md` — Meta Developer App + tokens + endpoints + errores comunes
- `07_N8N/INSTALL_VPS_HOSTINGER.md` — Docker + Caddy + HTTPS en VPS Hostinger
- `07_N8N/WORKFLOWS_BLUEPRINT.md` — 6 workflows (Brief Sync, Calendar, Content Gen, Publisher, Analytics, Error Watchdog)
- `08_MODULO_CRM/SPEC_MODULO.md` — spec funcional del módulo: rutas, API, componentes, roles, tiers de venta ($97/$297/$797)
- `09_QC/CHECKLIST_QC.md` — 8 bloques · 40+ checks
- `11_OPS/MVP_VS_PRO.md` — comparativo + costos estimados ($40-130/mes/workspace)
- `11_OPS/LO_QUE_NECESITO_DE_TI.md` — pendientes del usuario priorizados (🔥/🟧/🟦/🟩)
- `10_ASSETS_USUARIO/README.md` — estructura para depositar logo + manual + fotos + referencias del Hotel MPV
- **`HANDOFF_CLAUDE_CODE.md`** — instrucción quirúrgica para CC: qué editar línea por línea en `src/app/automatizacion/page.tsx` (líneas 36-41 TOP_TABS + nuevo bloque tras línea 953), componente nuevo `src/components/pipeline-ig/PipelineIGTab.tsx` con 6 sub-tabs, schema Prisma, API routes esqueleto, variables .env, commit sugerido

**Decisiones cerradas:**
- Tab name: "Pipeline IG"
- Ubicación: 5ta tab en `/automatizacion` (entre Plantillas y Actividad), no en `/contenido-multimedia`
- Reality check: API publishing 100% auto requiere App Review Meta (días/semanas). MVP arranca manual asistido vía Meta Business Suite.
- Logo: agente A6 Logo Verifier con SSIM≥0.99, jamás regenerar por IA, insertar siempre desde PNG original

**Pendientes para próxima sesión CC:**
1. Ejecutar `HANDOFF_CLAUDE_CODE.md` paso a paso
2. `npx prisma migrate dev --name add_pipeline_module`
3. Verificar `npx tsc --noEmit` limpio
4. `npm run dev` y validar visual de tab Pipeline IG
5. Commit en branch `feat/pipeline-ig-tab`

**Pendientes para usuario (Dr. SizeStreet):**
1. Vaciar `C:\Users\Reiner Ramos\Downloads\HOTEL` dentro de `10_ASSETS_USUARIO/`
2. Rellenar `[CONFIRMAR]` del brief con datos reales del hotel
3. Generar Meta App Developer + tokens largos IG (guía §6)
4. Setup n8n en VPS Hostinger (guía §7)

---

### Sesión jun 19 2026 — Capa hotelera completa + handoff a cuenta nueva

**Contexto operativo:** usuario migra a otra cuenta de Claude. Esta sesión cierra con:
- Capa hotelera completa: Guest/Site/RoomType/Room/Booking/Payment/PaymentEvent/AuditEvent (8 modelos Prisma + migration SQL + APIs CRUD + UIs detalle)
- Dashboard upgrade con KPIs hotel
- Componentes reutilizables: HelpTip, StatusBadges (5 tipos), HotelKpiPanel
- Audit log global + per-payment
- Handoff package: archivos umbrella en `RAI Agency/` + master system prompt para Cursor (próxima cuenta)

**Modelos Prisma añadidos:** ver MEMORY.md §5 (Hotel layer) — Guest, Site, RoomType, Room, Booking, Payment, PaymentEvent, AuditEvent.

**Migration SQL:** `prisma/migrations/20260619000000_add_hotel_module/migration.sql` — PENDIENTE: usuario corre en Windows PowerShell:
```powershell
cd content-engine-mvp
npx prisma migrate deploy
npx prisma generate
```

**APIs nuevas (15 routes):** ver MEMORY.md §5b — `/api/guests`, `/api/sites`, `/api/rooms`, `/api/room-types`, `/api/bookings`, `/api/payments`, `/api/payments/[id]/transition`, `/api/audit`, `/api/hotel-kpis`.

**Páginas nuevas (8):**
- `/pasajeros` lista (6 tabs estado) + crear modal
- `/pasajeros/[id]` detalle (5 tabs: Perfil/Reservas/Pagos/Mensajes/Notas) + editar + delete
- `/pagos` lista (7 tabs estado) + 3 summary cards + crear modal
- `/pagos/[id]` detalle + máquina de estados (approve/reject/cancel/review/refund) + audit log per-payment
- `/sitios` cards grid + crear modal
- `/sitios/[id]` detalle + inventario habitaciones inline + métricas + editar
- `/reservas` lista (7 tabs estado) + crear modal con valida overlap
- `/reservas/[id]` detalle + transiciones (confirmar/check-in/check-out/cancelar/no-show) + pagos vinculados

**Sidebar:** entry `Reservas` agregada entre Pasajeros y Pagos. ACL en `roles-shared.ts`: `/reservas` para todos los roles.

**Dashboard `/`:** agregado `<HotelKpiPanel />` arriba — KPIs llegadas/salidas/ocupación/ingresos + alertas (pendientes/overdue/unread) + listas recientes.

**Componentes reutilizables nuevos:**
- `src/components/ui/HelpTip.tsx` — tooltip contextual (icono "?" o wrapper)
- `src/components/hotel/StatusBadges.tsx` — 5 badges + labels + `formatMoney()`
- `src/components/dashboard/HotelKpiPanel.tsx` — panel KPI para Dashboard
- `src/lib/audit.ts` — `logAudit()` + `generateReference('PAY'|'BK')`

**Perf optimizations:**
- `src/lib/auth.ts` — cache memoria dev user + TTL JWT users 5min
- `src/lib/workspace.ts` — cache memoria del workspace por userId
- API GET con header SWR `Cache-Control: private, max-age=5, stale-while-revalidate=30`
- Dashboard con localStorage cache instantáneo + fetch timeout 8s + skeleton cards

**Pendientes para cuenta nueva (Cursor + claude.ai web):**
1. `npx tsc --noEmit` en Windows → verificar que compila limpio (probablemente hay unused imports menores en /pasajeros/[id] como `CalendarIcon`)
2. Migración Prisma + generate (Windows PowerShell)
3. Probar visualmente cada módulo nuevo
4. Detallar módulos restantes esqueleto: Contenido multimedia, Reputación, Informes, Marketplace
5. Tooltips contextuales en módulos viejos (Conversaciones/Calendarios/Marketing/Facturación)
6. Conectar datos reales a Marketing + Facturación (siguen frontend-only)
7. Upload de comprobante de pago (proofUrl) — botón existe, falta integración R2/Supabase storage
8. Audit log UI (`/audit` o `/settings/actividad`) — backend listo, falta página
9. Automatizaciones cron pendientes: auto-flag overdue payments, auto-detect incomplete profiles
10. UI listas inteligentes de Contactos sin lógica todavía

### Sesión jun 18 2026 (tarde) — Perf fix: dashboard atascado en "Cargando campañas..."
- **Síntoma:** dashboard se quedaba en spinner indefinido; usuario reportó carga lenta global del CRM
- **Causa raíz:** cada request del CRM ejecutaba 2 queries DB innecesarias antes de la query real:
  - `getAuth` → `prisma.user.upsert` (DB hit) — incluso en modo dev bypass
  - `getOrCreateWorkspace` → `prisma.workspace.findFirst` (DB hit) — siempre repetido
  - Sobre Supabase pooler (`aws-1-us-west-2`), cada round-trip = 200-800ms → 3 trips antes de data = 1-2s mínimo
- **Fixes aplicados:**
  - `src/lib/auth.ts`: cache en memoria del usuario dev (flag `devUserSynced`); cache TTL 5min para usuarios JWT (`authCache: Map`); upsert con `try/catch` para no bloquear si DB falla
  - `src/lib/workspace.ts`: `Map<userId, workspace>` en memoria; helper `invalidateWorkspaceCache` exportado
  - `src/app/page.tsx` (Dashboard):
    - `fetchWithTimeout` con AbortController (8s) → spinner ya no se queda colgado
    - localStorage cache (`rai_dash_campaigns_v1`, `rai_dash_automations_v1`) → pintado instantáneo al recargar la página
    - Skeleton cards en lugar de spinner único (mejor percepción de velocidad)
    - Botón Recargar manual en TopBar con icono `RefreshCw` animado
    - Soft-fail: si timeout/error, toast pero no bloquea UI; muestra última versión cacheada
  - `src/app/api/campaigns/route.ts` + `src/app/api/automations/route.ts`: header `Cache-Control: private, max-age=5, stale-while-revalidate=30` → navegador sirve copia instantánea al navegar entre páginas
  - `src/app/globals.css`: clases `.skeleton`, `.skeleton-card`, `.spin` + keyframes `skeleton-shimmer`
- **Resultado esperado:** dashboard pinta cards skeleton instante 0; datos reales llegan típicamente <500ms (2da carga, gracias a cache); jamás queda atascado (timeout 8s con fallback)
- **Pendiente verificar:** usuario corre `npm run dev` en puerto 3001 y valida visualmente

### Sesión jun 18 2026 — Inicio replicación frontend GHL
- Definido modo de trabajo: capturas → frontend replica (sin lógica) → empty states → estética RAI
- Captura 1: Launchpad/Guía de configuración → ya existía `/launchpad`, ajustes cosméticos aplicados:
  - Checkbox cuadrado → círculo SVG con progress arc (estilo GHL)
  - Agregado % por item (0% pendiente, 100% completo) a la derecha del item
  - Nuevas clases CSS en `globals.css`: `.lp-ring`, `.lp-ring-track`, `.lp-ring-fill`, `.lp-ring-check`, `.lp-ring-pct`
- Sin cambios en lógica, persistencia localStorage intacta, tutoriales SVG intactos
- Captura 2: Contactos (4 sub-tabs GHL) → módulo nuevo `/contactos` creado:
  - `src/app/contactos/page.tsx` — página con 4 top-tabs: Listas inteligentes / Acciones en lote / Tareas / Empresas
  - Sub-tabs internos por tab cuando aplica (Tareas: Todo/Vence hoy/Atrasado/Próximos; Empresas/Listas: Todo)
  - Headers con título + badge count "0" + botones (Importar/Agregar/⋮)
  - Toolbars de filtros (Filtros avanzados, Ordenar, Search, Administrar campos)
  - Tablas con thead replicados + tbody empty state (icono dorado en círculo + título + hint)
  - Paginador inferior con selector page-size (20/50/100)
  - Botones de acción muestran `toast('Próximamente')` — sin lógica
  - Sidebar `Sidebar.tsx`: entry `Users` agregada después de Calendarios
  - `roles-shared.ts`: `/contactos` agregado a MODULE_ACCESS (4 roles)
- **Bulk-skeleton GHL (8 módulos nuevos)** — para tener sidebar completo y navegable antes de detallar:
  - Componente reutilizable `src/components/ModulePlaceholder.tsx` (header + tabs + toolbar + empty state)
  - 8 páginas creadas con `ModulePlaceholder`:
    - `/clientes-potenciales` (Pipeline / Formularios / Analytics)
    - `/pasajeros` (Todos / Reservas / Check-in / Check-out) — hotel-specific
    - `/pagos` (Transacciones / Suscripciones / Productos / Cupones) — separado de Facturación
    - `/sitios` (Embudos / Sitios web / Formularios / Encuestas)
    - `/contenido-multimedia` (Imágenes / Videos / Documentos)
    - `/reputacion` (Reseñas / Solicitudes / Plantillas / Widgets)
    - `/informes` (Resumen / Ventas / Campañas / Fuentes)
    - `/marketplace` (Destacados / Todas / Instaladas)
  - Sidebar `NAV_ITEMS` actualizado: 8 nuevas entries en orden GHL (después de Contactos y entre Marketing/Facturación)
  - `roles-shared.ts` MODULE_ACCESS: 8 entradas nuevas con ACL diferenciada (Pagos/Marketplace solo admin+gerente; Informes admin+gerente+viewer; resto los 4 roles)
  - Tablero/Dashboard ya existía en `/` → no se duplica
- Doc GHL "AI Bot Goals" revisada → enhancement a `/agentes-ia/[id]` tab Objetivos:
  - Nueva card "Reserva de citas": toggle Activar + selector calendario (link a `/calendarios`) + toggle "Transferir tras reservar" + dropdown handler siguiente (humano/bot) + hint informativo
  - Nueva card "Disparadores de workflow": toggle Activar + selector condición (Reserva completada, Conversación finalizada, Intención compra/soporte, Handoff solicitado) + selector workflow (link a `/automatizacion`) + hint informativo
  - State local (`bookingEnabled`, `bookingCalendar`, `transferAfterBooking`, `nextHandler`, `workflowTriggerEnabled`, `triggerCondition`, `triggerWorkflow`) — frontend only, no persistido a DB todavía
  - Cubre el 100% de las 3 piezas de GHL Bot Goals que faltaban (Prompt ya existía; Appointment Booking + Workflow Triggers ahora visualizados)
  - Pendiente Fase 2: agregar campos al modelo Prisma `AIAgent` (bookingEnabled, bookingCalendarId, transferAfterBooking, nextHandlerKind, workflowTriggers Json[]) + persistencia API
- Captura 3 (5 imgs): Clientes Potenciales completo → `/clientes-potenciales` upgrade de esqueleto a detalle:
  - 4 top-tabs: Clientes Potenciales (kanban) / Pronóstico / Secuencia / Acciones en lote
  - **Vista kanban (board)**: 6 columnas con color por etapa (Nuevo Lead azul, Contacto Inicial teal, Consulta/Cotización morado, Propuesta Enviada rojo, En Negociación naranja, Reserva Confirmada melocotón). Cada columna: header con borde de color + count + valor + dropzone vacía + botón "Añadir"
  - **Vista lista**: tabla con columnas Nombre/Etapa/Contacto/Valor/Propietario/Fecha cierre/Estado + empty state
  - **Toggle vista** board/list con iconos LayoutGrid/List + dropdown "+ Lista" con descripción
  - **Modal "Añadir oportunidad"**: 2 secciones (Contacto Detalles + Oportunidad Detalles) con todos los campos GHL (12 inputs)
  - **Drawer derecho "Personalizar la tarjeta"**: vista previa de card + radio diseño (Por defecto/Compacto/Sin etiquetar) + tabs (Campos/Actividades rápidas) + lista de 7 campos con checkboxes + grip handle + secciones expandibles
  - **Empty state grande**: ilustración SVG gato + escritorio + monitor (CatEmpty) + "¡Crea tu primera oportunidad!" + CTAs
  - **Pronóstico**: 3 cards (Este mes/Próximo mes/Trimestre) + placeholder reporte
  - **Secuencia**: tabla con 6 etapas + color chip + probabilidad/oportunidades/valor + editar
  - **Acciones en lote**: empty state historial
  - Toolbar completa: Embudo selector + count badge + view toggle + Importar + Añadir + ⋮ + sub-tabs + filtros + search + Gestionar campos
  - Todos los botones de acción son interactivos visualmente; las acciones reales muestran `toast`

### Sesión jun 12 2026 — Módulo Agentes de IA (parte 1)
- Diseñados y agregados modelos Prisma: `AIAgent`, `KnowledgeBase`, `KnowledgeBaseItem`, `AIAgentKnowledgeBase`, `Conversation.agentId`
- Migración SQL manual creada: `prisma/migrations/20260612060000_add_ai_agents_module/migration.sql`
- APIs creadas:
  - `GET/POST /api/ai-agents` (lista + crear)
  - `GET/PATCH/DELETE /api/ai-agents/[id]` (detalle, update, delete)
  - `POST /api/ai-agents/[id]/duplicate`
  - `GET/POST /api/ai-agents/[id]/triggers`
  - `PATCH/DELETE /api/ai-agents/[id]/triggers/[triggerId]`
  - `GET /api/ai-agents/dashboard` (métricas tablero)
  - `POST /api/ai-agents/[id]/test` (chat de prueba con streaming LLM + KB)
  - `GET/POST /api/knowledge-bases`
  - `GET/PATCH/DELETE /api/knowledge-bases/[id]`
  - `GET/POST /api/knowledge-bases/[id]/items`
  - `PATCH/DELETE /api/knowledge-bases/[id]/items/[itemId]`

### Sesión jun 18 2026 — Módulo Agentes de IA (parte 2, completado)
- Página `/agentes-ia` (lista + tablero): tabs Tablero/Lista, SVG LineChart, métricas, tabla de conversaciones, CRUD agentes con menú contextual
- Página `/agentes-ia/[id]` (detalle): 3 sub-tabs:
  - Configuración: nombre, canales, avgSecondsPerMessage, status toggle, marcar principal
  - Entrenamiento: KB triggers con modal de vinculación, edición de triggerCondition, desvincular
  - Objetivos: personalidad/objetivo/info + LLM picker local + panel "Probar bot" con `useChat`
- Página `/agentes-ia/base-conocimiento` (lista KBs): cards, crear/eliminar, leyenda de tipos
- Página `/agentes-ia/base-conocimiento/[id]` (detalle KB): 5 tabs (FAQs/Texto/Tablas/Archivos/Rastreador web), CRUD completo por tipo, editor de tablas dinámico
- Sidebar: entry "Agentes de IA" con icono `Bot` agregado entre Generador Imágenes y Conversaciones
- `roles-shared.ts`: `/agentes-ia` agregado a MODULE_ACCESS para todos los roles
- tsc: no verificado (pendiente — usuario debe correr en Windows)

### Sesión jun 11 2026 — Automatización + n8n + limpieza
- Módulo Automatización certificado: 15/15 plantillas OK
- n8n webhook configurado y probado: HTTP 200
- Telegram wired end-to-end (chat_id real: 1104381351)
- Carpeta `borrar/` creada para archivos temporales
- tsc limpio ✅

### Sesión jun 11 2026 — Módulo Automatización (construcción)
- Motor: `src/lib/automations/` (types, conditions, actions, engine)
- 15 plantillas: `src/lib/automations/templates.ts`
- API routes: `/api/automations/*`
- Página `/automatizacion` completa con builder secuencial

### Sesión jun 10–11 2026 — Calendarios + Reservas online
- Módulo Calendarios construido (3 tabs), migración aplicada
- Disponibilidad semanal + reservas online (`/book/[slug]`)
- Prueba E2E en DB real: OK ✅
- tsc limpio ✅

### Sesiones anteriores (may–jun 2026)
- Dashboard, Conversaciones, Marketing, Facturación, Launchpad, Generador Imágenes, Nueva Campaña

---

## 3. Pendientes / backlog

### P1 — Migración Agentes de IA (URGENTE antes de usar el módulo)
```powershell
cd content-engine-mvp
npx prisma migrate deploy
npx prisma generate
npx tsc --noEmit     # verificar que compila limpio
```

### P2 — n8n multicanal (3 ramas pendientes)
El Switch ya tiene 4 salidas. Telegram wired. Faltan WhatsApp, Email, Slack.
Requiere que el usuario aporte credenciales del canal elegido.
Payload que envía la app: `{ event, message, channel, contact: {id,name,email,phone}, appointment: {id,title,status,startTime} }`
URL: `https://raiagency.app.n8n.cloud/webhook/34fa180d-cb17-4d1e-9be8-c5ded295427f`

### P3 — Conectar datos reales a Marketing + Facturación
Ambas secciones muestran estado vacío (honesto). Conectar a tablas de DB para mostrar datos reales de clientes.

### P4 — Verificación visual módulo Agentes de IA
Usuario debe correr `npm run dev` local y revisar:
- `/agentes-ia` (tablero y lista de agentes)
- `/agentes-ia/[id]` (3 tabs)
- `/agentes-ia/base-conocimiento` (lista + detalle KB)
- Test de chat en pestaña "Objetivos del bot"

### P5 — Roadmap general
- PayPal/Stripe/Mercado Pago reales (requiere credenciales sandbox)
- Logo: quitar fondo, marco dorado resplandeciente
- Mascota IA 3D (Three.js)
- Rediseño Facturas
- AI Builder de Automatización (ahora placeholder "próximamente")
- Mejoras Launchpad: animaciones SVG, thumbnails en cards, script de sync ids

### P6 — Limpieza pendiente (manual, desde Windows)
- `borrar/` en raíz del workspace: eliminar archivos temporales
- `_image_sort_work/` y `tools/` en raíz: confirmar con usuario si son reutilizables
- `tsconfig.e2e.json` en raíz del proyecto: build helper, decidir si conservar

---

## 4. Notas importantes de continuidad

- `tsconfig.e2e.json` existe en raíz del proyecto — no rompe nada, es helper para `scripts/e2e-automations.ts`
- Página `/book/[slug]` usa el layout raíz (con Sidebar) pero lo oculta con `position:fixed; inset:0; z-index:9999` — si se necesita página pública "limpia" hay que mover rutas CRM a route group `(app)` con layout propio
- n8n webhook correcto: ruta `/webhook/<path>` (producción). La ruta `/mcp-server/http` es el protocolo MCP, no sirve para webhooks
- `content-engine-mvp` es el proyecto principal. La raíz del workspace (`Sistema de Automatización de Contenido/`) contiene archivos legacy/tools; no mezclar

---

*Actualiza este archivo al cerrar cada sesión: agrega la sesión al historial, marca P's completadas, actualiza el "SIGUIENTE PASO".*
