# Roadmap — Módulo Automatización (RAI Content Engine)

Spec de implementación. Decisiones ya cerradas con el cliente (Dr. SizeStreet). Esto es la fuente de verdad para las próximas sesiones — cada fase se marca ✅ al certificarse.

---

## 1. Sistema global de botones (jerarquía + "borde reluciente")

4 niveles, glow **estático** (box-shadow fijo, se intensifica en hover), aplicado a TODA la app (no solo Automatización).

### Clases CSS (agregar a `globals.css`)

```css
/* === Sistema de botones RAI — jerarquía + glow === */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
  font-weight: 600; font-size: 0.875rem; line-height: 1.25rem;
  padding: 0.5rem 1rem; border-radius: 8px;
  border: 1px solid transparent; cursor: pointer;
  transition: box-shadow 150ms ease, border-color 150ms ease,
              background-color 150ms ease, transform 100ms ease;
  white-space: nowrap;
}
.btn:active { transform: translateY(1px); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none !important; }
.btn:focus-visible { outline: 2px solid var(--rai-gold); outline-offset: 2px; }

/* Nivel 1 — Primario: acción principal de la pantalla (Crear, Guardar, Activar) */
.btn-primary {
  background: linear-gradient(135deg, #C9A84C 0%, #E8C766 100%);
  color: #1A1A1A;
  border-color: #E8C766;
  box-shadow: 0 0 0 1px rgba(201,168,76,0.35), 0 0 16px rgba(201,168,76,0.45);
}
.btn-primary:hover {
  box-shadow: 0 0 0 1px rgba(232,199,102,0.6), 0 0 22px rgba(232,199,102,0.65);
}

/* Nivel 2 — Secundario: acciones de apoyo (Editar, Filtrar, Exportar) */
.btn-secondary {
  background: rgba(255,255,255,0.04);
  color: #E5E5E5;
  border-color: rgba(255,255,255,0.18);
  box-shadow: 0 0 0 1px rgba(255,255,255,0.06), 0 0 10px rgba(255,255,255,0.08);
}
.btn-secondary:hover {
  border-color: rgba(201,168,76,0.5);
  box-shadow: 0 0 0 1px rgba(201,168,76,0.25), 0 0 14px rgba(201,168,76,0.25);
}

/* Nivel 3 — Ghost/terciario: acciones menores (Cancelar, Ver más, iconos de fila) */
.btn-ghost {
  background: transparent;
  color: #B8B8B8;
  border-color: rgba(201,168,76,0.22);
  box-shadow: 0 0 0 1px rgba(201,168,76,0.08), 0 0 6px rgba(201,168,76,0.10);
}
.btn-ghost:hover {
  color: #E5E5E5;
  border-color: rgba(201,168,76,0.45);
  box-shadow: 0 0 0 1px rgba(201,168,76,0.18), 0 0 10px rgba(201,168,76,0.20);
}

/* Nivel 4 — Peligro: Eliminar, Desactivar, Cancelar cita */
.btn-danger {
  background: rgba(229,72,77,0.08);
  color: #FF6B6F;
  border-color: rgba(229,72,77,0.4);
  box-shadow: 0 0 0 1px rgba(229,72,77,0.25), 0 0 14px rgba(229,72,77,0.30);
}
.btn-danger:hover {
  box-shadow: 0 0 0 1px rgba(229,72,77,0.45), 0 0 18px rgba(229,72,77,0.45);
}

/* Tamaños */
.btn-sm { padding: 0.35rem 0.75rem; font-size: 0.8rem; border-radius: 6px; }
.btn-icon { padding: 0.5rem; aspect-ratio: 1/1; }
```

### Reglas de uso (jerarquía por pantalla)

- **1 solo `.btn-primary` visible por bloque/sección** — el CTA más importante (ej: "Crear flujo", "Guardar configuración", "Reservar"). Si hay dos acciones igual de importantes, ambas pueden ser `.btn-primary` SOLO si están en contextos separados (ej: header vs. modal).
- **`.btn-secondary`** — acciones de apoyo siempre visibles (Filtrar, Exportar, Editar, Configurar, Conectar).
- **`.btn-ghost`** — acciones de fila/lista, iconos, "Cancelar" en modales, links de navegación secundaria.
- **`.btn-danger`** — siempre con confirmación (modal o doble-click), nunca como acción primaria de pantalla.
- Toggles (activo/pausado, on/off) usan badge + `.btn-ghost`/`.btn-secondary` según si la acción resultante es constructiva o destructiva.

### Alcance de aplicación (Tarea #12)

Calendarios, Marketing, Facturación, Conversaciones, Campaign (Nueva Campaña), Launchpad (Guía de inicio), Settings, Dashboard, Keys — auditar cada botón existente y reclasificar según las reglas de arriba.

---

## 2. Roles y permisos (Tarea #13)

4 roles, permisos por módulo:

| Módulo | Admin | Gerente | Agente | Viewer |
|---|---|---|---|---|
| Dashboard | ✅ todo | ✅ todo | ✅ solo su actividad | ✅ ver |
| Conversaciones | ✅ | ✅ todas | ✅ solo asignadas/propias | ✅ ver |
| Calendarios | ✅ | ✅ | ✅ solo sus calendarios/citas | ✅ ver |
| Marketing/Campaign | ✅ | ✅ | ⛔ | ✅ ver |
| Automatización | ✅ crear/editar/activar | ✅ crear/editar/activar | ⛔ (solo ve estado) | ✅ ver estado |
| Facturación | ✅ | ✅ ver, no config | ⛔ | ⛔ |
| Settings/Keys | ✅ | ⛔ | ⛔ | ⛔ |
| Gestión de usuarios/roles | ✅ | ⛔ | ⛔ | ⛔ |

### Modelo de datos

```prisma
model WorkspaceMember {
  id          String   @id @default(cuid())
  workspaceId String
  userId      String?  // null si es invitación pendiente
  email       String   // para invitar antes de que exista el User
  role        String   @default("agente") // 'admin' | 'gerente' | 'agente' | 'viewer'
  status      String   @default("active") // 'invited' | 'active' | 'suspended'
  createdAt   DateTime @default(now())

  workspace Workspace @relation(fields: [workspaceId], references: [id])
  user      User?     @relation(fields: [userId], references: [id])

  @@unique([workspaceId, email])
  @@index([workspaceId])
}
```

`getAuth` ya resuelve `AuthContext{userId,email}`. Se agrega `getMembership(workspaceId, userId)` en `lib/workspace.ts` que devuelve el `role`. El owner del workspace (`ownerId`) siempre es `admin` implícito (no necesita fila en `WorkspaceMember`).

UI nueva: `Settings → Equipo` — tabla de miembros, invitar por email (sin envío real de correo en v1: genera link de activación reutilizando `ActivationLink`), cambiar rol, suspender.

Middleware: helper `requireRole(req, ['admin','gerente'])` usado en rutas API sensibles (`/api/automations/*` write, `/api/settings`, `/api/team/*`).

---

## 3. Modelo de datos — Workflow (Tarea #9)

JSON flexible, igual filosofía que `availability` en Calendarios.

```prisma
model Workflow {
  id          String   @id @default(cuid())
  workspaceId String
  folderId    String?
  name        String
  description String?
  status      String   @default("draft") // 'draft' | 'active' | 'paused'
  // { type: 'contact.created' | 'contact.tag_added' | 'appointment.created' |
  //   'appointment.status_changed' | 'appointment.upcoming' | 'appointment.completed' |
  //   'contact.inactive' | 'conversation.sla_overdue' | 'conversation.no_response' |
  //   'schedule.recurring', config: {...} }
  trigger     Json
  // [{ id, type: 'condition'|'delay'|'action', config: {...} }]
  steps       Json     @default("[]")
  runsCount   Int      @default(0)
  lastRunAt   DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  workspace Workspace      @relation(fields: [workspaceId], references: [id])
  folder    WorkflowFolder? @relation(fields: [folderId], references: [id])
  runs      WorkflowRun[]

  @@index([workspaceId])
  @@index([status])
}

model WorkflowFolder {
  id          String   @id @default(cuid())
  workspaceId String
  name        String
  createdAt   DateTime @default(now())

  workspace Workspace  @relation(fields: [workspaceId], references: [id])
  workflows Workflow[]

  @@index([workspaceId])
}

model WorkflowRun {
  id         String   @id @default(cuid())
  workflowId String
  contactId  String?
  status     String   // 'success' | 'error' | 'skipped'
  trigger    Json     // snapshot del evento que disparó
  result     Json?    // resumen de acciones ejecutadas
  error      String?
  createdAt  DateTime @default(now())

  workflow Workflow @relation(fields: [workflowId], references: [id])

  @@index([workflowId])
  @@index([contactId])
}
```

`Settings` se extiende con:
```prisma
  automationsEnabled       Boolean @default(true)
  automationNotifyEmail    String? // a dónde mandar notificaciones internas (gerente)
  aiBuilderProvider        String? // 'anthropic' | null (placeholder si no hay key)
```

---

## 4. Motor de ejecución (Tarea #10)

Dos vías:

1. **Eventos síncronos** — al crear/actualizar `Contact`, `Appointment`, `Conversation`, las rutas API existentes llaman `runWorkflowsForEvent(workspaceId, 'contact.created', {contact})` (helper nuevo en `src/lib/automations/engine.ts`). Busca `Workflow` activos con `trigger.type` igual, evalúa condiciones, ejecuta acciones, guarda `WorkflowRun`.

2. **Eventos por cron** (`appointment.upcoming`, `appointment.completed`, `contact.inactive`, `conversation.sla_overdue`, `schedule.recurring`, delays pendientes) — endpoint `GET /api/automations/run-due`, protegido con header `Authorization: Bearer ${CRON_SECRET}`. Recorre workflows activos de ese tipo, consulta la condición temporal contra la DB, ejecuta y loggea.

```json
// vercel.json
{
  "crons": [{ "path": "/api/automations/run-due", "schedule": "*/30 * * * *" }]
}
```

> ⚠️ Nota honesta: Vercel **Hobby** limita crons a 1 ejecución/día. Para `*/30 * * * *` (cada 30 min) se necesita plan **Pro**, o un cron externo gratuito (cron-job.org) que llame el endpoint cada 30 min con el `CRON_SECRET`. Documentar ambas opciones en Settings → Automatización.

### Acciones disponibles (todas reales, sin mocks)

- `add_tag` / `remove_tag` → `Contact.tags`
- `create_task` → `ContactTask` (con `dueAt` opcional, para delays multi-día)
- `create_note` → `Note`
- `update_appointment_status` → `Appointment.status`
- `send_webhook` → POST a `Settings.n8nWebhookUrl` con payload `{event, contact, appointment, workflowId}` — desde ahí el usuario conecta WhatsApp/SMS/Email vía n8n (placeholder funcional, ya existe el campo).
- `delay` (paso especial) → crea/actualiza un `WorkflowRun` "pendiente" con `nextRunAt`, lo retoma el cron.

---

## 5. Los 15 casos (5 mayoreo / 5 retail / 5 servicios)

Todos usan modelos/campos que YA existen (`Contact.tags`, `ContactTask`, `Note`, `Conversation`, `Appointment`, `Settings`). Cero datos falsos.

### Servicios / Citas (aprovecha Calendarios + Conversaciones, 100% conectable ya)

1. **Recordatorio 24h antes** — Trigger cron: `Appointment.startTime` en ventana 23-25h, `status='confirmed'`. Acción: `send_webhook` (recordatorio) + `create_note`.
2. **Confirmación al reservar** — Trigger: `appointment.created` (desde `/book/[slug]`). Acción: `send_webhook` confirmación + `add_tag('cliente_calendario')`.
3. **Detección de no-show** — Trigger cron: `startTime < now`, `status='confirmed'`. Acción: `update_appointment_status('no_show')` + `create_task('Reagendar cita')` + `add_tag('no_show')`.
4. **Seguimiento post-cita** — Trigger cron: `status='completed'`, `endTime` hace 24-48h, sin tag `post_cita_enviado`. Acción: `send_webhook` encuesta + `add_tag('post_cita_enviado')`.
5. **Reactivación cliente de servicios inactivo** — Trigger cron: `Contact` con `appointments` previos, sin `Appointment`/`Conversation` en N días (config). Acción: `add_tag('reactivar_servicio')` + `create_task('Reenganchar cliente')` + `send_webhook`.

### Retail

6. **Bienvenida nuevo lead** — Trigger: `contact.created`. Acción: `send_webhook` bienvenida + `add_tag('nuevo_lead')` + `create_task('Primer contacto', dueAt: +1h)`.
7. **SLA de respuesta vencido** — Trigger cron: `Conversation.status='open'`, último mensaje del contacto sin respuesta en `Settings.slaOverdueMins`. Acción: `add_tag('sla_vencido')` + `send_webhook` (alerta interna) + `create_task` urgente.
8. **Reenganche de conversación fría** — Trigger cron: `Conversation.lastMessageAt` > N días, `status='open'`. Acción: `send_webhook` seguimiento + `add_tag('seguimiento_enviado')`.
9. **Agradecimiento + cross-sell tras compra** — Trigger: `contact.tag_added = 'compra_confirmada'` (tag manual del agente al cerrar venta). Acción: `send_webhook` agradecimiento → `delay 3 días` → `send_webhook` cross-sell + `add_tag('cross_sell_enviado')`.
10. **Cliente VIP por recompra** — Trigger cron: `Contact` con ≥3 `WorkflowRun` exitosos del caso #9. Acción: `add_tag('vip')` + `create_task('Llamar — programa VIP')`.

### Mayoreo

11. **Recordatorio de reposición** — Trigger cron: `ContactTask` tipo "próxima reorden" con `dueAt` ≤ 2 días, `tags` incluye `pedido_registrado`. Acción: `send_webhook` recordatorio + `add_tag('recordatorio_enviado')`.
12. **Pedido grande → validación gerente** — Trigger: `contact.tag_added = 'pedido_grande'`. Acción: `send_webhook` (alerta a `Settings.automationNotifyEmail`) + `create_task('Validar pedido grande')` (visible para rol Gerente).
13. **Cliente mayorista en riesgo** — Trigger cron: `Contact` con tag `cliente_mayorista`, sin actividad/`pedido_registrado` nuevo en N días. Acción: `add_tag('riesgo_abandono')` + `create_task('Reenganchar mayorista')` + `send_webhook` con catálogo.
14. **Actualización de estado de pedido** — Trigger: `contact.tag_added` ∈ `['pedido_preparando','pedido_enviado','pedido_entregado']`. Acción: `send_webhook` con plantilla según el tag + `create_note`.
15. **Onboarding cliente mayorista** — Trigger: `contact.tag_added = 'cliente_mayorista'`. Acción: `send_webhook` día 0 (catálogo) → `delay 2 días` → `send_webhook` onboarding → `delay 3 días` → `create_task('Llamada de seguimiento')`.

> Config por workflow: cada "N días" arriba es un campo numérico configurable en el builder (no hardcode).

---

## 6. UI `/automatizacion` (Tarea #11)

- **Lista de flujos**: folders (estilo ClickApps) + tabla de workflows (nombre, trigger, status toggle, runs, última ejecución, acciones `.btn-ghost`).
- **Builder secuencial** (no canvas): Trigger arriba (selector + config) → lista vertical de pasos (condición/delay/acción), cada uno con `+` para agregar paso siguiente. Botón `.btn-primary` "Activar flujo".
- **Plantillas**: al crear, modal con los 15 casos agrupados por nicho — clonan trigger+steps preconfigurados, el usuario ajusta nombres/N días.
- **Configuración global** (`/automatizacion/configuracion`): Notificaciones (email destino), Auto-guardado (on/off, ya patrón estándar), Pausar todos los flujos (kill switch), AI Builder (si hay key Anthropic en `/keys` → input de texto libre que genera trigger+steps via prompt estructurado; si no hay key → estado "Conectar API key" con link a `/keys`).
- **Vista de ejecuciones**: tab "Actividad" — tabla de `WorkflowRun` recientes con status badge.

---

## 7. Conexión con Campaign / Dashboard / Launchpad (Tarea #14)

- **Nueva Campaña**: al pasar a `status='ready'`/enviar, dispara evento `campaign.sent` → puede activar workflows (ej: tag a contactos del segmento). Botones reclasificados.
- **Dashboard**: nuevo widget "Automatización" — flujos activos, ejecuciones últimas 24h, errores recientes (link a `/automatizacion?tab=actividad`).
- **Launchpad/Guía de inicio**: nuevo paso "Activa tu primera automatización" con CTA `.btn-primary` a `/automatizacion?template=...`.
- Pulido UX general de las 3 pantallas (spacing/copy) sin romper funcionalidad existente.

---

## 8. Orden de implementación

1. Sistema de botones (CSS global) — bajo riesgo, base visual para todo lo demás.
2. Migración Prisma: `Workflow`, `WorkflowFolder`, `WorkflowRun`, `WorkspaceMember`, campos nuevos en `Settings` (workaround `/tmp/gen` ya probado).
3. Motor (`lib/automations/engine.ts`) + helper `runWorkflowsForEvent` + endpoint `run-due`.
4. Conectar triggers síncronos en rutas existentes (`contacts`, `appointments`, `conversations`).
5. UI `/automatizacion` (lista, builder, plantillas de los 15 casos, config global).
6. Roles: `WorkspaceMember`, `requireRole`, UI Settings → Equipo, aplicar restricciones por módulo.
7. Aplicar sistema de botones a todos los módulos existentes.
8. Conectar Campaign/Dashboard/Launchpad.
9. Certificación: `tsc --noEmit` + script e2e Node corriendo los 15 casos contra la DB real + capturas Chrome.
10. Actualizar `PROJECT_MEMORY.md`.

---

## 9. Decisiones cerradas (referencia rápida)

- Botones: 4 niveles, dorado/gris/ghost/rojo, glow estático, aplicado a toda la app.
- Roles: Admin / Gerente / Agente / Viewer, full implementación.
- Modelo Workflow: JSON flexible.
- Motor: Vercel Cron (con nota sobre límite Hobby) + eventos síncronos.
- Builder: lista secuencial (no canvas).
- AI Builder: conectado a Anthropic vía `/keys` si hay API key, si no placeholder.
- Casos: 5 mayoreo / 5 retail / 5 servicios, todos sobre datos reales.
- Certificación: tsc + e2e Node + capturas Chrome.
- Alcance extra: Campaign + Dashboard + Launchpad reciben botones nuevos, integración con Automatización, y mejoras UX.
