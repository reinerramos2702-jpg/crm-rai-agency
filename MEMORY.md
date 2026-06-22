# MEMORY.md — Contexto técnico permanente del proyecto

> Estado estructural del codebase. Se actualiza solo cuando cambia algo de arquitectura.
> Para el estado de tareas y sesiones → ver `CONTEXT.md`.

---

## 1. Visión del producto

**RAI Agency Content Engine** — CRM SaaS tipo GoHighLevel, multi-tenant, para negocios con ingresos activos. Gestiona clientes, conversaciones, campañas, marketing, facturación, automatizaciones y agentes de IA, todo centralizado. Objetivo: vendible como producto a terceros.

Principios: escalable, modular, UX sin fricción para usuarios no técnicos, datos reales (cero datos hardcodeados/demo en UI de producción).

---

## 2. Stack técnico

| Capa | Tecnología | Versión |
|---|---|---|
| Framework | Next.js App Router + TypeScript | 14.2.35 |
| ORM | Prisma | 5.22.0 |
| DB | PostgreSQL (Supabase pooler) | - |
| IA | Vercel AI SDK | 4.x |
| Estilos | CSS custom properties (globals.css) | - |
| Iconos | lucide-react | 0.400.0 |
| Toasts | react-hot-toast | - |
| Chat IA (cliente) | `useChat` de `ai/react` (`@ai-sdk/react`) | - |

**Paths importantes:**
- `src/app/` — páginas y API routes (App Router)
- `src/lib/` — lógica compartida (auth, roles, db, llm-providers, automations/)
- `src/components/layout/Sidebar.tsx` — navegación lateral
- `src/components/ModulePlaceholder.tsx` — esqueleto reutilizable para módulos en construcción (header + tabs + toolbar + empty state)
- `src/components/ui/HelpTip.tsx` — tooltip contextual reutilizable (`<HelpTip content="..."/>` icono "?", o wrapper sobre cualquier children)
- `src/components/hotel/StatusBadges.tsx` — `PaymentStatusBadge`, `BookingStatusBadge`, `GuestStatusBadge`, `RoomStatusBadge`, `SiteStatusBadge` + `*_STATUS_LABELS` + `formatMoney(cents, currency)`
- `src/components/dashboard/HotelKpiPanel.tsx` — panel KPIs hoteleros para Dashboard (llegadas/salidas/ocupación/ingresos + alertas + listas recientes)
- `src/lib/audit.ts` — `logAudit({...})` + `generateReference('PAY'|'BK')`
- `src/app/globals.css` — ÚNICO archivo de estilos (CSS variables + clases)
- `prisma/schema.prisma` — modelo de datos completo
- `prisma/migrations/` — historial de migraciones SQL

---

## 3. Auth y roles

**Auth**: `src/lib/auth.ts` → `getAuth(req)` → `AuthContext { userId, email }`

**Roles** (`src/lib/roles-shared.ts` + `src/lib/roles.ts`):
- Tipos: `admin | gerente | agente | viewer`
- `requireRole(req, allowed[])` → devuelve `RoleContext | NextResponse`
- `isRoleContext(ctx)` → type guard
- `RoleContext { auth: AuthContext; workspace: { id, ownerId, name }; role }`
- Acceso a módulos: `MODULE_ACCESS` en `roles-shared.ts` — agregar entrada ahí al crear módulo nuevo
- Sidebar: `NAV_ITEMS` en `Sidebar.tsx` — agregar entrada en orden correcto

---

## 4. Módulos del CRM

| Módulo | Ruta | Estado | Notas |
|---|---|---|---|
| Dashboard | `/` | ✅ Vivo | Card resumen automatización |
| Guía de inicio | `/launchpad` | ✅ Vivo | Checklist 18 pasos, tutoriales SVG |
| Nueva Campaña | `/campaign/new` | ✅ Vivo | 8 agentes IA, wizard, persistencia |
| Generador Imágenes | `/generador-imagenes` | ✅ Vivo | Wizard 5 nodos, multi-proveedor |
| **Agentes de IA** | `/agentes-ia` | ✅ Vivo (jun 2026) | Chat + voz, KB, tablero — nuevo |
| Base de Conocimiento | `/agentes-ia/base-conocimiento` | ✅ Vivo (jun 2026) | Sub-sección de Agentes de IA |
| Conversaciones | `/conversaciones` | ✅ Vivo | Inbox 3 col, 6 tabs, 8 paneles |
| **Contactos** | `/contactos` | ✅ Frontend (jun 2026) | 4 tabs: Listas inteligentes / Acciones en lote / Tareas / Empresas. Empty states, sin lógica |
| **Clientes Potenciales** | `/clientes-potenciales` | ✅ Frontend (jun 2026) | Kanban 6 etapas, modal Añadir, drawer Personalizar, 4 top-tabs (Oportunidades/Pronóstico/Secuencia/Lote) |
| **Pasajeros / Huéspedes** | `/pasajeros` `/pasajeros/[id]` | ✅ Vivo (jun 19 2026) | Hotel-ready full: lista + 6 tabs estado + crear modal + detalle 5 tabs (Perfil/Reservas/Pagos/Mensajes/Notas), API CRUD, audit log |
| **Reservas** | `/reservas` `/reservas/[id]` | ✅ Vivo (jun 19 2026) | NUEVO. Booking hotel: lista + 7 tabs estado + crear modal (huésped+sitio+habitación+fechas) + detalle con máquina de estados (confirmar/check-in/check-out/cancelar) + pagos vinculados |
| **Pagos** | `/pagos` `/pagos/[id]` | ✅ Vivo (jun 19 2026) | CRUD completo + 6 estados + máquina de transiciones (approve/reject/cancel/review/refund) + summary cards (cobrado/por cobrar/reembolsado) + filtros + audit log per-payment |
| **Sitios / Sucursales** | `/sitios` `/sitios/[id]` | ✅ Vivo (jun 19 2026) | CRUD + inventario habitaciones inline + métricas (reservas activas / ingresos mes) + tipos habitación |
| Contenido multimedia | `/contenido-multimedia` | ⏳ Esqueleto | Imágenes / Videos / Documentos |
| Reputación | `/reputacion` | ⏳ Esqueleto | Reseñas / Solicitudes / Plantillas / Widgets |
| Informes | `/informes` | ⏳ Esqueleto | Resumen / Ventas / Campañas / Fuentes |
| Aplicaciones del mercado | `/marketplace` | ⏳ Esqueleto | Destacados / Todas / Instaladas |
| Calendarios | `/calendarios` | ✅ Vivo | 3 tabs, disponibilidad, reservas online |
| Reservas online | `/book/[slug]` | ✅ Vivo | Página pública sin auth |
| Automatización | `/automatizacion` | ✅ Vivo + ⏳ Pipeline IG tab | 15 plantillas, motor, webhook n8n. **5ta tab "Pipeline IG" en construcción (jun 20)** — sistema multi-agente Hotel MPV. Ver `../HOTEL_MPV_PIPELINE/HANDOFF_CLAUDE_CODE.md` |
| Marketing | `/marketing` | ✅ Vivo | 8 tabs |
| Facturación | `/facturacion` | ✅ Vivo | 10 tabs, conectores placeholder |
| Claves de IA | `/keys` | ✅ Vivo | BYOK, cifrado AES-256-GCM |
| Configuración | `/settings` | ✅ Vivo | n8n, equipo, privacidad |

---

## 5. Modelos Prisma (resumen)

**Usuarios/Workspace:**
`User`, `Workspace` (brandDocText/brandDocName), `WorkspaceMember`, `ApiKey`, `Settings` (n8nWebhookUrl, calendarHideEventDetails)

**Campañas/Pipeline:**
`Campaign` (chatHistory Json, masterJson Json), `Execution`, `Task`, `Asset`, `Event`

**🆕 Pipeline IG (Hotel MPV — pendiente migración):**
`PipelineCampaign`, `PipelinePost` (status: draft|copy_done|design_done|qc_ok|scheduled|published|failed|escalated), `PipelinePostImage`, `PipelineQcRun` (agent: logo_verifier|brand_compliance), `PipelineMetric` (horizon: h24|h48|h7d), `PipelineHistoryEntry` (auditoría del loop multi-agente).
Migration: `20260620_add_pipeline_module/migration.sql`. Schema completo en `../HOTEL_MPV_PIPELINE/02_ARQUITECTURA/SISTEMA_MULTIAGENTE.md §5`.

**Conversaciones:**
`Contact`, `Conversation` (agentId? → AIAgent), `Message`, `Note`, `ContactTask`, `Snippet`, `ActivationLink`

**Calendarios:**
`CalendarGroup`, `CalendarResource` (availability Json, bookingEnabled, bookingSlug), `Appointment`

**Automatización:**
`Workflow` (steps Json, trigger, status), `WorkflowRun` (log Json)

**Generador Imágenes:**
`ContentGrid` (status, currentStep, stateJson), `ContentGridTheme`, `ContentGridSlide`

**Agentes de IA (jun 2026):**
```
AIAgent
  id, workspaceId, name
  status: 'active' | 'suggested' | 'disabled'
  isPrimary: Boolean          -- solo 1 por workspace
  kind: 'chat' | 'voice'
  channels: String[]
  llmProvider, llmModel
  personality, objective, additionalInfo (Text)
  welcomeMessage, fallbackMessage
  avgSecondsPerMessage: Int (default 8)
  → triggers: AIAgentKnowledgeBase[]
  → conversations: Conversation[]

  -- Pendiente Fase 2 (UI ya visualiza, falta backend):
  -- bookingEnabled: Boolean, bookingCalendarId: String?,
  -- transferAfterBooking: Boolean, nextHandlerKind: 'humano'|'bot'|null,
  -- workflowTriggers: Json[] (condición + workflowId)

KnowledgeBase
  id, workspaceId, name, description
  → items: KnowledgeBaseItem[]
  → triggers: AIAgentKnowledgeBase[]

KnowledgeBaseItem
  type: 'faq' | 'text' | 'table' | 'file' | 'url'
  question, answer (faq)
  title, content (text/file/url)
  data: Json (table → {columns, rows}; file/url metadata)

AIAgentKnowledgeBase (join table)
  agentId, knowledgeBaseId
  triggerCondition: String?
  @@unique([agentId, knowledgeBaseId])
```

**Hotel layer (jun 19 2026 — nuevo):**
```
Guest                                  -- huésped del negocio (hotel/transporte/tour)
  workspaceId, contactId? (CRM link)
  firstName, lastName, email, phone
  documentType (passport|national_id|driver_license|other), documentNumber
  nationality (ISO 3166-1 alpha-2), dateOfBirth
  emergencyContactName, emergencyContactPhone
  status: 'active'|'staying'|'checked_out'|'inactive'|'vip'|'blacklisted'
  preferredLanguage, tags String[], notes
  totalStays Int, totalSpentCents Int, lastStayAt    -- denormalizado para listas
  → bookings: Booking[], payments: Payment[]

Site                                   -- locación física (hotel, restaurant, office)
  workspaceId, name, slug (unique)
  type: 'hotel'|'restaurant'|'office'|'venue'|'other'
  address, city, country, postalCode, latitude?, longitude?
  contactName, contactPhone, contactEmail
  capacity Int, status: 'active'|'maintenance'|'closed'
  → rooms: Room[], bookings: Booking[], payments: Payment[]

RoomType                               -- categoría (Single, Double, Suite)
  workspaceId, name, description
  basePriceCents, currency, maxOccupancy, amenities String[]

Room                                   -- habitación física
  workspaceId, siteId, roomTypeId?
  number (string, soporta "101","A-203")
  floor?, status: 'available'|'occupied'|'cleaning'|'maintenance'|'out_of_order'
  @@unique([siteId, number])

Booking                                -- reserva hotelera (≠ Appointment de Calendarios)
  workspaceId, guestId, siteId, roomId?
  reference: 'BK-XXXXXX' (unique, alphabet sin chars ambiguos)
  status: 'pending'|'confirmed'|'checked_in'|'checked_out'|'cancelled'|'no_show'
  checkInDate, checkOutDate, adults, children
  source: 'direct'|'booking_com'|'airbnb'|'expedia'|'walkin'|'phone'|'other'
  totalAmountCents, paidAmountCents, currency
  specialRequests, internalNotes, cancelledReason?
  actualCheckIn?, actualCheckOut?
  → payments: Payment[]
  -- Al pasar a 'checked_out': denormaliza Guest.totalStays++, Guest.totalSpentCents+=, Guest.lastStayAt
  -- Al checkear: validación de overlap con bookings activos en misma roomId

Payment                                -- pago/transacción
  workspaceId, reference: 'PAY-XXXXXX' (unique)
  guestId?, bookingId?, siteId?
  amountCents, currency
  method: 'cash'|'card'|'transfer'|'paypal'|'stripe'|'mercadopago'|'crypto'|'check'|'other'
  status: 'pending'|'paid'|'failed'|'cancelled'|'refunded'|'under_review'
  paidAt?, proofUrl?, transactionRef?
  notes?, internalComments?
  createdById, approvedById?, approvedAt?
  refundedAmountCents, refundedAt?
  → events: PaymentEvent[]
  -- Transiciones permitidas (state machine):
  --   pending → paid (approve) | failed (reject) | cancelled (cancel) | under_review (review)
  --   under_review → paid | failed | cancelled
  --   paid → refunded (refund con monto)
  --   failed → under_review (review)
  -- Al approve+bookingId: Booking.paidAmountCents+=amountCents
  -- Al refund+bookingId: Booking.paidAmountCents-=refundedAmountCents

PaymentEvent                           -- audit log per-payment
  paymentId, actorUserId
  action: 'created'|'updated'|'approved'|'rejected'|'refunded'|'note'|'proof_uploaded'
  fromStatus, toStatus, meta Json

AuditEvent                             -- audit log global del workspace
  workspaceId, userId
  action ('guest.created', 'booking.cancelled', 'payment.approved', ...)
  entityType ('guest'|'booking'|'payment'|'site'|'room'|...)
  entityId?, meta Json, ipAddress?, userAgent?
  -- Helper: src/lib/audit.ts → logAudit({...}) (tolera fallo, no bloquea)
```

**Migration SQL:** `prisma/migrations/20260619000000_add_hotel_module/migration.sql` — usuario corre `npx prisma migrate deploy` + `npx prisma generate` en Windows PowerShell.

---

## 5b. API routes hoteleras (jun 19 2026)

| Endpoint | Roles | Acción |
|---|---|---|
| `GET /api/guests` | admin/gerente/agente/viewer | Lista + filtros (q, status) + totalsByStatus |
| `POST /api/guests` | admin/gerente/agente | Crear huésped |
| `GET/PATCH/DELETE /api/guests/[id]` | admin/gerente (DELETE solo si sin bookings/payments) | Detalle con bookings/payments incluidos |
| `GET /api/sites` | admin/gerente/agente/viewer | Lista con _count rooms/bookings/payments |
| `POST /api/sites` | admin/gerente | Crear (slug auto desde name) |
| `GET/PATCH/DELETE /api/sites/[id]` | admin/gerente | Detalle + métricas (activeBookings, monthRevenueCents) |
| `GET/POST /api/rooms` | admin/gerente | filtros siteId, status |
| `PATCH/DELETE /api/rooms/[id]` | admin/gerente | DELETE solo si sin bookings |
| `GET/POST /api/room-types` | admin/gerente | |
| `GET /api/bookings` | admin/gerente/agente/viewer | filtros status, siteId, from, to, q + byStatus |
| `POST /api/bookings` | admin/gerente/agente | Crea con valida overlap de habitación en rango fechas, genera referencia BK-XXXXXX |
| `GET/PATCH/DELETE /api/bookings/[id]` | admin/gerente/agente | Transición de estado vía PATCH `{status}`. DELETE bloqueado si tiene payments |
| `GET /api/payments` | admin/gerente | filtros status, method, guestId, bookingId, siteId, from, to, q + summary (paidCents/pendingCents/refundedCents/statusCounts) |
| `POST /api/payments` | admin/gerente/agente | Genera referencia PAY-XXXXXX. Si status=paid+bookingId → suma a Booking.paidAmountCents |
| `GET/PATCH/DELETE /api/payments/[id]` | admin/gerente (DELETE solo admin, bloqueado si paid/refunded) | Detalle incluye events del audit log per-payment |
| `POST /api/payments/[id]/transition` | admin/gerente | Body: `{action, refundAmountCents?, reason?}`. Acciones: approve/reject/refund/cancel/review. Aplica state machine + actualiza paidAmountCents en booking vinculado |
| `GET /api/audit` | admin/gerente | Audit log global con filtros entityType, entityId, userId, from, to |
| `GET /api/hotel-kpis` | admin/gerente/agente/viewer | Dashboard KPIs: arrivalsToday, departuresToday, currentlyStaying, occupancyPct, monthRevenueCents, pendingPaymentsCents, overduePayments (+7d), unreadConversations, recent bookings/payments. Cache 10s SWR. |

**Cache layer:** todas las GET de listas usan header `Cache-Control: private, max-age=5, stale-while-revalidate=30` (3s para guests).

**Perf optimizations (jun 18-19 2026):**
- `src/lib/auth.ts` → cache memoria del dev user (`devUserSynced` flag) + TTL cache 5min para JWT users
- `src/lib/workspace.ts` → `Map<userId, workspace>` cache memoria + `invalidateWorkspaceCache(userId?)`

---

## 6. LLM / IA

**Server-only** (`src/lib/llm-providers.ts`):
- `Provider = 'openai' | 'anthropic' | 'google' | 'deepseek'`
- `getLLM(userId, provider, modelId)` — **nunca importar en client components**
- `SUPPORTED_MODELS`: openai (gpt-4o, gpt-4o-mini), anthropic (claude-sonnet-4-5, claude-opus-4-7), google (gemini-2.5-pro, gemini-2.5-flash), deepseek (deepseek-chat, deepseek-reasoner)

**Cliente** (patrón local para evitar importar server-only):
```ts
const LLM_PROVIDERS = [
  { provider: 'openai', label: 'GPT-4', models: [{ id: 'gpt-4o', label: 'GPT-4o' }, { id: 'gpt-4o-mini', label: 'GPT-4o mini' }] },
  { provider: 'anthropic', label: 'Claude', models: [{ id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5' }, { id: 'claude-opus-4-7', label: 'Claude Opus 4.7' }] },
  { provider: 'google', label: 'Gemini', models: [{ id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' }, { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' }] },
  { provider: 'deepseek', label: 'DeepSeek', models: [{ id: 'deepseek-chat', label: 'DeepSeek Chat' }, { id: 'deepseek-reasoner', label: 'DeepSeek Reasoner' }] },
];
```

**Streaming IA** (routes de API):
```ts
import { streamText, convertToCoreMessages } from 'ai';
const result = streamText({ model, system, messages: convertToCoreMessages(msgs) });
return result.toDataStreamResponse({ getErrorMessage: (e) => String(e) });
```

**Streaming IA** (cliente):
```ts
import { useChat } from 'ai/react';
const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages, error } = useChat({ api: '/api/...' });
```

---

## 7. Convenciones de UI

### Paleta CSS (variables en globals.css)
```
--rai-black: #0A0A0F   (fondo general)
--rai-dark:  #12121A   (sidebar, paneles)
--rai-card:  #1A1A2E   (tarjetas, inputs)
--rai-border:#2A2A4A   (bordes)
--rai-gold:  #C9A84C   (color de marca)
--rai-gold-br:#E8B923  (acento/hover)
--rai-text:  #F5F5F5   (texto principal)
--rai-muted: #8888AA   (texto secundario)
--rai-success:#2EC4B6  (positivo)
--rai-error: #E63946   (error)
--rai-warning:#FF9F1C  (advertencia)
--rai-purple:#7B5EA7   (IA/proceso)
```

### Clases CSS disponibles (globals.css)
```
Layout:     .container, .row, .row-between, .grid, .grid-2, .grid-3, .grid-4, .grid-auto
Cards:      .card, .card-header, .panel
Tabla:      .table, .table th, .table td
Badges:     .badge-success, .badge-error, .badge-warning, .badge-gold, .badge-purple, .badge-muted
Botones:    .primary, .secondary, .ghost, .danger, .btn-sm, .btn-icon
Texto:      .h1, .h2, .h3, .label, .muted, .gradient-text
Modales:    .modal-backdrop, .modal
Chat:       .chat-log, .chat-bubble.user, .chat-bubble.assistant, .chat-input-row
Forms:      .form-group, .input (en input/select/textarea)
Utils:      .animate-spin, .mt-4, .mb-2, .mb-4, .mb-6, .w-full, .mb-0
```

### Patrón de tabs
```ts
const TOP_TABS = [
  { id: 'tab1', label: 'Label 1', icon: Icon1 },
  { id: 'tab2', label: 'Label 2', icon: Icon2 },
] as const;
type TopTab = (typeof TOP_TABS)[number]['id'];
// Active state: borderBottom + color rai-gold
```

---

## 8. Infraestructura / cloud

| Servicio | URL / detalle |
|---|---|
| DB prod | Supabase PostgreSQL (ver .env.local — DIRECT_URL + DATABASE_URL) |
| Deploy | Vercel (producción) + Render (fallback, `render.yaml`) |
| n8n | raiagency.app.n8n.cloud |
| n8n webhook URL | `https://raiagency.app.n8n.cloud/webhook/34fa180d-cb17-4d1e-9be8-c5ded295427f` |
| n8n MCP server | `https://raiagency.app.n8n.cloud/mcp-server/http` (NO usar para webhooks) |
| Bot Telegram | @Raiagencynet_Bot, chat_id real del usuario: `1104381351` |

---

## 9. Bugs de entorno conocidos (permanentes)

**B1 — Prisma en sandbox Linux:**
El mount de Windows no permite `unlink`/`rm`/`mv` dentro de `content-engine-mvp/` (EPERM). `prisma generate` y `prisma migrate dev` fallan porque necesitan borrar archivos.
**Solución**: el usuario corre `npx prisma generate` y `npx prisma migrate deploy` en Windows PowerShell directamente. Nunca desde el sandbox.

**B2 — Procesos persistentes en sandbox:**
El sandbox mata todos los procesos hijo al terminar cada llamada bash (`--die-with-parent`). No se puede dejar `npm run dev` corriendo entre llamadas. Para probar lógica API/DB: usar script Node directo contra `@prisma/client`.

**B3 — Write/Edit truncan archivos grandes:**
Archivos >~4500 bytes a veces se truncan. Workaround: escribir en bloques con Python append, verificar con `wc -c`, reparar con `tr -d '\000'`.

---

## 10. Agentes IA del pipeline de campañas (`src/agents/`)

8 agentes: Orchestrator (DAG), Copy, Visual, Audio, Video, Music, VisionAnalyzer, CompetitorResearcher.
Worker: `src/workers/pipeline-worker.ts`.
DAG: Copy → (Visual ∥ Audio) → Video → Music (opcional).

---

*Actualiza este archivo solo si cambia la arquitectura, el stack, los modelos de datos o las convenciones.*
