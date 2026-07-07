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

### Sesión 2026-07-07 (en curso — ver secciones 2 y 3)

---

## 2. 🚧 A MEDIAS (exactamente dónde quedó)

- (se actualiza con cada commit)

---

## 3. ⏳ FALTA POR HACER (en orden)

1. **Módulo Instagram — motor backend** (Prisma + lib Graph API + API routes + cron + webhook DM). ← EN CONSTRUCCIÓN AHORA
2. **Módulo Instagram — UI** `/instagram` (cola, nueva publicación, palabras clave, actividad, cuenta).
3. **Stories automáticas** (integradas al mismo motor, type `story`).
4. **Planes de contenido** en `plan/` (calendario editorial 30 días, estrategia captación, mapa guías↔keywords).
5. Activación por el usuario (variables de entorno + tablas DB + n8n scheduler) — ver §5.
6. Pendientes heredados del CRM (no bloquean Instagram): ver `CONTEXT.md` §3 backlog (P1–P6).

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
| (1) | ESTADO.md inicial — consolidación verificada |
