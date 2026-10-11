# SPEC — Login/Registro premium + auto-registro con workspace propio

Rama: `rai-feat-login-registro-ui` (parte de `security/fase-0`, trae el auth real ya construido). Nunca tocar `main`.

> **Actualización 1 oct 2026 (cierra ambigüedad, no reabre el bloque):** las imágenes de fondo ya son reales y están commiteadas en `public/auth/` — dejan de ser "no bloqueante". El concepto visual final NO es el "skyline dorado nocturno sin texto" original — Reiner generó una escena cósmica dorada-púrpura (planeta, galaxia espiral, diamante de cristal) **con el logo "RAI Agency" ya quemado en la imagen**, y decidió usarla tal cual. Esto cambia tres cosas respecto a la versión anterior de esta spec, ya cerradas abajo: (1) el layout pasa de split-screen a **full-bleed** en desktop y mobile, (2) se quita el logo separado que `AuthShell` ponía arriba del card (ya está en la imagen, sería duplicado), (3) se agrega un scrim oscuro fuerte sobre la imagen para que el texto del card sea legible. Revisión adicional del mismo día: el plan de ejecución de OpenCode exponía 3 huecos reales que esta spec cierra ahora — (4) `/registro` todavía tiene copy y comentarios que dicen "solo por invitación" (contradice el feature), (5) `POST /api/auth/register` no tenía rate-limit (antes no hacía falta, estaba gateado por invitación; abierto al público si lo necesita), (6) `businessName` no tenía trim/límite de longitud. Las secciones 2, 3 y 6 ya reflejan esto. No hay versiones viejas que seguir.

> **v4 (10 oct 2026) — cierra 5 huecos más antes de ejecutar:** (1) `src/app/login/page.tsx` (línea ~59) también dice "(solo con invitación)" junto al enlace a `/registro`: contradice el feature igual que el subtitle de `/registro`; (2) hay **tema claro "Perla"** (`[data-theme="light"]` en `globals.css`) y los tokens `--rai-*` cambian de valor: sin aislamiento, el card del auth saldría con colores claros sobre la imagen oscura; (3) el registro abierto necesita **aceptación de Términos y Política de privacidad** (requisito legal y de Meta para su App Review) y un **honeypot** anti-bots; (4) el formulario necesita UX y accesibilidad mínimas (mostrar/ocultar contraseña, indicador de fuerza, `autocomplete` correcto, cuenta regresiva en 429); (5) faltaba una prueba e2e de la UI y una verificación medible de contraste y rendimiento. Los efectos premium para el resto del CRM (dashboard, sidebar, botones, estados vacíos) **no entran en este bloque**: van en `docs/SPEC-sistema-visual-premium.md`, que se ejecuta después de cerrar este. Las secciones 2, 3, 4, 6 y 7 ya reflejan v4.

## 1. Objetivo

Hoy `/login` y `/registro` funcionan pero con diseño simple (card centrada, sin banner) y el registro exige invitación previa (403 si no hay invitación pendiente ni es super admin). Esta spec cierra dos cosas:

1. **Rediseño premium** de `AuthShell` (`src/components/auth/AuthShell.tsx`) y las páginas `/login` y `/registro` — fondo full-bleed con la imagen de marca (escena cósmica dorada-púrpura, logo RAI Agency incluido), scrim oscuro fuerte, card flotante centrado, manteniendo 100% la paleta y componentes del Manual de Marca (`docs/Manual de Marca — CRM RAI Agency.md`). Cero librerías UI nuevas, cero colores fuera de la tabla de marca.
2. **Auto-registro con workspace propio**: cuando alguien se registra SIN invitación pendiente (y no es super admin), en vez de devolver 403, se le crea automáticamente su propio `Workspace` nuevo (él queda como owner). El flujo de registro POR invitación existente queda exactamente igual, sin tocar.

## 2. Alcance — qué se toca

- `src/components/auth/AuthShell.tsx` — rediseño visual completo (fondo full-bleed + scrim + card flotante), mismo contrato de props. Se elimina el bloque de logo/texto (`/crystal-logo.webp` + "RAI"/"AGENCY CRM") que hoy va arriba del `.card` — queda redundante porque el logo ya está en la imagen de fondo.
- `src/app/login/page.tsx`, `src/app/registro/page.tsx` — ajustes de layout si el nuevo `AuthShell` lo requiere; la lógica de fetch a `/api/auth/login` y `/api/auth/register` NO cambia de forma (login es intacto; registro gana un campo opcional nuevo, ver abajo).
- `src/app/api/auth/register/route.ts` — agregar la rama de auto-provisión de workspace cuando no hay invitación pendiente.
- `src/lib/__tests__/auth-register.test.ts` — actualizar el test que hoy espera 403 sin invitación (ese caso ya no existe) + agregar test nuevo del flujo de auto-provisión.
- `src/app/registro/page.tsx` — además del layout: quitar el comentario de cabecera desactualizado ("Registro SOLO por invitación...") y el `subtitle="El registro es solo por invitación de un administrador del workspace."` (línea actual ~47) — reemplazar por copy que refleje auto-registro abierto. Si el fetch de este archivo tiene manejo específico para el 403 viejo ("no tienes invitación pendiente"), eliminarlo — ese caso ya no puede ocurrir, dejarlo sería código muerto.
- `src/app/login/page.tsx` — además del layout: reemplazar el texto `¿No tienes cuenta? Regístrate (solo con invitación)` por copy que refleje registro abierto (sin la aclaración de invitación).
- `src/app/registro/page.tsx` — agregar: checkbox obligatorio de aceptación con enlaces a `/terminos` y `/privacidad`, campo honeypot oculto, botón mostrar/ocultar contraseña, indicador de fuerza y cuenta regresiva en 429 (ver sección 4, "Formulario").
- `src/app/terminos/page.tsx` y `src/app/privacidad/page.tsx` — **páginas nuevas, públicas, mínimas**: título + un aviso visible y marcado como placeholder ("Documento legal pendiente de redacción y revisión por asesoría legal antes de operar con clientes"). **Prohibido inventar texto legal.** Usan el mismo `AuthShell`/estilos; no requieren autenticación (no hay middleware global en el repo, pero verificar que ningún guard redirija estas rutas a `/login`).
- `tests/e2e/auth-ui.spec.ts` — **archivo nuevo**, e2e de la UI de auth (ver criterio 7). No se modifica `tests/e2e/login.spec.ts` (su comentario de cabecera dice que no existe login real: está desactualizado; se registra como deuda, no se toca aquí).
- `src/lib/rate-limit.ts` — **no se modifica**, ya expone `checkRateLimit` y lo usa `login/route.ts`; se **importa y reusa tal cual** en `register/route.ts` (ver sección 3).
- `public/auth/login-bg-desktop.jpg` (1672×941, 16:9) y `public/auth/login-bg-mobile.jpg` (941×1672, 9:16) — **ya existen, commiteados.** No regenerar, no reemplazar, no recortar — se usan tal cual están.

**Fuera de alcance, no tocar:** `src/app/api/auth/login/route.ts` (login no cambia), `src/lib/auth.ts`, lógica de invitación en `src/app/api/team/route.ts`, cualquier otra ruta API, RLS, migraciones de Prisma (el schema de `User`/`Workspace`/`WorkspaceMember` ya tiene todo lo necesario, no se toca `prisma/schema.prisma`).

## 3. Decisión de producto ya cerrada — auto-registro

En `POST /api/auth/register`, cuando `pending.length === 0 && !isPlatformSuperAdmin(normalizedEmail)` (el caso que hoy devuelve 403):

- En vez de 403, crear un `Workspace` nuevo con `ownerId` = el `User` recién creado/actualizado.
- Nombre del workspace: tomar de un campo nuevo y opcional `businessName` en el body del POST (agregar un input "Nombre de tu negocio" en el formulario de `/registro`, opcional). Si viene vacío/no se manda, usar `"Mi negocio"` como default — nunca dejarlo `undefined`/`null` en la UI.
- No crear fila en `WorkspaceMember` para el owner — el patrón ya existente en `src/lib/roles.ts` (`getRole`) resuelve el rol `admin` automáticamente para quien es `ownerId` del workspace, sin necesitar membership.
- **Rate limiting (obligatorio, no opcional):** antes de la invitación/lógica de registro, aplicar `checkRateLimit` (mismo helper de `@/lib/rate-limit` que ya usa `login/route.ts`, sin tocar ese archivo) con claves `register:${normalizedEmail}` y `register:ip:${ip}`, mismos límites que login (5 intentos / 15 min), mismo shape de respuesta 429 con header `Retry-After`. Antes el registro estaba protegido por la gate de invitación; al quedar abierto necesita la misma defensa que ya tiene login — no es un mecanismo nuevo, es reusar el existente.
- `businessName`: `trim()` antes de usarlo; si después del trim queda vacío, tratarlo igual que "no enviado" → `"Mi negocio"`. Cap a 120 caracteres (truncar, no rechazar la request).
- **Aceptación legal (obligatoria, aplica a TODO registro, también por invitación):** el body debe traer `acceptTerms: true`; si falta o es `false` → 400 con `{ error: 'Debes aceptar los Términos y la Política de privacidad.' }` y no se crea `User` ni `Workspace`. Es el único cambio permitido al flujo por invitación; los tests existentes de ese flujo se ajustan solo para enviar `acceptTerms: true`. **No se persiste** la aceptación (no hay campo en el schema y esta spec no toca migraciones): queda registrado como deuda en el panel (persistir fecha y versión del documento requiere migración aprobada).
- **Honeypot anti-bots:** el formulario incluye un campo oculto `website` (fuera de pantalla con CSS, `tabindex="-1"`, `autocomplete="off"`, `aria-hidden="true"`). Si llega con contenido → 400 con mensaje genérico `{ error: 'No se pudo completar el registro.' }`, sin crear nada y sin revelar el motivo. La verificación va **después** de aplicar `checkRateLimit`.
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

### Aislamiento de tema (nuevo en v4)

El CRM tiene tema oscuro (default) y tema claro "Perla" (`[data-theme="light"]` en `src/app/globals.css`), y los tokens `--rai-*` cambian de valor entre ellos. `AuthShell` **siempre se ve oscuro**: su contenedor raíz (con un atributo propio, ej. `data-auth-shell`) redeclara en su scope los valores oscuros de `--rai-black`, `--rai-dark`, `--rai-card`, `--rai-border`, `--rai-gold`, `--rai-gold-br`, `--rai-gold-dim`, `--rai-text` y `--rai-muted` (copiados del bloque `:root`, sin inventar colores), de modo que `.card`, inputs, labels y `.btn-primary` heredan oscuro aunque el `<html>` tenga `data-theme="light"`. No se modifica el bloque global de temas.

### Formulario: UX y accesibilidad (nuevo en v4)

- **Contraseña:** botón mostrar/ocultar (`type="button"`, `aria-pressed`, `aria-label` en español) que alterna `type` entre `password` y `text`. Indicador de fuerza **solo visual**, calculado en cliente con una función pura y pequeña (longitud + variedad de caracteres → débil / media / fuerte, con texto, no solo color). No cambia la regla de validación del servidor.
- **`autocomplete` correcto:** `email` (email), `current-password` (login), `new-password` (registro), `organization` ("Nombre de tu negocio"), `name` (nombre) si el formulario ya lo pide.
- **Estados:** botón principal con `disabled` + `aria-busy="true"` mientras la petición está en vuelo; errores en una región `aria-live="polite"` asociada a los campos con `aria-describedby`; al fallar la validación, el foco va al primer campo inválido.
- **Rate-limit visible:** si la respuesta es 429, leer el header `Retry-After` y mostrar "Demasiados intentos. Intenta de nuevo en N s" con cuenta regresiva; el botón queda deshabilitado hasta que llegue a 0.
- **Checkbox de términos:** `required`, etiqueta clicable con enlaces a `/terminos` y `/privacidad` (abren en la misma pestaña, `rel="noopener"` si usan `target`).
- **Copy:** el texto de registro y login refleja registro abierto; nada de "solo por invitación" en ninguna pantalla ni mensaje de error.
- **Contraste:** el texto del card (título, labels, inputs, mensajes) cumple WCAG AA (≥ 4.5:1 para texto normal) calculado contra el **peor caso**: el color del card (`rgba(26,26,46,.88)`) compuesto sobre la zona más clara posible de la imagen bajo el scrim. Se reporta la tabla de razones calculadas.

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
   - Rate-limit: 6to intento de registro con el mismo email (o misma IP) en menos de 15 min → 429 con `Retry-After` (mismo patrón que el test ya existente `auth-login.test.ts`).
   - `acceptTerms` ausente o `false` → 400 y no se crea `User` ni `Workspace` (aplica también al flujo con invitación).
   - Honeypot `website` con contenido → 400 genérico y no se crea nada.
4. `npm run build` exitoso (build de producción completo, sin warnings nuevos).
5. Captura de pantalla de `/login` y `/registro` en desktop y mobile (viewport simulado), confirmando TODO esto a la vez: (a) imagen de fondo full-bleed visible en ambos breakpoints con el archivo correcto por tamaño de viewport, (b) scrim oscuro aplicado — el card y su texto (título, labels, inputs, botón) se leen nítidos, sin zonas brillantes de la imagen compitiendo con el texto, (c) no aparece el logo/texto viejo duplicado arriba del card, (d) ningún color fuera de la tabla de marca, (e) sin errores de consola, (f) ni `/registro` ni `/login` muestran en ningún lado el texto "solo por invitación" / "solo con invitación" (subtitle, copy, mensajes de error), (g) la captura se repite con `data-theme="light"` en `<html>` y el auth se ve idéntico (aislamiento de tema).
6. Confirmar en el código (no hace falta video/gif) que existen los `@keyframes` del Ken Burns del fondo y de entrada del card descritos en la sección 4, con su bloque `@media (prefers-reduced-motion: reduce)` correspondiente — una captura no muestra animación, así que esto se valida leyendo el CSS final, no visualmente.
7. **E2E de UI** — `tests/e2e/auth-ui.spec.ts` (nuevo) en verde en los proyectos `desktop-chromium` y `mobile-chromium` de `playwright.config.ts`, sin necesitar base de datos (intercepta `/api/auth/*` con `page.route`). Verifica: (a) el `background-image` computado del contenedor corresponde al archivo correcto por viewport; (b) `.card` visible y sin el bloque de logo viejo; (c) ausencia del texto "solo por/con invitación" en `/login` y `/registro`; (d) enviar sin marcar el checkbox de términos no llama a la API; (e) el botón de contraseña alterna `type` y `aria-pressed`; (f) una respuesta 429 simulada con `Retry-After: 3` muestra la cuenta regresiva y deshabilita el botón; (g) cero errores de consola.
8. **Contraste WCAG AA** — tabla de razones de contraste calculadas (fórmula WCAG, peor caso de la imagen bajo el scrim) para título, labels, texto de input, placeholder, mensajes de error y texto del botón; todas ≥ 4.5:1 (≥ 3:1 solo para texto grande ≥ 24px o 18.66px en negrita y para bordes de input). Si alguna no cumple, se corrige el token de la capa de auth antes de cerrar.
9. **Rendimiento (se reporta, no bloquea):** LCP medido con el perfil `mobile-chromium` sobre `npm run build && npm start` (no sobre `dev`), con `PerformanceObserver` de `largest-contentful-paint`; objetivo ≤ 2.5 s. Si lo excede, se reporta el valor y se registra como deuda (opciones: variante WebP/AVIF — hoy no hay `sharp` instalado y no se agregan dependencias — o reducir el peso de los JPG con una herramienta ya disponible); **no se reemplazan ni recortan los JPG actuales**.
10. Nada de esto se mergea, pushea ni deploya solo — el loop se detiene con todo commiteado localmente en `rai-feat-login-registro-ui`, listo para que Reiner lo revise.

## 7. Reglas fijas heredadas (AGENTS.md / orchestrator.md de este repo)

- Rama `rai-feat-login-registro-ui` únicamente, nunca `main`.
- `git push`, merge a `main`, `wrangler deploy`: siempre piden confirmación explícita de Reiner — el loop no los ejecuta por su cuenta.
- `npx prisma migrate dev` prohibido contra la DB de `.env.local` — esta spec no debería necesitar ninguna migración (el schema ya tiene todo lo necesario).
- Código final limpio: sin `console.log`/`debugger`, sin imports sin usar, sin código muerto, sin comentarios de relleno.
- Nunca inventar textos legales, precios, ni datos — si falta algo real, dejarlo como placeholder visualmente marcado, no inventado como si fuera dato real.
- Al cerrar el bloque, actualizar `docs/planning/panel-control.html` (único panel de pendientes, no `ROADMAP.md`) con el resultado.
- **Cero dependencias nuevas** (ni de producción ni de desarrollo): sin `sharp`, sin `@axe-core/*`, sin librerías de animación ni de formularios.
- **Deuda registrada, NO se resuelve en este bloque** (anotar cada una en el panel con la causa): (1) CAPTCHA/Cloudflare Turnstile — requiere claves externas; (2) verificación de email — requiere proveedor de correo; (3) persistir la aceptación legal (fecha y versión) — requiere migración; (4) el rate-limit es en memoria por instancia (limitación ya conocida en serverless); (5) comentario de cabecera desactualizado en `tests/e2e/login.spec.ts`; (6) redacción real de Términos y Privacidad por asesoría legal; (7) comprobar si `/api/auth/register` revela existencia de emails (409) y decidir política — no cambiarlo aquí.

## Adenda 11 oct 2026 — «Mantener sesión iniciada» (ya implementado en local, `f4b450a`)
- Campo opcional `rememberMe` (booleano estricto) en `POST /api/auth/login`: `true` → cookie `rai_session` persistente 30 días y JWT 30 días; ausente/`false` → cookie de sesión y JWT 12 h. Duraciones en `src/lib/session-ttl.ts`.
- UI: interruptor accesible (`role="switch"`) entre la contraseña y el botón, ambos temas, `prefers-reduced-motion`; la última elección se recuerda en `localStorage` (solo comodidad).
- El registro (`/registro`) no cambia; su duración de sesión sigue la de `signJwt` por defecto (7 días) hasta que se decida otra cosa.
- Aceptación: login con `rememberMe:true` → `Set-Cookie` con `Max-Age=2592000`; sin él → sin `Max-Age`/`Expires`. Cubierto por `auth-login.test.ts` y `session-ttl.test.ts`.
- Deuda: sin revocación en servidor (JWT sin estado); sin endpoint de logout.
- Fondo full-bleed: Reiner decidió (11 oct) generar una imagen nueva con el robot y el logo para `/login` y `/registro`; reemplaza o complementa `public/auth/login-bg-*.jpg` al recibirla.

## Adenda 11 oct 2026 (noche) — Registro abierto implementado en local (`d387b05`)
- Implementado por Claude (local, sin push): backend `POST /api/auth/register` según §3 + `acceptTerms`, honeypot `website`, rate limit email/IP; UI `/registro` y copy de `/login` («Regístrate gratis»); placeholders `/terminos` y `/privacidad`. 13 tests de registro.
- **Desviación endurecida:** un email que ya existe como usuario sin clave (SSO) y se registra de forma abierta → 409 (evita tomar cuentas ajenas). La spec no lo prohibía de forma explícita.
- Queda para OpenCode: fuerza/mostrar contraseña, cuenta regresiva, e2e `tests/e2e/auth-ui.spec.ts`, a11y restante, verificación de email (diferida §7).
- Fondo: imagen «amanecer» (`login-bg-amanecer.webp`) sustituye a la cosmos; ver `docs/ESTADO-SESION.md`.
- Producto: el registro abierto exige antes el gating de planes (`docs/SPEC-planes-monetizacion.md`).
