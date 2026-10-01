# SPEC — Login/Registro premium + auto-registro con workspace propio

Rama: `rai-feat-login-registro-ui` (parte de `security/fase-0`, trae el auth real ya construido). Nunca tocar `main`.

## 1. Objetivo

Hoy `/login` y `/registro` funcionan pero con diseño simple (card centrada, sin banner) y el registro exige invitación previa (403 si no hay invitación pendiente ni es super admin). Esta spec cierra dos cosas:

1. **Rediseño premium** de `AuthShell` (`src/components/auth/AuthShell.tsx`) y las páginas `/login` y `/registro` — look de alta gama con imagen de fondo tipo "skyline dorado nocturno", manteniendo 100% la paleta y componentes del Manual de Marca (`docs/BRAND_GUIDE.md` / doc de marca del proyecto). Cero librerías UI nuevas, cero colores fuera de la tabla de marca.
2. **Auto-registro con workspace propio**: cuando alguien se registra SIN invitación pendiente (y no es super admin), en vez de devolver 403, se le crea automáticamente su propio `Workspace` nuevo (él queda como owner). El flujo de registro POR invitación existente queda exactamente igual, sin tocar.

## 2. Alcance — qué se toca

- `src/components/auth/AuthShell.tsx` — rediseño visual (banner + layout), mismo contrato de props.
- `src/app/login/page.tsx`, `src/app/registro/page.tsx` — ajustes de layout si el nuevo AuthShell lo requiere; la lógica de fetch a `/api/auth/login` y `/api/auth/register` NO cambia de forma (login es intacto; registro gana un campo opcional nuevo, ver abajo).
- `src/app/api/auth/register/route.ts` — agregar la rama de auto-provisión de workspace cuando no hay invitación pendiente.
- `src/lib/__tests__/auth-register.test.ts` — actualizar el test que hoy espera 403 sin invitación (ese caso ya no existe) + agregar test nuevo del flujo de auto-provisión.
- `public/auth/login-bg-desktop.jpg` y `public/auth/login-bg-mobile.jpg` — rutas reservadas para las imágenes reales que Reiner va a generar y soltar ahí (ver sección 5, no bloqueante).

**Fuera de alcance, no tocar:** `src/app/api/auth/login/route.ts` (login no cambia), `src/lib/auth.ts`, lógica de invitación en `src/app/api/team/route.ts`, cualquier otra ruta API, RLS, migraciones de Prisma (el schema de `User`/`Workspace`/`WorkspaceMember` ya tiene todo lo necesario, no se toca `prisma/schema.prisma`).

## 3. Decisión de producto ya cerrada — auto-registro

En `POST /api/auth/register`, cuando `pending.length === 0 && !isPlatformSuperAdmin(normalizedEmail)` (el caso que hoy devuelve 403):

- En vez de 403, crear un `Workspace` nuevo con `ownerId` = el `User` reción creado/actualizado.
- Nombre del workspace: tomar de un campo nuevo y opcional `businessName` en el body del POST (agregar un input "Nombre de tu negocio" en el formulario de `/registro`, opcional). Si viene vacío/no se manda, usar `"Mi negocio"` como default — nunca dejarlo `undefined`/`null` en la UI.
- No crear fila en `WorkspaceMember` para el owner — el patrón ya existente en `src/lib/roles.ts` (`getRole`) resuelve el rol `admin` automáticamente para quien es `ownerId` del workspace, sin necesitar membership.
- El resto de la función (hash de password, creación/actualización de `User`, activar invitaciones pendientes si las hubiera) sigue exactamente igual.
- Response: agregar `workspaceId` al JSON de respuesta (`{ ok: true, email, workspaceId }`) para que el frontend pueda usarlo si hace falta más adelante — no se usa todavía en el frontend de esta spec.

## 4. Rediseño visual — AuthShell

- Layout:
  - **Desktop (≥900px):** split-screen. Panel izquierdo (~55-60% ancho) = imagen `login-bg-desktop.jpg` como `background-image` CSS (`cover`, `center`), con un degradado oscuro superpuesto (`linear-gradient` hacia `--rai-black`) para que cualquier texto futuro sobre la imagen sea legible. Panel derecho = fondo `--rai-dark` sólido, formulario centrado verticalmente (reusa el mismo `.card` y el logo que ya existen hoy).
  - **Mobile (<900px):** la imagen `login-bg-mobile.jpg` como banner superior de altura fija (`~38vh`), con el mismo degradado hacia `--rai-black` en la base para fundirse con el panel del formulario, que va debajo en fondo `--rai-dark` sólido (mismo patrón que ya usa `AuthShell` hoy, solo que ahora con el banner arriba en vez del logo solo).
- Las imágenes se referencian como **CSS `background-image: url(...)`, nunca `next/image`** — si el archivo todavía no existe en `public/auth/`, el navegador simplemente no pinta nada ahí (fondo sólido de marca por defecto) y el build/dev server NO falla. Esto es a propósito (ver sección 5).
- Tipografía, radios, sombras y el sistema de botones (`.btn-primary` con glow dorado): sin cambios, se heredan del CSS global tal cual están documentados en el Manual de Marca.
- No agregar animaciones JS pesadas ni dependencias nuevas — un `transition`/`fade-in` simple en CSS al cargar la página alcanza.

## 5. Las imágenes reales — no bloqueante

Reiner está generando `login-bg-desktop.jpg` (16:9) y `login-bg-mobile.jpg` (9:16) con un prompt ya aprobado (concepto "skyline dorado nocturno", paleta `#0A0A0F`/`#C9A84C`/`#E8B923`, sin texto ni logos). Todavía no están listas al momento de escribir esta spec.

**No inventar ni generar estas imágenes dentro del loop.** El trabajo de este bloque se da por completo sin ellas — solo dejar las rutas (`public/auth/login-bg-desktop.jpg`, `public/auth/login-bg-mobile.jpg`) referenciadas en el CSS tal como se describe en la sección 4. Cuando Reiner suelte los archivos reales en esas rutas, se ven solas, sin tocar código de nuevo.

## 6. Criterios de aceptación (medibles — el loop no se cierra sin esto)

1. `npx tsc --noEmit` limpio (0 errores).
2. Lint del repo (`npm run lint` o el comando que ya use el proyecto) sin errores ni warnings nuevos.
3. `npx vitest run` — 100% de los tests existentes en verde (incluyendo los de auth ya existentes, ajustados donde la sección 3 lo pide) + los tests nuevos del flujo de auto-registro:
   - Registrar sin invitación → 200/201, se crea un `Workspace` con `ownerId` correcto.
   - `businessName` vacío → el workspace queda con nombre `"Mi negocio"`.
   - `businessName` con texto → el workspace usa exactamente ese texto.
   - El flujo CON invitación pendiente sigue devolviendo exactamente el comportamiento actual (test de regresión, no se rompe nada).
4. `npm run build` exitoso (build de producción completo, sin warnings nuevos).
5. Captura de pantalla de `/login` y `/registro` en desktop y mobile (viewport simulado), confirmando: layout nuevo visible, ningún color fuera de la tabla de marca, sin errores de consola.
6. Nada de esto se mergea, pushea ni deploya solo — el loop se detiene con todo commiteado localmente en `rai-feat-login-registro-ui`, listo para que Reiner lo revise.

## 7. Reglas fijas heredadas (AGENTS.md / orchestrator.md de este repo)

- Rama `rai-feat-login-registro-ui` únicamente, nunca `main`.
- `git push`, merge a `main`, `wrangler deploy`: siempre piden confirmación explícita de Reiner — el loop no los ejecuta por su cuenta.
- `npx prisma migrate dev` prohibido contra la DB de `.env.local` — esta spec no debería necesitar ninguna migración (el schema ya tiene todo lo necesario).
- Código final limpio: sin `console.log`/`debugger`, sin imports sin usar, sin código muerto, sin comentarios de relleno.
- Nunca inventar textos legales, precios, ni datos — si falta algo real, dejarlo como placeholder visualmente marcado, no inventado como si fuera dato real.
- Al cerrar el bloque, actualizar `docs/planning/panel-control.html` (único panel de pendientes, no `ROADMAP.md`) con el resultado.
