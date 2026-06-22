# RAI Content Engine — MVP

Submódulo de Pipeline de Automatización de Contenido para el CRM de RAI Agency.

**Stack**: Next.js 14 (App Router) · Postgres + Prisma · BullMQ + Redis (Upstash) · Cloudflare R2 · Vercel AI SDK · SSE.

**Arquitectura**: ver `ARCHITECTURE.md`. Resumen: 3 secuencias UI (chat planificación → orquestador autónomo → observador en vivo) con DAG `Copy → (Visual ∥ Audio) → Video → Music`.

---

## Arranque rápido (5 minutos)

```bash
# 1) Instalar deps
pnpm install   # o npm install

# 2) Configurar env
cp .env.example .env.local
# Editar .env.local con DATABASE_URL, REDIS_URL, R2_*, KEYS_ENCRYPTION_KEY

# Generar KEYS_ENCRYPTION_KEY:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 3) DB
pnpm prisma:generate
pnpm prisma:migrate    # crea las tablas

# 4) Levantar todo (3 terminales)
pnpm dev               # terminal 1 — Next.js en :3000
pnpm worker            # terminal 2 — worker BullMQ
```

Abrir [http://localhost:3000](http://localhost:3000).

En modo dev (`DEV_BYPASS_AUTH=true`) se autocrea un user dummy `dev-user-001`. No necesitas JWT del CRM todavía.

---

## Servicios externos necesarios

| Servicio | Para qué | Link | Gratis? |
|---|---|---|---|
| Postgres | DB principal | [Neon](https://neon.tech) o [Supabase](https://supabase.com) | sí, free tier |
| Upstash Redis | Cola BullMQ + pub/sub SSE | [upstash.com](https://upstash.com) | sí, free tier |
| Cloudflare R2 | Storage de assets (videos pesados) | [dash.cloudflare.com](https://dash.cloudflare.com) | sí, 10GB free + egress gratis |
| OpenAI | imágenes (gpt-image-1) + TTS opcional | platform.openai.com | no, pay-as-you-go |
| Google AI Studio | Veo 3.1, Gemini, Imagen | aistudio.google.com | tier gratis limitado |
| DeepSeek | LLM barato para copy | platform.deepseek.com | barato |
| ElevenLabs | TTS premium (opcional) | elevenlabs.io | tier gratis |
| Suno | música (opcional) | API no oficial | de pago |

---

## Flujo de uso

1. **Configurar BYOK** → `/keys`: cargar al menos OpenAI + Google (Veo necesita Google).
2. **Crear campaña** → `/campaign/new`: nombre + pipeline (UGC/Avatar/Ads/Carrusel).
3. **Secuencia 1 · Chat**: brainstorm con el LLM elegido del selector. Define marca, batch size, ángulos, briefs por pieza.
4. **Finalizar planificación**: extrae Master JSON estructurado. Te lleva al detalle.
5. **Procesar batch**: ves estimación de costo + breakdown. Si > hard cap, te pide confirmación.
6. **Secuencia 3 · Departamentos**: ves cada agente (Copy/Visual/Audio/Video/Music) trabajar en vivo. Assets aparecen mientras se generan.

---

## Estructura

```
src/
├── app/
│   ├── page.tsx                  → Dashboard (lista campañas)
│   ├── keys/page.tsx             → BYOK management
│   ├── campaign/new/page.tsx     → Secuencia 1 (chat)
│   ├── campaign/[id]/page.tsx    → Secuencia 3 (observador + procesar)
│   └── api/
│       ├── chat/route.ts         → streaming multi-LLM
│       ├── finalize/route.ts     → extracción Master JSON
│       ├── process/route.ts      → enqueue batch
│       ├── events/[id]/route.ts  → SSE stream
│       ├── keys/route.ts         → BYOK CRUD
│       ├── campaigns/...         → CRUD campañas
│       └── executions/...        → status execution
├── agents/
│   ├── orchestrator.ts           → DAG runner (corazón del sistema)
│   ├── copy-agent.ts             → guion
│   ├── visual-agent.ts           → imágenes (OpenAI/Imagen)
│   ├── audio-agent.ts            → TTS (ElevenLabs/OpenAI)
│   ├── video-agent.ts            → Veo 3.1
│   └── music-agent.ts            → Suno (opcional)
├── workers/pipeline-worker.ts    → BullMQ consumer
├── lib/
│   ├── db.ts                     → Prisma singleton
│   ├── redis.ts                  → Queue + pub/sub
│   ├── r2.ts                     → Cloudflare R2 client
│   ├── auth.ts                   → JWT SSO + dev bypass
│   ├── crypto.ts                 → AES-256-GCM para BYOK keys
│   ├── llm-providers.ts          → multi-LLM via Vercel AI SDK
│   ├── master-json-schema.ts     → contratos Zod
│   └── cost-estimator.ts         → pre-flight cost
└── prisma/schema.prisma          → DB schema
```

---

## Qué falta para producción (TODO list para Claude Code)

Marcado intencionalmente como MVP. Ajustar en este orden:

1. **VERIFY blocks**: en `video-agent.ts` y `visual-agent.ts` los endpoints de Veo 3.1 e Imagen pueden haber cambiado. Verificar contra docs oficiales.
2. **Brand Analyzer agent**: agente extra que toma URL de e-commerce → analiza marca → puebla `workspace.brandProfile`. Hoy se rellena manual desde el chat.
3. **Composición final**: integrar Remotion o FFmpeg para ensamblar `image+voice+music+subs → final.mp4`. Hoy cada agente devuelve sus assets separados.
4. **Subtítulos**: Whisper API para transcribir voice → burn-in con FFmpeg.
5. **Publicación IG**: endpoint `/api/publish` que tome `kind=final` y use Graph API. Requiere App Review de Meta.
6. **Scheduling**: cron por campaña (la UI "automatizaciones" del demo Morfeo). Usar BullMQ repeat jobs.
7. **Stripe billing**: créditos consumibles + suscripción. Hoy hard cap pero sin cobro.
8. **SSO real**: hoy `DEV_BYPASS_AUTH=true`. Setear `DEV_BYPASS_AUTH=false` y emitir JWT desde el CRM RAI con HS256 + `JWT_SECRET`.
9. **Retry desde paused**: endpoint para reintentar una task pausada después de fixear la causa.
10. **Multi-asset por item**: hoy 1 task = 1 item. Soportar variantes (ej: 5 hooks distintos para mismo item).

---

## Iterando con Claude Code

Cada agente vive en `src/agents/`. Para mejorar un pipeline específico:

```bash
# desde la raíz del proyecto
cd src/agents
# abrir Claude Code apuntando a este dir
```

Pídele a Claude Code:
- "Mejora el prompt del `copy-agent.ts` para que genere hooks tipo Morfeo Magma"
- "Agrega un agente `subtitles-agent.ts` que use Whisper API"
- "Optimiza `visual-agent.ts` para hacer 2 pasadas: primero prompt-engineering, luego generación"

El JSON maestro es inmutable y append-only, así que cambios en un agente no rompen el resto.
