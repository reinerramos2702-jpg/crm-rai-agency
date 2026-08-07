# ESTADO.md — Handoff vivo del proyecto (leer PRIMERO al retomar)

> Actualizado con cada commit. Última actualización: **2026-07-07 (sesión Fable 5 — automatización Instagram)**
> Rama de trabajo: `claude/rai-instagram-crm-automation-ykkwg2` (partió igual a `main`)

---

## 1. ✅ TERMINADO Y FUNCIONANDO

### CRM base (consolidado en GitHub — verificado 2026-07-07)
- El repo `reinerramos2702-jpg/content-engine-mvp` contiene la última versión completa del CRM:
  38 modelos Prisma, 6 migraciones SQL, ~39 grupos de API routes, todos los módulos descritos en `MEMORY.md` §4.
- `main` y la rama de trabajo estaban en el mismo commit (`4d60003`) al iniciar. Nada perdido.
- Deploy: Vercel con `buildCommand: npx prisma generate && npm run build` (vercel.json) → los cambios de schema se regeneran solos al deployar.

### Módulo Instagram COMPLETO (sesión 2026-07-07) — código terminado, `tsc` limpio, pendiente activación del usuario

**Publicación automática (posts, carruseles, reels, stories):**
- Modelos Prisma: `SocialAccount`, `SocialPost`, `KeywordRule`, `SocialActionLog` (final de `prisma/schema.prisma`)
- Migración idempotente: `prisma/migrations/20260707000000_add_instagram_module/migration.sql`
- Motor Graph API: `src/lib/instagram.ts` (containers, carrusel 2-10, reels con polling FINISHED, stories, permalink, reintentos MAX 3, lock optimista anti doble-publicación)
- API: `GET/POST /api/instagram/posts`, `GET/PATCH/DELETE /api/instagram/posts/[id]`, `POST /api/instagram/posts/[id]/publish` (publicar ya)
- Scheduler: `GET/POST /api/cron/instagram?secret=CRON_SECRET` (procesa 5 posts vencidos por tick) + cron Vercel diario de respaldo (11:00 UTC) en `vercel.json`. Scheduler real: n8n cada 5 min (guía §6 de `docs/INSTAGRAM_SETUP.md`)
- Cuenta: `GET/POST/DELETE /api/instagram/account` — token cifrado AES-256-GCM en DB (reusa `src/lib/crypto.ts`) con fallback a env vars; valida contra Graph API antes de guardar

**DM por palabra clave en comentarios (construido, interruptor listo, pendiente de Meta App Review):**
- Webhook: `GET/POST /api/webhooks/instagram` (verify hub.challenge + firma X-Hub-Signature-256 + procesa campo `comments`)
- Motor keywords: match con borde de palabra unicode (9/9 tests OK), dedupe por igCommentId, anti-loop (ignora comentarios propios), reply público aleatorio + DM privado (private reply `/{page-id}/messages` con `recipient={comment_id}`), contador de disparos por regla
- API reglas: `GET/POST /api/instagram/keywords`, `PATCH/DELETE /api/instagram/keywords/[id]`
- Log de todo: `GET /api/instagram/logs` (tabla `SocialActionLog`)

**UI `/instagram`** (`src/app/instagram/page.tsx`): 5 tabs — Publicaciones (cola + filtros + publicar ya/reprogramar/eliminar) / Nueva publicación (4 tipos, preview, borrador-programar-publicar) / Palabras clave (cards + modal + toggle on-off + badge "pendiente de Meta") / Actividad (últimas 100 acciones) / Cuenta (estado + conectar + botón "Crear tablas" para setup DB sin PC). Sidebar entry + `MODULE_ACCESS` actualizados.

**Setup DB sin computadora:** `GET/POST /api/admin/setup-instagram?secret=CRON_SECRET` — crea las 4 tablas (SQL idempotente espejo de la migración). También ejecutable desde la UI (tab Cuenta).

**Fixes de deuda técnica:** los 5 errores TypeScript pre-existentes del repo (`payments/[id]/transition` meta Json + `workspace/brand-doc` × 4 por el cache tipado estrecho) — `npx tsc --noEmit` ahora sale **exit 0**.

**Guía de activación móvil:** `docs/INSTAGRAM_SETUP.md` — 9 pasos pantalla-por-pantalla desde el teléfono (Meta Developers, tokens, Vercel, tablas, n8n, webhook, App Review, prueba E2E) + tabla de errores comunes.

---

## 2. 🚧 A MEDIAS (exactamente dónde quedó)

- Nada a medias en el código. Lo único no-código pendiente es la **activación** (acciones del usuario, §5) y el **App Review de Meta** para DMs (§5 punto 5).

---

## 3. ⏳ FALTA POR HACER (en orden)

1. **Usuario:** activar siguiendo `docs/INSTAGRAM_SETUP.md` (30-45 min desde el teléfono).
2. **Usuario:** enviar App Review de Meta (paso 8 de la guía) para que los DMs funcionen con el público.
3. ~~Los 3 archivos de `plan/`~~ ✅ HECHO (commit 3): `plan/calendario-editorial.md` (30 días), `plan/estrategia-captacion.md` (funnel completo + guiones de DM + oferta 3 niveles + métricas), `plan/guias-mapa.md` (8 guías ↔ keywords).
4. (Mejora futura) Subida de imágenes directa a R2 desde la UI en vez de pegar URLs (`src/lib/r2.ts` ya existe).
5. (Mejora futura) Renovación automática del token de 60 días + aviso de vencimiento en Dashboard.
6. (Mejora futura) Insights de posts publicados (`GET /{ig-media-id}/insights`) en tab Actividad.
7. Pendientes heredados del CRM (no bloquean Instagram): ver `CONTEXT.md` §3 backlog (P1–P6).

---

## 4. 🔑 VARIABLES DE ENTORNO QUE NECESITA EL SISTEMA

Nombres exactos (valores los pone el usuario en Vercel → Settings → Environment Variables):

| Variable | Para qué | ¿Nueva? |
|---|---|---|
| `DATABASE_URL` | Postgres Supabase (pooler 6543) | ya existía |
| `DIRECT_URL` | Postgres Supabase (directo 5432) | ya existía |
| `JWT_SECRET` | auth | ya existía |
| `KEYS_ENCRYPTION_KEY` | cifrado AES-256-GCM (BYOK **y** token de Instagram guardado desde la UI) | ya existía |
| `DEV_BYPASS_AUTH` | `false` en producción | ya existía |
| `INSTAGRAM_ACCESS_TOKEN` | Token largo (60 días) de la Página FB vinculada al IG profesional. Fallback si no se conecta por UI | **NUEVA** |
| `INSTAGRAM_BUSINESS_ID` | ID de la cuenta Instagram Business (17841...) | **NUEVA** |
| `FACEBOOK_PAGE_ID` | ID de la Página de Facebook vinculada (para DMs privados) | **NUEVA** |
| `META_APP_SECRET` | App Secret de la app de Meta (valida firma de webhooks) | **NUEVA** |
| `META_WEBHOOK_VERIFY_TOKEN` | String inventado por el usuario, el mismo se pega en Meta Developer al configurar el webhook | **NUEVA** |
| `CRON_SECRET` | String inventado; protege `/api/cron/instagram` y `/api/admin/setup-instagram` | **NUEVA** |

---

## 5. 🚀 ACTIVACIÓN (pasos del usuario, todos desde el teléfono)

Ver guía completa paso a paso en `docs/INSTAGRAM_SETUP.md` (se crea en esta sesión).
Resumen del orden:
1. Poner las 6 variables NUEVAS en Vercel y redeployar.
2. Abrir `https://<app>.vercel.app/api/admin/setup-instagram?secret=<CRON_SECRET>` (POST vía el botón en `/instagram` tab Cuenta, o con cualquier cliente HTTP) → crea las tablas en Supabase sin necesitar PC.
3. Conectar cuenta en `/instagram` → tab Cuenta (pegar token) o dejar solo las env vars.
4. Crear workflow en n8n (raiagency.app.n8n.cloud): Schedule cada 5 min → HTTP GET `https://<app>.vercel.app/api/cron/instagram?secret=<CRON_SECRET>`. (Vercel Hobby solo permite cron 1×/día — n8n es el scheduler real; el cron de Vercel queda de respaldo diario.)
5. DMs por keyword: requiere Meta App Review (`instagram_manage_messages`). El código queda listo con interruptor por regla (`enabled`). Mientras Meta aprueba: los replies públicos a comentarios sí funcionan en cuanto haya token con `instagram_manage_comments`.

---

## 6. 🧭 INSTRUCCIONES PARA EL PRÓXIMO MODELO (Opus/Sonnet)

1. Lee `CLAUDE.md` (reglas), `MEMORY.md` (arquitectura), `CONTEXT.md` (historial), y este archivo (estado actual).
2. La sesión 2026-07-07 construyó el módulo Instagram: schema en `prisma/schema.prisma` (modelos `SocialAccount`, `SocialPost`, `KeywordRule`, `SocialActionLog`), lib en `src/lib/instagram.ts`, APIs en `src/app/api/instagram/*`, webhook en `src/app/api/webhooks/instagram`, cron en `src/app/api/cron/instagram`, setup DB en `src/app/api/admin/setup-instagram`, UI en `src/app/instagram/page.tsx`.
3. Convenciones no negociables: CSS de `globals.css` (nada de component library), `lucide-react`, `react-hot-toast`, `runtime='nodejs'`, `requireRole`→`isRoleContext`, params `Promise<{id}>` con `await params`.
4. El usuario NO tiene computadora — solo teléfono. Nada de pedirle correr comandos locales: migraciones vía `/api/admin/setup-instagram` (SQL idempotente) o Supabase SQL Editor móvil.
5. Verificación: `npx tsc --noEmit` debe salir limpio antes de cerrar sesión.
6. Actualiza este archivo con cada commit. No crees archivos de handoff nuevos.

---

## 7. 📓 Registro de commits de esta sesión

| Commit | Contenido |
|---|---|
| `d59234f` | ESTADO.md inicial — consolidación del repo verificada (P1) |
| `84eca78` | Módulo Instagram completo: 4 modelos Prisma + migración idempotente + `src/lib/instagram.ts` + 8 grupos de API + webhook + cron + setup DB + UI 5 tabs + Sidebar/ACL + `docs/INSTAGRAM_SETUP.md` + fixes tsc pre-existentes (P2+P3+P4) |
| `a763f90` | `plan/`: calendario editorial 30 días + estrategia de captación + mapa 8 guías↔keywords (P5) |
| (4) | Cierre: MEMORY.md §4/§5 + CONTEXT.md (sesión + SIGUIENTE PASO) + este archivo |
| (5) | `plan/copys/dia-29-carrusel-diagnostico.md` — caption listo para publicar del carrusel día 29 (mini-guía auto-auditoría, keyword EMBUDO, 2150 caracteres exactos) |

**Verificación final:** `npx tsc --noEmit` → exit 0 · `npm run build` → exit 0 · matcher keywords 9/9 tests OK · push a `origin/claude/rai-instagram-crm-automation-ykkwg2` ✅
