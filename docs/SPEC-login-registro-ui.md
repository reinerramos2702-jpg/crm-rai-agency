# SPEC — Login/Registro premium + auto-registro con workspace propio

Rama: `rai-feat-login-registro-ui` (parte de `security/fase-0`, trae el auth real ya construido). Nunca tocar `main`.

> **Actualización 1 oct 2026 (cierra ambigüedad, no reabre el bloque):** las imágenes de fondo ya son reales y están commiteadas en `public/auth/` — dejan de ser "no bloqueante". El concepto visual final NO es el "skyline dorado nocturno sin texto" original — Reiner generó una escena cósmica dorada-púrpura (planeta, galaxia espiral, diamante de cristal) **con el logo "RAI Agency" ya quemado en la imagen**, y decidió usarla tal cual. Esto cambia tres cosas respecto a la versión anterior de esta spec, ya cerradas abajo: (1) el layout pasa de split-screen a **full-bleed** en desktop y mobile, (2) se quita el logo separado que `AuthShell` ponía arriba del card (ya está en la imagen, sería duplicado), (3) se agrega un scrim oscuro fuerte sobre la imagen para que el texto del card sea legible. Las secciones 4 y 5 reflejan ya la versión final — no hay versiones viejas que seguir.

## 1. Objetivo

Hoy `/login` y `/registro` funcionan pero con diseño simple (card centrada, sin banner) y el registro exige invitación previa (403 si no hay invitación pendiente ni es super admin). Esta spec cierra dos cosas:

1. **Rediseño premium** de `AuthShell` (`src/components/auth/AuthShell.tsx`) y las páginas `/login` y `/registro` — fondo full-bleed con la imagen de marca (escena cósmica dorada-púrpura, logo RAI Agency incluido), scrim oscuro fuerte, card flotante centrado, manteniendo 100% la paleta y componentes del Manual de Marca (`docs/Manual de Marca — CRM RAI Agency.md`). Cero librerías UI nuevas, cero colores fuera de la tabla de marca.
2. **Auto-registro con workspace propio**: cuando alguien se registra SIN invitación pendiente (y no es super admin), en vez de devolver 403, se le crea automáticamente su propio `Workspace` nuevo (él queda como owner). El flujo de registro POR invitación existente queda exactamente igual, sin tocar.

## 2. Alcance — qué se toca

- `src/components/auth/AuthShell.tsx` — rediseño visual completo (fondo full-bleed + scrim + card flotante), mismo contrato de props. Se elimina el bloque de logo/texto (`/crystal-logo.webp` + "RAI"/"AGENCY CRM") que hoy va arriba del `.card` — queda redundante porque el logo ya está en la imagen de fondo.
- `src/app/login/page.tsx`, `src/app/registro/page.tsx` — ajustes de layout si el nuevo `AuthShell` lo requiere; la lógica de fetch a `/api/auth/login` y `/api/auth/register` NO cambia de forma (login es intacto; registro gana un campo opcional nuevo, ver abajo).
- `src/app/api/auth/register/route.ts` — agregar la rama de auto-provisión de workspace cuando no hay invitación pendiente.
- `src/lib/__tests__/auth-register.test.ts` — actualizar el test que hoy espera 403 sin invitación (ese caso ya no existe) + agregar test nuevo del flujo de auto-provisión.
- `public/auth/login-bg-desktop.jpg` (1672×941, 16:9) y `public/auth/login-bg-mobile.jpg` (941×1672, 9:16) — **ya existen, commiteados.** No regenerar, no reemplazar, no recortar — se usan tal cual están.

**Fuera de alcance, no tocar:** `src/app/api/auth/login/route.ts` (login no cambia), `src/lib/auth.ts`, lógica de invitación en `src/app/api/team/route.ts`, cualquier otra ruta API, RLS, migraciones de Prisma (el schema de `User`/`Workspace`/`WorkspaceMember` ya tiene todo lo necesario, no se toca `prisma/schema.prisma`).

## 3. Decisión de producto ya cerrada — auto-registro

En `POST /api/auth/register`, cuando `pending.length === 0 && !isPlatformSuperAdmin(normalizedEmail)` (el caso que hoy devuelve 403):

- En vez de 403, crear un `Workspace` nuevo con `ownerId` = el `User` recién creado/actualizado.
- Nombre del workspace: tomar de un campo nuevo y opcional `businessName` en el body del POST (agregar un input "Nombre de tu negocio" en el formulario de `/registro`, opcional). Si viene vacío/no se manda, usar `"Mi negocio"` como default — nunca dejarlo `undefined`/`null` en la UI.
- No crear fila en `WorkspaceMember` para el owner — el patrón ya existente en `src/lib/roles.ts` (`getRole`) resuelve el rol `admin` automáticamente para quien es `ownerId` del workspace, sin necesitar membership.
- El resto de la función (hash de password, creación/actualización de `User`, activar invitaciones pendientes si las hubiera) sigue exactamente igual.
- Response: agregar `workspaceId` al JSON de respuesta (`{ ok: true, email, workspaceId }`) para que el frontend pueda usarlo si hace falta más adelante — no se usa todavía en el frontend de esta spec.

## 4. Rediseño visual — AuthShell (full-bleed, versión final)

- **Layout único, desktop y mobile** (ya no split-screen):
  - El contenedor raíz de `AuthShell` usa la imagen de fondo a pantalla completa: `background-size: cover; background-position: center; min-height: 100dvh`.
  - Breakpoint por `background-image`: `≥900px` → `url(/auth/login-bg-desktop.jpg)`; `<900px` → `url(/auth/login-bg-mobile.jpg)` (media query simple, mismo patrón que ya usa el resto del proyecto).
  - **Scrim oscuro fuerte sobre la imagen**, para que el texto del card (hecho con código: inputs, labels, botones, título) se lea nítido sobre cualquier parte de la imagen: `background: linear-gradient(180deg, rgba(10,10,15,.62), rgba(10,10,15,.80)), url(...)` (usar el valor hex de `--rai-black` convertido a rgba, no un negro genérico). Esto reemplaza el degradado parcial de la versión anterior — ahora cubre toda la pantalla, no solo un panel.
  - El `.card` queda centrado vertical y horizontalmente (flex, `place-items: center`), con fondo semi-opaco sobre marca (`background: rgba(26,26,46,.88)` — `--rai-card` con alpha), `border: 1px solid var(--rai-border)`, mismo `border-radius`/sombra que ya define el sistema de cards, más un `backdrop-filter: blur(6px)` sutil (CSS puro, sin librería) para el efecto "glass" premium sin pesar el bundle.
  - **Se elimina** el bloque de logo (`/crystal-logo.webp`) + texto "RAI" / "AGENCY CRM" que hoy va arriba del `.card` — queda duplicado con el logo que ya está quemado en la imagen de fondo. El `.card` empieza directo en `title`/`subtitle` (prop ya existente de `AuthShell`, sin cambios de contrato).
- Las imágenes se referencian como **CSS `background-image`/`background` shorthand, nunca `next/image`** — ya existen en `public/auth/`, así que esto es solo una garantía de robustez (si algún día faltara el archivo, el build no debe romperse).
- Tipografía, radios, sombras y el sistema de botones (`.btn-primary` con glow dorado): sin cambios, se heredan del CSS global tal cual están documentados en el Manual de Marca.
- **Animaciones — CSS puro, nada de librerías JS (framer-motion, gsap, etc.), nada de dependencias nuevas:**
  - **Fondo (Ken Burns sutil):** `@keyframes` que escala la imagen de `scale(1)` a `scale(1.06)`, `20s ease-in-out infinite alternate` — zoom lento y casi imperceptible, le da vida al fondo sin distraer del formulario. Aplicar sobre la capa de `background-image` (o un pseudo-elemento `::before` si hace falta aislar el scrim del zoom), nunca sobre el `.card`.
  - **Card (entrada):** `@keyframes` de `opacity: 0` + `translateY(12px)` → `opacity: 1` + `translateY(0)`, `480ms ease-out`, se dispara una sola vez al montar (no infinito, no se repite).
  - **Respeto a accesibilidad:** envolver ambas animaciones en `@media (prefers-reduced-motion: reduce)` que las desactiva (fondo estático, card sin transición) — estándar, no es trabajo extra relevante pero evita un warning de accesibilidad en build/lint si el proyecto lo audita.
  - `backdrop-filter` es CSS nativo, no cuenta como dependencia nueva.

## 5. Las imágenes reales — CERRADO

`public/auth/login-bg-desktop.jpg` (1672×941, JPEG, ~575KB) y `public/auth/login-bg-mobile.jpg` (941×1672, JPEG, ~576KB) ya están commiteados en el repo. Concepto: escena cósmica dorada-púrpura (planeta, galaxia espiral, diamante de cristal) con el logo "RAI Agency" incluido en la propia imagen — decisión explícita de Reiner del 1 oct 2026, reemplaza el concepto original "skyline dorado nocturno sin texto ni logos".

**No regenerar, no recortar, no reemplazar estas imágenes dentro del loop.** Si por algún motivo los archivos no aparecen en `public/auth/` al ejecutar este bloque, es un bloqueo real — parar y reportarlo, no inventar un reemplazo.

## 6. Criterios de aceptación (medibles — el loop no se cierra sin esto)

1. `npx tsc --noEmit` limpio (0 errores).
2. Lint del repo (`npm run lint` o el comando que ya use el proyecto) sin errores ni warnings nuevos.
3. `npx vitest run` — 100% de los tests existentes en verde (incluyendo los de auth ya existentes, ajustados donde la sección 3 lo pide) + los tests nuevos del flujo de auto-registro:
   - Registrar sin invitación → 200/201, se crea un `Workspace` con `ownerId` correcto.
   - `businessName` vacío → el workspace queda con nombre `"Mi negocio"`.
   - `businessName` con texto → el workspace usa exactamente ese texto.
   - El flujo CON invitación pendiente sigue devolviendo exactamente el comportamiento actual (test de regresión, no se rompe nada).
4. `npm run build` exitoso (build de producción completo, sin warnings nuevos).
5. Captura de pantalla de `/login` y `/registro` en desktop y mobile (viewport simulado), confirmando TODO esto a la vez: (a) imagen de fondo full-bleed visible en ambos breakpoints con el archivo correcto por tamaño de viewport, (b) scrim oscuro aplicado — el card y su texto (título, labels, inputs, botón) se leen nítidos, sin zonas brillantes de la imagen compitiendo con el texto, (c) no aparece el logo/texto viejo duplicado arriba del card, (d) ningún color fuera de la tabla de marca, (e) sin errores de consola.
6. Confirmar en el código (no hace falta video/gif) que existen los `@keyframes` del Ken Burns del fondo y de entrada del card descritos en la sección 4, con su bloque `@media (prefers-reduced-motion: reduce)` correspondiente — una captura no muestra animación, así que esto se valida leyendo el CSS final, no visualmente.
7. Nada de esto se mergea, pushea ni deploya solo — el loop se detiene con todo commiteado localmente en `rai-feat-login-registro-ui`, listo para que Reiner lo revise.

## 7. Reglas fijas heredadas (AGENTS.md / orchestrator.md de este repo)

- Rama `rai-feat-login-registro-ui` únicamente, nunca `main`.
- `git push`, merge a `main`, `wrangler deploy`: siempre piden confirmación explícita de Reiner — el loop no los ejecuta por su cuenta.
- `npx prisma migrate dev` prohibido contra la DB de `.env.local` — esta spec no debería necesitar ninguna migración (el schema ya tiene todo lo necesario).
- Código final limpio: sin `console.log`/`debugger`, sin imports sin usar, sin código muerto, sin comentarios de relleno.
- Nunca inventar textos legales, precios, ni datos — si falta algo real, dejarlo como placeholder visualmente marcado, no inventado como si fuera dato real.
- Al cerrar el bloque, actualizar `docs/planning/panel-control.html` (único panel de pendientes, no `ROADMAP.md`) con el resultado.
