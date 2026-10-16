# Diseño de efectos — registro canónico

Criterio rector: **efectos profesionales sin saturar**. Un efecto solo entra si comunica estado, da jerarquía o confirma una acción; nunca como adorno.

## Reglas duras

1. **Sin desenfoque**: nada de `backdrop-filter`, `filter: blur`, glassmorphism ni sombras difusas grandes de adorno.
2. **Solo `transform` y `opacity`** en animaciones. Única excepción: `padding`/`gap` en la transición de densidad.
3. Todo movimiento va dentro de `@media (prefers-reduced-motion: no-preference)`.
4. El hover va bajo `@media (hover: hover)`.
5. Colores con tokens `var(--rai-*)`; el tema claro (`[data-theme="light"]`) debe verse bien.
6. 100 % responsive.
7. Jamás leer `localStorage` en un inicializador de `useState` (hidratación): usar un efecto o un script en `<head>` (patrón de `data-sidebar` y `data-density` en `src/app/layout.tsx`).
8. Los botones propios necesitan `!important` para vencer los estilos globales de `button`.

## Estados

| Efecto | Estado | Motivo | Dónde vive |
|---|---|---|---|
| Shimmer de esqueleto | Adoptado | Indica carga sin saltos de diseño; barrido con `translateX`. | `.fx-shimmer`, `src/components/ui/Skeleton.tsx`, `src/styles/effects.css` |
| Puntos de estado con brillo sutil | Adoptado | Estado legible de un vistazo; el anillo que respira solo existe en `--live`. | `.fx-dot` (+ `--ok`, `--warn`, `--danger`, `--live`), `src/styles/effects.css` |
| Sombras de profundidad | Adoptado | Jerarquía visual en tres niveles, con desenfoque corto y sin halos. | `--fx-elev-1/2/3`, `.fx-elev-1/2/3`, `src/styles/effects.css` |
| Acciones al pasar el cursor sobre fila/tarjeta | Adoptado | Reduce ruido: las acciones aparecen con hover o foco; en táctil siempre visibles. | `.fx-reveal` + `.fx-reveal-actions`, `src/styles/effects.css` |
| Micro-interacciones de validación (check con rebote) | Adoptado (hecho) | Confirma la acción al instante. | Animación `fx-pop` en `src/app/globals.css` |
| Entrada escalonada | Adoptado (hecho) | Orden de lectura sin parpadeos. | Animación `fx-rise` en `src/app/globals.css` |
| Campos de formulario progresivos | Adoptado | Solo se muestran los campos que dependen de la elección previa. | `.fx-field-in` (entrada), `src/styles/effects.css`; la lógica condicional es de cada formulario |
| Selector de densidad | Adoptado | Cada persona ajusta la información por pantalla. | `html[data-density]`, `src/lib/density.ts`, `src/components/ui/DensityToggle.tsx`, pie de `Sidebar.tsx` y acción de la paleta |
| Pulso de sincronización | Adoptado | Avisa con un anillo fino dorado cuando una tarjeta se actualiza por detrás. | `.fx-sync` + `.is-syncing`, `src/styles/effects.css` |
| Paleta Cmd+K | Adoptado (hecho) | Navegación y acciones por teclado. | `src/components/layout/CommandPalette.tsx` |
| Anillo de clic | Adoptado (hecho) | Respuesta inmediata al clic o toque. | `src/components/ui/ClickFx.tsx` |
| Glassmorphism dinámico | Rechazado | Requiere desenfoque. | — |
| Sidebar con vidrio esmerilado | Rechazado | Requiere desenfoque. | — |
| Atenuación con desenfoque en tooltips guiados | Rechazado | Se mantiene la atenuación **sin** desenfoque. | `TourHost` |
| `mix-blend-mode` | Rechazado | Resultado impredecible entre temas claro y oscuro. | — |
| Cursor magnético | Rechazado | Satura y estorba la precisión del puntero. | — |
| Bento con expansión | Rechazado | Anima el layout (no solo `transform`/`opacity`). | — |
| Drag elástico | Rechazado | Satura; sin valor funcional. | — |
| Deslizamiento de cámara entre workspaces | Rechazado | Movimiento grande y mareante; satura. | — |
| Partículas en conectores | Rechazado | Adorno puro; coste de rendimiento. | — |
| Gauge con amortiguación | Rechazado | Adorno; un número claro basta. | — |
| Onda líquida de almacenamiento | Rechazado | Adorno; coste de rendimiento. | — |
| Halo biométrico | Rechazado | Halo difuso, contrario a «sin desenfoque». | — |
| Slider de auditoría | Rechazado | Satura; la auditoría se resuelve con una tabla. | — |
| Grafo de esquema | Rechazado | Satura; sin valor para el uso diario. | — |
| Sparklines en tablas | Pendiente | Requieren datos históricos por fila. | Futura fase |
| Panel lateral deslizante de edición | Pendiente | Requiere definir el patrón de edición por módulo. | Futura fase |
| FAB acoplable | Pendiente | Requiere definir las acciones globales. | Futura fase |
| Fuentes variables | Pendiente | Requiere cambiar la carga de tipografía. | Futura fase |

## Guía de uso para módulos

- **Carga**: `<SkeletonCard lines={3} />` o `<SkeletonLine width="60%" />` (`src/components/ui/Skeleton.tsx`). El contenedor lleva `aria-busy`; las líneas son `aria-hidden`.
- **Estado vacío**: `<EmptyState icon={…} title="…" text="…" steps={[…]} action={<button className="btn-primary">…</button>} />` (`src/components/ui/EmptyState.tsx`).
- **Punto de estado**: `<span className="fx-dot fx-dot--ok" role="img" aria-label="Conectado" />`.
- **Pulso de sincronización**: `className="card fx-sync"` y, al llegar datos nuevos, añadir `is-syncing` durante ~1,2 s. Para repetirlo, quitar la clase, forzar un reflujo y volver a añadirla.
- **Acciones al pasar el cursor**: contenedor `fx-reveal`, grupo de acciones `fx-reveal-actions`.
- **Densidad**: `comfortable` (por defecto) no cambia nada. `compact` y `spacious` reescriben el padding de `.card`, `td`/`th`, `.lp-item`, el `gap` de `.grid` y el tamaño de letra de `.table` (solo escritorio). La preferencia se guarda en `rai-density-v1` y se fija antes del primer pintado con un script de `<head>`. La transición suave se activa con `html.d-anim`, añadida tras el primer render.
