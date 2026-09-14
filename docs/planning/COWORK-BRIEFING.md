# RAI Agency CRM — Briefing de arranque para Cowork

Pega este documento completo como primer mensaje al abrir la carpeta del proyecto en Claude Cowork.

## Quién soy y qué es esto
Full-Stack Dev + AI Architect, Venezuela. Este es el CRM que vendo bajo RAI Agency — software de gestión para negocios (pequeños, emprendimientos, y negocios grandes que facturan $1,000+/día) para centralizar operación y ayudarlos a escalar. Precio: $937.47 fijo, incluye capacitación de 2-3 meses + soporte 1 año.

## Flujo de trabajo desde ahora
1. **Chat externo (Claude.ai)** — planeación y estrategia, no código
2. **Cowork (aquí)** — edición de archivos en la carpeta del repo, organización, supervisión de lo que hace Claude Code
3. **Claude Code (terminal)** — recibe prompts ya preparados, ejecuta, construye

Tu rol en Cowork: mantener la carpeta organizada para que Claude Code siempre sepa dónde está cada cosa, ejecutar cambios de archivos directos, y ayudarme a revisar lo que Claude Code produce antes de aceptarlo.

## Repo
- github.com/reinerramos2702-jpg/content-engine-mvp (rama main, 1 colaborador)
- Deploy: Vercel — content-engine-mvp.vercel.app
- Rename pendiente: content-engine-mvp → RAI Agency CRM (repo, deploy, docs, UI)
- El repo ya trae ESTADO.md y CONTEXT.md — léelos primero, son la fuente de verdad más reciente

## Incidente reciente
Terremoto destruyó laptop + disco. Se perdió ~1-2 semanas de desarrollo que corría solo en local sin sync. GitHub y Vercel quedaron con versión vieja de esa semana. Estrategia de recuperación: extraer estructura de chats viejos de Cowork (otra cuenta) vía prompt de extracción, no recuperar código directo.

## Arquitectura — decisiones cerradas
- **Multi-tenant**: un solo deploy sirve a todos los clientes. tenantId en schema + queries + auth
- **Stack**: Next.js 14 App Router + TypeScript + Prisma + Postgres (Supabase) + BullMQ + Upstash Redis + Cloudflare R2 + Vercel AI SDK
- **Meta/Instagram — ABIERTO, sin confirmar**: decisión inicial fue app de Meta por cliente. Problema: Business Verification + App Review por cada venta = semanas de fricción. Alternativa sugerida: app RAI única + OAuth dinámico por tenant, credenciales cifradas. Necesito decidir esto antes de tocar auth de Meta.

## Orden de trabajo — no saltar fases
**Fase 1 — Estabilización (actual, ninguna otra fase arranca hasta cerrar esto):**
1. Leer ESTADO.md + CONTEXT.md reales del repo
2. `git log --oneline -20` — ver historial real
3. `gh run list` + `gh run view --log-failed` — diagnosticar build roto en main
4. `gh pr list` — resolver PR/sesión de agente con ediciones sin aceptar
5. Verificar que corre local (`npm install`, `.env.local`, `npm run dev`)
6. Rama `fase-1/estabilizacion`

**Después, en orden secuencial:**
2. Convertir a multi-tenant (estructural, va antes del pulido)
3. Credenciales Meta por tenant (depende de la decisión abierta arriba)
4. Pulido / animación / interactividad de módulos ya construidos
5. Sistema de guía integrado en botones (reutilizable, no botón por botón)

## Estado actual del CRM (construido pero incompleto)
- Instagram: publicación inmediata + programada, tab Actividad, reglas de keywords en comentarios
- Pendiente: App Review de Meta (instagram_manage_messages, instagram_manage_comments, instagram_content_publish)
- Próximo, ya definido en CONTEXT.md del repo: subida de imágenes a R2 desde UI, aviso de vencimiento de token 60 días, insights de posts, cargar semana 1 de calendario + 8 reglas de keywords

## Proyectos ya fusionados dentro de este CRM
- AutoViral (SaaS edición de video automatizada) → submódulo
- RAI Lead Machine (extracción de leads B2B) → submódulo

## Nueva funcionalidad en curso — Módulo Automatizaciones / Calendario de Contenido
Ver documento adjunto `AUTOMATIZACIONES-MODULO-CALENDARIO.md` para spec técnica completa de las 20 funcionalidades aprobadas. Resumen: dentro de Automatizaciones, un submódulo donde el cliente sube contenido y lo programa día a día en tarjetas tipo slider, con botón de publicar vía Graph API (a construir desde cero). El cliente final es quien sube el contenido — por eso la guía integrada (tooltips + recorrido primera vez) es P0, no opcional.

## Panel de control
Ver `panel-control.html` en esta misma carpeta — checklist visual maestro de todo el proyecto. Pídeme que lo actualice cada vez que cerremos un bloqueador o avancemos una fase.

## Bloqueadores que necesito resolver aquí, en esta sesión de Cowork
- [ ] Leer ESTADO.md + CONTEXT.md reales
- [ ] Diagnóstico del build roto
- [ ] PR sin resolver del agente anterior
- [ ] Confirmar estrategia Meta (app única vs por cliente)
- [ ] Correr barrido de extracción en chats viejos de Cowork y consolidar
