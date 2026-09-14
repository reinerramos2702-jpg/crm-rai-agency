# Módulo Automatizaciones — Calendario de Contenido
## Spec técnica para Claude Code

Submódulo dentro de Automatizaciones. El cliente final (dueño, marketing, o recepcionista según el negocio) sube contenido y lo programa día a día en tarjetas tipo slider, visualmente atractivo, con publicación vía Graph API de Meta.

Quién sube contenido: **el cliente final**, sin conocimiento técnico. Implicación de diseño: cada acción necesita feedback claro, estados de error legibles (no mensajes de API crudos), y guía integrada — no es opcional, es P0.

---

## 1. Modelo de datos (Prisma)

```prisma
model ContentPost {
  id            String    @id @default(cuid())
  tenantId      String
  tenant        Tenant    @relation(fields: [tenantId], references: [id])

  status        PostStatus @default(DRAFT)
  platforms     Platform[] // multi-red, feature 11
  mediaType     MediaType  // IMAGE, VIDEO, CAROUSEL
  mediaUrls     String[]   // R2 URLs, orden = orden del carrusel
  caption       String?
  aiGenerated   Boolean    @default(false) // si el caption vino de auto-caption IA

  scheduledAt   DateTime
  publishedAt   DateTime?

  retryCount    Int        @default(0)
  lastError     String?

  approvedBy    String?    // userId, para feature 15 (aprobación dos pasos)
  approvedAt    DateTime?

  sourceBankId  String?    // si vino del banco de contenido (feature 12), referencia al original

  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt

  @@index([tenantId, scheduledAt])
  @@index([tenantId, status])
}

enum PostStatus {
  DRAFT
  SCHEDULED
  PUBLISHING
  PUBLISHED
  ERROR
  BLOCKED       // cayó en fecha bloqueada, feature 13
}

enum MediaType {
  IMAGE
  VIDEO
  CAROUSEL
}

enum Platform {
  INSTAGRAM
  FACEBOOK
}

model ContentBankItem {
  id          String   @id @default(cuid())
  tenantId    String
  mediaType   MediaType
  mediaUrls   String[]
  caption     String?
  createdAt   DateTime @default(now())
}

model BlockedDate {
  id        String   @id @default(cuid())
  tenantId  String
  date      DateTime
  reason    String?
}

model TenantPublishingRules {
  tenantId       String   @id
  maxPostsPerDay Int      @default(3) // feature 14
  brandColors    Json?    // feature 18: { primary, secondary, accent }
}
```

---

## 2. Componentes UI

### `<ContentSlider />` — núcleo (features 01, 02, 03)
- Scroll horizontal por semana, una tarjeta = un día
- Cada tarjeta: thumbnail de media, hora programada, badge de estado por color
  - `SCHEDULED` → cian, `PUBLISHING` → ámbar con animación pulse, `PUBLISHED` → verde, `ERROR` → rojo, `BLOCKED` → gris con ícono de candado
- Drag and drop entre tarjetas usando `@dnd-kit/core` — al soltar, PATCH `scheduledAt` del post
- Botón "+" en días vacíos abre `<PostEditor />`

### `<PostEditor />` — modal/panel de edición de un post
- Zona de subida (drag+drop o click) — acepta imagen, video, o múltiples archivos → auto-detecta `mediaType`
- Preview en vivo estilo feed (feature 04): componente `<FeedPreview />` con marco de teléfono, avatar del tenant, likes/comentarios simulados
- Campo caption, con botón "Generar con IA" (feature 08) → llama endpoint que usa Vercel AI SDK + la imagen subida
- Selector de plataformas (checkbox Instagram / Facebook — feature 11)
- Botón "Duplicar este post" en modo edición (feature 05) → clona a nuevo `ContentPost` en DRAFT
- Botón "Guardar en banco" → crea `ContentBankItem` sin fecha

### `<ContentBank />` (feature 12)
- Grid de piezas guardadas sin fecha
- Cada pieza se puede arrastrar directo a una tarjeta vacía del slider

### `<MonthView />` (feature 16)
- Toggle semana/mes en la cabecera del módulo
- Vista mes: grid tradicional, cada celda = mini-thumbnail + conteo si hay más de un post ese día

### `<StreakIndicator />` (feature 17)
- Contador de días consecutivos con al menos un `PUBLISHED`
- Ubicación: cabecera del módulo, ícono de flama con número

### `<GuidedTour />` (feature 20) + tooltips (feature 19)
- Librería sugerida: `react-joyride` o construir custom con posicionamiento absoluto
- 5 pasos: (1) subir contenido, (2) arrastrar a un día, (3) editar caption/IA, (4) preview, (5) publicar
- Se dispara la primera vez que el tenant entra al módulo — flag `hasSeenTour` en `TenantPublishingRules` o tabla de preferencias de usuario
- Tooltip contextual: cada botón del módulo lleva `<HelpTooltip text="..." example="..." />`, ícono de interrogación pequeño, no invasivo

---

## 3. Endpoints API

```
POST   /api/content-posts                    crear post (DRAFT o SCHEDULED)
PATCH  /api/content-posts/:id                 editar (incluye reprogramar fecha via drag)
DELETE /api/content-posts/:id
POST   /api/content-posts/:id/duplicate       feature 05
POST   /api/content-posts/:id/publish-now     dispara job inmediato
POST   /api/content-posts/bulk-schedule       feature 06: N archivos → distribución automática en próximos N días disponibles

POST   /api/content-posts/:id/generate-caption   feature 08, usa Vercel AI SDK

GET    /api/content-bank
POST   /api/content-bank
POST   /api/content-bank/:id/promote          mueve de banco a slider con fecha

GET    /api/blocked-dates
POST   /api/blocked-dates                     feature 13

GET    /api/publishing-rules
PATCH  /api/publishing-rules                  feature 14, 18

POST   /api/content-posts/:id/approve         feature 15
```

### Job de publicación (BullMQ)
- Queue `publish-content-post`
- Al llegar `scheduledAt`: status → `PUBLISHING` → llama Graph API de Meta con `mediaUrls` + `caption` → éxito: `PUBLISHED` + `publishedAt`; error: incrementa `retryCount`, si `retryCount < 2` reintenta (feature 09), si falla la segunda vez → `ERROR` + notificación al tenant
- Respeta `maxPostsPerDay` (feature 14) antes de encolar
- Verifica `BlockedDate` antes de encolar (feature 13) → si cae en fecha bloqueada, status `BLOCKED`, no se publica

### Graph API — construcción desde cero
- Depende de la decisión de arquitectura Meta pendiente (app única + OAuth por tenant, vs. app por cliente) — **no construir hasta confirmar esto**, cambia el modelo de credenciales
- Flujo esperado: Container API de Instagram (crear media container → publicar) para imagen/video/carrusel
- Manejo de token: refresh antes de expirar (ventana 60 días ya identificada como pendiente en el proyecto general)

---

## 4. Prioridad de construcción sugerida

**P0 — sin esto no hay MVP funcional:**
Slider semanal, drag and drop, estados por color, botón publicar (Graph API), tooltips contextuales

**P1 — completa la experiencia de uso real:**
Preview estilo feed, vista mes, duplicar tarjeta, subida múltiple, banco de contenido, auto-caption IA, bloqueo de fechas, límite de frecuencia, recorrido guiado, reintento inteligente

**P2 — diferenciadores, después de validar con el primer cliente:**
Multi-red simultáneo, sugeridor de mejor hora, cortapega de video, marca por tenant, indicador de racha, aprobación en dos pasos

Las 20 entran al alcance total — este orden es solo secuencia de construcción, no recorte.

---

## 5. Notas de diseño visual
- Paleta y estilo del CRM: dark UI premium (confirmar tokens exactos con el resto del sistema ya construido, no reinventar)
- Slider debe sentirse fluido en móvil — el cliente probablemente lo usa desde el teléfono, no solo desktop
- Estados de error: nunca mostrar el error crudo de la API de Meta. Traducir a lenguaje simple: "No se pudo publicar. Reintentando automáticamente." con opción de ver detalle técnico colapsado para soporte
