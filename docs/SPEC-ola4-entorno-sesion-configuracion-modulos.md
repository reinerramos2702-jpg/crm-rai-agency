# SPEC — Ola 4: entorno seguro, sesión, Configuración general y módulos restantes

> Estado: **CERRADO** (16 oct 2026) · Rama de trabajo: `rai-feat-dashboard-premium` (solo commits locales).
> Autoridades: panel `docs/planning/panel-control.html` = estado y alcance · esta spec = comportamiento y aceptación · repo (código, tests, git) = implementación. Si el panel y el repo discrepan en implementación, manda el repo y se corrige el panel.
> Dueño del proyecto: **Reiner** (escribir siempre «Reiner»). Nunca escribir el nombre descartado del proyecto anterior («content-…»): el proyecto es CRM RAI Agency / repo `crm-rai-agency`.

## 0. Punto de partida verificado (HEAD `ea4e6e1`)
- Olas 1–3 hechas y verificadas: `tsc` 0, `eslint` 0, `vitest` 737 verdes, `next build` correcto (72 páginas). Módulos ya mejorados: Dashboard, Guía de Inicio, Nueva Campaña, Generador de Imágenes, Pagos, Agentes IA (incluye centro de voz con Retell en modo simulado), Automatización (reestructurada; **sin verificar a ojo**).
- Hallazgos de esta sesión que motivan la Ola 4:
  1. `npm run dev` ejecuta `next dev`, que solo carga `.env.local` (únicamente `VERCEL_OIDC_TOKEN`) y `.env.development` (vacío). **No** carga `.env.staging`: sin `JWT_SECRET` ni `DATABASE_URL`. Staging se arranca con `node --env-file=.env.staging …`.
  2. `next build` y `next start` cargan además `.env.production`, que contiene claves reales de producción (Redis/Upstash, Supabase service role, Instagram, etc.). `--env-file=.env.staging` solo gana en las variables que staging define; las demás **se filtran desde producción**. Riesgo real.
  3. Build y dev comparten la carpeta `.next`: correr `next build` con `next dev` abierto rompió el CSS de localhost.
  4. Sesión: login con «Mantener sesión iniciada» emite cookie `rai_session` httpOnly con `maxAge` 30 días y JWT de 30 días (`src/lib/session-ttl.ts`). Si `JWT_SECRET` falta o cambia entre arranques, `verifyJwt` devuelve `null` y el usuario queda deslogueado sin aviso (con secreto ausente, `encoder.encode(undefined)` produce una clave vacía). No existe ruta `/api/auth/logout`.
  5. El nombre «Rainer» del Dashboard viene de `User.displayName` en la base, no del código; hoy no hay forma de editarlo desde la interfaz.

## 1. Alcance (ejecutar EN ESTE ORDEN; un commit local por slice)

### S0 — Entorno seguro (prioridad 0)
1. `scripts/run-staging.mjs <dev|build|start> [--port N] [--dry-run]` (solo Node, sin dependencias):
   - Lee `.env.staging` con parser propio; exige `JWT_SECRET`, `DATABASE_URL`, `DIRECT_URL`, `KEYS_ENCRYPTION_KEY`; si falta alguna, sale con error claro (solo nombres, nunca valores).
   - Lee **solo los nombres de clave** de `.env.production` y, para cada una que staging no defina, la fija en `''` en el entorno del proceso hijo (así Next no la rellena desde producción).
   - Rechaza arrancar si el host de `DATABASE_URL` de staging coincide con el de `.env.production`.
   - `build` y `start` usan `NEXT_DIST_DIR=.next-prod` (carpeta distinta de la de `dev`); `next.config.mjs` lee `distDir: process.env.NEXT_DIST_DIR || '.next'`; añadir `.next-prod` y `.next-verify` a `.gitignore`.
   - `--dry-run` imprime el plan (modo, puerto, `distDir`, claves bloqueadas por nombre, host enmascarado) sin arrancar nada y sin imprimir secretos.
2. `package.json`: scripts `dev:staging`, `build:staging`, `start:staging` que llaman al script. Los scripts existentes no cambian.
3. Lógica pura (parseo, bloqueo, comparación de hosts, enmascarado) en `src/lib/run-staging-core.ts` o equivalente testeable, con pruebas Vitest.
4. Aceptación: pruebas verdes; `node scripts/run-staging.mjs build --dry-run` no imprime ningún valor secreto (prueba automatizada); `docs/planning/RENDIMIENTO.md` y `ESTADO-SESION.md` documentan los comandos exactos de PowerShell.

### S1 — Sesión que no se pierde en silencio
1. Pruebas de la ruta de login: con `rememberMe: true` la cookie lleva `maxAge` = 2 592 000 s y el JWT expira en ~30 días; con `false` no lleva `maxAge` y el JWT dura 12 h.
2. `verifyJwt`: si `JWT_SECRET` no está definido, registrar una sola vez en el servidor un aviso claro («JWT_SECRET no configurado: las sesiones no se pueden validar») sin imprimir secretos; nunca usar `!` para ocultarlo.
3. Crear `POST /api/auth/logout` (borra la cookie `rai_session` con los mismos atributos) y conectar el botón de cerrar sesión existente (o crearlo en el pie del menú si no existe). Probar la ruta.
4. `GET /api/me` incluye `session.expiresAt` (ISO, leído del `exp` del JWT). Cuando una petición protegida responde 401 en el cliente, redirigir a `/login?next=<ruta>` con el aviso «Tu sesión terminó. Entra de nuevo.» (una sola implementación centralizada; sin bucles).
5. Aceptación: pruebas de login/logout/me/verifyJwt; texto de diagnóstico para Reiner en `ESTADO-SESION.md` (causas posibles y cómo comprobar en DevTools → Application → Cookies → `rai_session` → «Expires»).

### S2 — Configuración general (`/settings`)
Hoy `src/app/settings/page.tsx` tiene ~635 líneas y un scroller anidado `.terminal` de 400 px. Reestructurar en secciones con anclas (`#cuenta`, `#workspace`, `#modulos`, `#apariencia`, `#integraciones`, `#voz`, `#respaldo`, `#actividad`) y un solo scroll de página. Reglas de persistencia (decididas): **sin cambios de esquema**; lo que ya tiene columna se guarda en servidor; las preferencias de interfaz van a `localStorage` solo dentro de `useEffect`.
1. **Cuenta**: nombre para mostrar editable (2–60 caracteres, recortado) → actualiza `User.displayName` y **vuelve a emitir la cookie con el tiempo de vida restante** para que el saludo cambie sin volver a entrar; muestra «Tu sesión vence el …» y el botón «Cerrar sesión en este equipo». Esto permite a Reiner corregir «Rainer» por «Reiner» desde la interfaz.
2. **Workspace**: nombre (`Workspace.name`) editable solo por roles `super_admin`, `agency_owner`, `admin`.
3. **Módulos**: los campos existentes de `Settings` agrupados por módulo (Conversaciones: SLA y «la IA cuenta como respuesta»; Calendarios: modo privado; Automatización: interruptor general y correo de avisos; Integraciones: `n8nWebhookUrl`, `igBusinessId`), con guardado por sección, indicador de «cambios sin guardar» y mensaje de confirmación.
4. **Apariencia**: tema, densidad (reutilizar `DensityToggle`), «Reducir animaciones» (atributo en `<html>`, respeta `prefers-reduced-motion`), página de inicio preferida (`/` o `/launchpad`), lista de atajos (solo lectura).
5. **Integraciones (solo lectura + enlace)**: estado de Meta/Instagram, claves de IA (`/keys`), correo (configurado sí/no), voz (modo y enlace a `/agentes-ia/voz`), webhooks. Nunca mostrar secretos.
6. **Voz**: resumen y enlace al centro de voz; no duplicar el editor de `VoiceSettings` (sigue en `localStorage`, deuda documentada).
7. **Respaldo**: exportar/importar JSON de preferencias locales y de los campos de `Settings` (sin secretos), con validación y vista previa antes de aplicar.
8. **Actividad reciente**: reemplaza el `.terminal` con una lista de eventos de `/api/audit` (filtros, scroll de página, solo roles autorizados).
9. Buscador de ajustes dentro de la página; roles respetados en cada sección; carga con `useCachedJson` y `loading.tsx`.
10. Aceptación: `page.tsx` ≤ 200 líneas y ninguna sección > 400; sin `overflow-y` con altura fija en el módulo; pruebas de la lógica pura (validación del nombre, respaldo, estado de integraciones, anclas) y de las rutas nuevas; sin overflow horizontal en 320–1440 px.

### S3 — Scroll y menú
1. Eliminar scrollers anidados con altura fija en: `conversaciones`, `contactos`, `clientes-potenciales`, `generador-imagenes` (lista), `ContentIGTab`, `settings`, y en `globals.css`/`automation.css`/`pagos.css`/`generador.css` donde exista `overflow-y: auto|scroll` combinado con `height`/`max-height` en contenido de página. Excepción permitida solo si es una lista virtualizada o un panel lateral deslizante, documentada en `docs/DISENO-EFECTOS.md`.
2. Menú lateral con **secciones colapsables** (Principal, Contenido y marketing, Clientes, …): estado persistente en `localStorage` (en `useEffect`), la sección de la ruta actual se abre sola, accesible con teclado (`aria-expanded`), sin parpadeo de hidratación. Mantener `overscroll-behavior: contain`. Objetivo: en una ventana de 1366×768 todos los módulos son alcanzables sin que el menú atrape la rueda del ratón.
3. Aceptación: el comando de revisión `grep -rnE "overflow-y: *(auto|scroll)" src --include=*.css` solo devuelve excepciones documentadas; prueba de la lógica de secciones abiertas.

### S4 — Velocidad restante
`useCachedJson` + `loading.tsx` (con `PageSkeleton`/`Skeleton` de dimensiones reales) en: Ajustes, `agentes-ia/base-conocimiento` y `[id]`, Contactos, Conversaciones, Calendarios, Clientes Potenciales, Marketing, Sitios, Contenido multimedia. Sin peticiones idénticas duplicadas al montar. Aceptación: revisión de código por ruta + pruebas donde sea viable; si hay navegador disponible, medir clic→contenido y anotar cifras en `docs/planning/RENDIMIENTO.md`; si no, escribir «no medido».

### S5 — Módulos restantes (en el orden del menú, uno por uno)
M1 Marketing · M2 Contenido multimedia · M3 Sitios · M4 Conversaciones · M5 Contactos · M6 Clientes Potenciales · M7 Calendarios.
Para cada módulo: (1) leer el módulo y `docs/planning/CATALOGO-GHL-DIAGNOSTICO.md`; máximo 3 consultas dirigidas a `help.gohighlevel.com` (si una página está bloqueada, no evadirla); (2) dividir archivos > 500 líneas; (3) pulido premium **sutil**; (4) 2–4 funciones nuevas **reales** con datos y APIs existentes, **sin esquema**; (5) sin scrollers anidados; (6) caché + skeleton; (7) pruebas de la lógica pura; (8) entrada de recorrido guiado si el módulo ya tiene una; (9) registrar qué de GHL se adopta y qué se descarta.
Candidatas (elegir solo las que no exijan esquema):
- **Conversaciones**: filtros guardados («sin responder», «mías», «SLA por vencer»), respuestas rápidas con variables desde `Snippet`, indicador de SLA con los campos de `Settings`, atajos J/K para navegar, marcar como no leído.
- **Contactos**: vistas guardadas (`localStorage`), edición en línea, importar CSV con vista previa y detección de duplicados en el cliente, exportar CSV, tarjeta resumen (últimas conversaciones, citas y pagos).
- **Clientes Potenciales**: tablero por etapa con arrastrar (campo de estado existente), prioridad calculada con datos existentes, tarea de seguimiento rápida (`/api/contact-tasks`), «último contacto hace N días».
- **Calendarios**: vista día/semana mejorada, detección de choques, enlace público copiable (`/book/[slug]`), estado de disponibilidad visible.
- **Marketing / Contenido multimedia / Sitios**: decidir tras leer; ideas: biblioteca con búsqueda y filtros, vista previa, checklist de publicación del sitio, vista previa responsive, duplicar sitio.
Se permiten hasta 3 subagentes en paralelo con carpetas de propiedad disjunta (cada uno: su ruta, su CSS propio, sus `src/lib/*` nuevos, sus pruebas). Los archivos compartidos (`globals.css`, `effects.css`, `Sidebar`, `layout`, `roles.ts`, `tours.ts`) los edita solo el hilo principal o con ediciones puntuales.

### S6 — Deuda técnica acotada
1. Dividir `src/app/agentes-ia/base-conocimiento/[id]/page.tsx` (~645 líneas) en componentes/hooks sin cambiar comportamiento.
2. Quitar de `globals.css` las clases `.cn-chips`, `.cn-input`, `.cn-starters` **solo si** `grep` confirma que ya nadie las usa.
3. Dashboard: eliminar el salto de altura del aviso «sin campañas» al llegar los datos (reservar la altura) y mostrar los contadores «N+» con una pista accesible.
4. `ContentIGTab.tsx` (~1200 líneas): dividir solo si ya existen pruebas que cubran su lógica; si no, dejar como deuda anotada.

### S7 — Verificación visual
Con `node scripts/run-staging.mjs dev` y un navegador automatizado disponible (Claude in Chrome o Playwright), recorrer a 320, 390, 768, 1024 y 1440 px: `/`, `/launchpad`, `/campaign/new`, `/generador-imagenes`, `/automatizacion`, `/agentes-ia`, `/agentes-ia/voz`, `/pagos`, `/settings` y los módulos de S5. Medir overflow horizontal y buscar scrollers dobles. **No introducir contraseñas**: si se pide iniciar sesión y no hay sesión abierta, marcar «verificación visual pendiente de Reiner» y entregar una lista de comprobación; nunca declarar «verificado a ojo» sin evidencia.

### S8 — Documentación y panel
Crear primero en el panel la sección «Ola 4 — 16 oct» (copiar el patrón de «Ola 3 — 16 oct»; un ítem por slice S0–S8, `data-status` coherente con la clase) y actualizarla al cerrar cada slice con evidencia (comando + resultado + commit). Actualizar `docs/ESTADO-SESION.md`, `docs/DISENO-EFECTOS.md` y `docs/planning/RENDIMIENTO.md`. Si la carpeta de Obsidian del proyecto es accesible, actualizar Estado y Pendientes; si no, anotarlo.

### S9 — Cierre
Pasada completa de verificación (sección 5), commits locales ordenados, resumen final con evidencia y lista de lo que queda bloqueado o pendiente de Reiner.

## 2. Fuera de alcance (no tocar)
Push, merge, deploy, migraciones o cambios en `prisma/schema.prisma`, `IG_PUBLISH_MODE=live`, secretos de GitHub, borrado de ramas, pagos o telefonía reales, activación de la voz real (cuenta Retell, número, variables en vivo), llamadas reales a Retell, producción, RLS, Hidromáticos, cuentas de clientes. Ideas de la Ola 5 (no ejecutar aquí): Conversation AI en modo «Sugerido», base de conocimiento con búsqueda semántica, traspaso a humano, WhatsApp Cloud API, oportunidades/pipelines, formularios y encuestas, facturas y enlaces de pago.

## 3. Reglas fijas
- Nunca imprimir, copiar ni registrar valores de `.env*`; solo nombres de clave y hosts enmascarados. No leer `.env.production` salvo nombres de clave (S0).
- No ejecutar `next build` sobre `.next` mientras `next dev` esté abierto: usar `NEXT_DIST_DIR` distinto (tras S0) o una copia.
- Sin blur. Animaciones solo `transform`/`opacity`, 150–250 ms, `ease-out`, dentro de `@media (prefers-reduced-motion: no-preference)`; hover bajo `(hover:hover)`; tokens `var(--rai-*)`; tema claro `[data-theme="light"]`; botones con `!important` como el resto; 100 % responsive 320–1440 sin overflow horizontal; efectos informativos, no decorativos; reutilizar `src/styles/effects.css`, `Skeleton`, `EmptyState`, `PageSkeleton`.
- `localStorage` solo dentro de `useEffect` (hidratación). Sin scrollers anidados. Archivos de código ≤ 500 líneas salvo excepción documentada.
- Ortografía impecable en toda cadena de interfaz y documento. Idioma de la interfaz: español.
- Commits locales pequeños y coherentes, mensaje convencional; nunca `--no-verify`; nunca reescribir historia.
- Lo que no sea tuyo en `git status` (por ejemplo `docs/INTEGRACION-HIDROMATICOS.md`, `docs/clientes/`, `docs/referencia/`, `docs/planning/Plan 31-1102026/`, `public/auth/login-bg-nocturno.webp`) no se toca ni se commitea.
- Si falta un dato real (precio, texto legal, credencial): no inventar; dejar marcador visible y anotarlo.
- Detección de atasco: tras 3 intentos fallidos con la misma estrategia, cambiar de enfoque; si sigue fallando, marcar el ítem `blocked` en el panel con la causa exacta y pasar al siguiente slice.

## 4. Goal medible (condición de parada)
Todo lo siguiente a la vez:
1. `npx tsc --noEmit` = 0 errores; `npx eslint src` = 0; `npx vitest run` todo verde; `node scripts/run-staging.mjs build` (con `NEXT_DIST_DIR` propio) o `next build` en copia = correcto.
2. `node scripts/panel-check.mjs` = 0 errores y ningún aviso nuevo respecto a los 27 previos; `node scripts/gate.mjs --fast` verde si existe.
3. Los ítems S0–S9 de «Ola 4» en el panel están `done` (con evidencia) o `blocked` (con causa).
4. El comando de revisión de scrollers (S3) solo devuelve excepciones documentadas.
5. Ningún archivo tocado supera 500 líneas sin excepción documentada.
6. `ESTADO-SESION.md`, `DISENO-EFECTOS.md` y `RENDIMIENTO.md` reflejan el trabajo; commits locales por slice; árbol limpio salvo lo que no es tuyo.

## 5. Método de verificación
`tsc`, `eslint` y `vitest` se ejecutan en el repo. El build solo con `distDir` aparte. Cada slice cierra con: comando, resultado real y hash del commit en el panel. La verificación final la hace el hilo principal directamente (nunca un subagente). Lo que no se pudo comprobar (navegador, base de datos real, tiempos) se declara «no verificado», jamás «hecho».
