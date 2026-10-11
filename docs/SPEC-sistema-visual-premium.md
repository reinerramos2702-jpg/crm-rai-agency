# SPEC — Sistema visual premium (efectos reutilizables para todo el CRM)

Rama: `rai-feat-visual-premium`. **Precondición:** el bloque `docs/SPEC-login-registro-ui.md` (v4) está cerrado y aprobado por Reiner. La rama parte de `rai-feat-login-registro-ui` si ese bloque aún no se mergeó (porque `AuthShell` define el patrón glass y el aislamiento de tema), o de la base que Reiner indique. Nunca tocar `main`.

## 1. Objetivo

Llevar la sensación "premium" del login (fondo a pantalla completa, glass, glow dorado, movimiento sutil) al resto del CRM de forma **reutilizable y barata**: una capa de tokens y clases utilitarias en `src/app/globals.css` que cualquier pantalla adopta con una clase, sin reescribir componentes ni lógica. Resultado esperado: dashboard, sidebar, botones, tarjetas, estados vacíos y notificaciones con el mismo lenguaje visual, en tema oscuro y en tema claro.

## 2. Principios no negociables

1. **Tokens primero.** Nada de colores nuevos: solo `var(--rai-*)` o variantes con transparencia de esos mismos valores (`color-mix(in srgb, var(--rai-gold) 12%, transparent)`). Manual de Marca: `docs/Manual de Marca — CRM RAI Agency.md`.
2. **Funciona en los dos temas.** Tema oscuro (default, bloque `:root`) y tema claro "Perla" (`[data-theme="light"]`). Cada efecto se verifica en ambos; si un efecto solo luce bien en oscuro, se atenúa o se desactiva en claro dentro de `[data-theme="light"]`.
3. **CSS puro** (más un único hook de React para el contador). Cero librerías nuevas, ni de producción ni de desarrollo.
4. **Movimiento con propósito y accesible.** Solo se animan `transform` y `opacity` (nada de `width`, `height`, `top`, `left` ni sombras animadas de gran tamaño). Todo bloque con animación o transición decorativa va dentro de `@media (prefers-reduced-motion: no-preference)` o tiene su override en `@media (prefers-reduced-motion: reduce)`. Los efectos de hover se activan solo bajo `@media (hover: hover)`; en táctil nunca dependen del hover.
5. **Rendimiento.** `backdrop-filter` solo en superficies grandes y escasas (máx. 2 por pantalla); nunca en filas de listas ni tablas. Sin `background-attachment: fixed` en móvil. CLS = 0 por efectos.
6. **Reutilizar lo que ya existe.** Ya existen `.card`, `.btn-primary` (glow dorado), `.skeleton` con `skeleton-shimmer`, `.badge-*`, `.toast`, `.modal`. Se **extienden con modificadores** (`.fx-*`); no se duplican ni se reescriben.

## 3. Alcance — qué se toca

- `src/app/globals.css` — nueva sección final "EFECTOS PREMIUM" con tokens `--fx-*` y clases `.fx-*`. No se edita ninguna regla existente salvo para añadir el pseudo-elemento de destello al `.btn-primary` (único cambio a una regla actual).
- `src/lib/hooks/use-count-up.ts` — hook nuevo de React (sin dependencias) + función pura `interpolateCount(from, to, progress)` exportada y testeada.
- `src/app/page.tsx` (dashboard) y los componentes de `src/components/dashboard/` que pinten KPIs y tarjetas — adoptan `fx-*` y el contador. Solo presentación: no se toca lógica, fetch ni datos.
- `src/components/layout/Sidebar.tsx` y `TopBar.tsx` — estado activo con glow y transiciones; sin cambiar rutas ni `NAV_ITEMS`.
- `src/components/ModulePlaceholder.tsx` y los estados vacíos existentes — halo dorado en el icono y entrada suave.
- Toasts (`.toast` / `react-hot-toast` ya instalado) — estilo glass con barra dorada; solo estilos.
- `tests/e2e/visual-premium.spec.ts` (nuevo) y `src/lib/hooks/use-count-up.test.ts` (nuevo).

**Fuera de alcance:** layouts nuevos, lógica de negocio, API, Prisma, RLS, generación de imágenes, cambio de tipografía, el login (ya cerrado en su propia spec), módulos fuera de la lista de arriba (los demás adoptan `fx-*` en bloques posteriores, uno por PR pequeño).

## 4. Catálogo de efectos (especificación)

| Clase / token | Qué hace | Detalle de implementación |
|---|---|---|
| `--fx-glass-bg`, `--fx-glass-blur` | Superficie glass reutilizable | `color-mix(in srgb, var(--rai-card) 88%, transparent)` + `backdrop-filter: blur(6px)`; en claro, mezcla con `var(--rai-card)` blanco y borde `--rai-border`. |
| `.fx-glass` | Tarjeta/panel glass | Usa los tokens anteriores + `border: 1px solid var(--rai-border)` + `--shadow-card`. Máx. 2 por pantalla. |
| `.fx-lift` | Elevación al pasar el cursor | `@media (hover: hover)`: `transform: translateY(-2px)` + sombra `--shadow-card`; `transition: transform 180ms ease, box-shadow 180ms ease`. |
| `.fx-border-glow` | Borde con degradado dorado al hover | Pseudo-elemento con `mask` (borde de 1px) y `linear-gradient` de `--rai-gold-dim` a `--rai-gold-br`; solo `opacity` animada. |
| `.btn-primary::after` | Destello (sheen) en el botón principal | Franja diagonal translúcida que cruza el botón una vez al hover (`transform: translateX`), 600 ms; `overflow: hidden` en el botón; desactivado con reduced-motion. |
| `.fx-stagger` | Entrada escalonada de rejillas | Hijos con `animation: fx-rise 420ms ease-out both` y `animation-delay` por `:nth-child` hasta 8 (0–280 ms); una sola vez al montar. |
| `.fx-bg-aurora` | Fondo sutil del dashboard | `radial-gradient` dorado muy tenue arriba a la derecha + otro púrpura (`--rai-purple`) abajo a la izquierda, ≤ 10 % de opacidad; sin imágenes; en claro, ≤ 6 %. |
| `.nav-item.active` (extensión) | Ítem activo del sidebar | Barra izquierda de 3 px `--rai-gold-br` + glow `box-shadow` suave + transición de color 160 ms. |
| `.fx-empty-halo` | Icono de estado vacío | Círculo con `radial-gradient` dorado difuso detrás del icono, respiración muy lenta (`opacity` 0.6↔1, 4 s) solo si no hay reduced-motion. |
| `.toast` (extensión) | Notificación premium | Superficie glass + barra izquierda de color semántico (`--rai-success`, `--rai-error`, `--rai-warning`). |
| `:focus-visible` global | Foco accesible visible | Anillo de 2 px `--rai-gold-br` con `outline-offset: 2px`; nunca se elimina el foco. |
| `useCountUp` | Contadores de KPIs | Interpola de 0 al valor en ≤ 900 ms con `requestAnimationFrame` y ease-out; una vez por montaje; con reduced-motion muestra el valor final al instante; formatea con `Intl.NumberFormat('es')`. |

## 5. Orden de ejecución (rebanadas pequeñas, un commit por rebanada)

1. Tokens `--fx-*` y utilidades base (`.fx-glass`, `.fx-lift`, `.fx-stagger`, foco) + override de tema claro.
2. `.btn-primary` destello y `.fx-border-glow`.
3. Hook `useCountUp` + pruebas unitarias.
4. Dashboard (`/`): fondo aurora, tarjetas `fx-lift`/`fx-stagger`, KPIs con contador.
5. Sidebar/TopBar: estado activo y transiciones.
6. Estados vacíos y toasts.
7. Capturas, prueba e2e, medición de peso y cierre.

## 6. Criterios de aceptación (medibles)

1. `npx tsc --noEmit` limpio.
2. Lint sin errores ni advertencias nuevas.
3. `npx vitest run` 100 % verde, incluyendo pruebas nuevas de `interpolateCount` (valor en 0, 0.5 y 1; valor inicial = final; números grandes) y del formateo `es`.
4. `npm run build` exitoso, sin advertencias nuevas.
5. **Peso:** el First Load JS de `/` del reporte de `npm run build` no crece más de **5 kB** respecto a la medición previa a la spec (se registra "antes" y "después").
6. **Capturas** de `/` (dashboard), con sidebar, en **4 combinaciones**: desktop y mobile × tema oscuro y claro. Deben mostrar: fondo aurora tenue, tarjetas y KPIs legibles, ítem activo del sidebar con glow, sin elementos cortados ni texto ilegible.
7. **E2E** `tests/e2e/visual-premium.spec.ts` en verde en `desktop-chromium` y `mobile-chromium`: sin errores de consola; `emulateMedia({ reducedMotion: 'reduce' })` → el KPI muestra el valor final de inmediato y los elementos `fx-stagger` no tienen animación activa (`getComputedStyle(...).animationName === 'none'`); en `mobile-chromium` ninguna regla de hover cambia el layout.
8. **Contraste WCAG AA** de texto sobre las nuevas superficies (glass, aurora, toasts) en ambos temas, con tabla de razones calculadas (≥ 4.5:1 texto normal).
9. **CLS = 0** atribuible a efectos (medido con `PerformanceObserver` de `layout-shift` en `/`).
10. Verificación en código de que **todo** `@keyframes` o `transition` decorativo nuevo tiene su override con `prefers-reduced-motion: reduce`, y todo hover está bajo `@media (hover: hover)`.
11. Nada de esto se mergea, pushea ni deploya solo: el loop termina con todo commiteado localmente en `rai-feat-visual-premium`.

## 7. Reglas fijas heredadas (AGENTS.md / orchestrator.md)

- Rama `rai-feat-visual-premium` únicamente. `git push`, merge a `main` y deploy piden confirmación explícita de Reiner.
- `prisma migrate dev` prohibido; esta spec no necesita migraciones.
- Código final limpio: sin `console.log`/`debugger`, imports sin usar, código muerto ni comentarios de relleno.
- **Cero dependencias nuevas.** Cero colores fuera de la tabla de marca. Cero imágenes nuevas: si algún estado vacío pidiera ilustración o imagen de marca, se deja un hueco visible marcado como placeholder y se reporta; no se inventa ni se genera.
- Al cerrar cada rebanada y el bloque, actualizar `docs/planning/panel-control.html` con el resultado real (comandos y cifras, no "debería funcionar").
- **Deuda a registrar en el panel al cerrar:** pantallas que aún no adoptan `fx-*` (lista, una por ítem, para bloques posteriores) y cualquier efecto desactivado en tema claro, con el motivo.
