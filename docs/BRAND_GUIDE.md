# RAI Agency — Guía de Marca

Guía de referencia rápida para mantener consistencia visual en todo el CRM (Contenido, Marketing, Facturación, Conversaciones y futuros módulos).

## 1. Logo

- Concepto: lettering "RAI" en degradado dorado, con elementos cósmicos/orgánicos (hojas, estrellas) sobre fondo oscuro. Subtítulo "AGENCY" en mayúsculas, letter-spacing amplio.
- Versión actual: fondo oscuro incluido en la imagen — pendiente versión con fondo transparente + marco dorado resplandeciente (glow) para uso sobre superficies oscuras (`--rai-black` / `--rai-dark`).
- Para procesar el logo (quitar fondo + agregar marco dorado), súbelo de nuevo en esta sesión — el archivo original no quedó disponible tras el reinicio.
- Versión simplificada (icono): caja 36×36px, `border-radius: 8px`, fondo `linear-gradient(135deg, #C9A84C, #E8B923)`, ícono `Zap` (lucide-react) en `#0A0A0F`. Usada en el sidebar.

## 2. Paleta de colores

| Token | Hex | Uso |
|---|---|---|
| `--rai-black` | `#0A0A0F` | Fondo general |
| `--rai-dark` | `#12121A` | Sidebar, paneles |
| `--rai-card` | `#1A1A2E` | Tarjetas, inputs |
| `--rai-border` | `#2A2A4A` | Bordes, separadores |
| `--rai-gold` | `#C9A84C` | Color de marca primario |
| `--rai-gold-br` | `#E8B923` | Acento brillante / hover |
| `--rai-gold-dim` | `#8A6F30` | Detalles sutiles |
| `--rai-text` | `#F5F5F5` | Texto principal |
| `--rai-muted` | `#8888AA` | Texto secundario |
| `--rai-success` | `#2EC4B6` | Estados positivos |
| `--rai-error` | `#E63946` | Errores, alertas |
| `--rai-warning` | `#FF9F1C` | Advertencias, "por expirar" |
| `--rai-purple` | `#7B5EA7` | Estados "en proceso" (IA) |

Gradiente de marca: `linear-gradient(135deg, #C9A84C 0%, #E8B923 100%)` — usado en logo, botones primarios y `.gradient-text`.

## 3. Tipografía

- Fuente: **Inter** (pesos 300–800), fallback `Geist`, sans-serif.
- Tamaño base: 14px, line-height 1.6.
- Headings: `h1` 24px/700, `h2` 18px/600, `h3` 15px/600.
- Labels: 11px, uppercase, letter-spacing 0.08em, color `--rai-muted`.

## 4. Bordes y sombras

- Radios: `sm` 8px, `md` 12px, `lg` 16px, `xl` 24px.
- Sombra dorada (focus): `0 0 0 2px rgba(201,168,76,0.3)`.
- Sombra de tarjeta: `0 4px 24px rgba(0,0,0,0.4)`.

## 5. Componentes clave (ya implementados en `globals.css`)

- `.card`, `.panel` — contenedores estándar con borde `--rai-border` y hover dorado sutil.
- `.badge-gold/success/warning/error/muted/purple` — estados (programado, activo, pendiente, error, sin configurar, en proceso IA).

### 5.1 Sistema de botones — jerarquía + "borde reluciente" (jun 2026)

Todos los botones llevan SIEMPRE un borde con glow (`box-shadow` tipo anillo + resplandor) para que sea inconfundible que son clicables, sin excepción ni en ningún módulo. La intensidad/color del glow indica el nivel de importancia:

| Clase | Nivel | Uso | Look |
|---|---|---|---|
| `.btn-primary` | 1 — Principal | La acción más importante de la pantalla/sección (Crear, Guardar, Activar, Reservar). Máximo 1 visible por bloque. | Relleno degradado dorado, glow dorado fuerte. |
| `.btn-secondary` | 2 — Apoyo | Acciones de apoyo siempre visibles (Editar, Filtrar, Exportar, Conectar, Configurar). | Fondo dorado tenue + borde dorado, glow dorado medio. |
| `.btn-ghost` | 3 — Terciario | Acciones de fila/lista, iconos, "Cancelar" en modales, navegación secundaria. | Transparente, borde dorado tenue, glow sutil. |
| `.btn-danger` | 4 — Peligro | Eliminar, desactivar, cancelar irreversible — siempre con confirmación. | Rojo, glow rojo. |
| `.btn-icon` | — | Modificador cuadrado (1:1) para botones de solo ícono, combinar con un nivel. | — |

Reglas:
1. Cualquier `<button>` sin clase de nivel cae automáticamente en el estilo "ghost" (fallback CSS) — nunca queda sin glow.
2. Jerarquía visual = jerarquía de importancia: si dos acciones son igual de relevantes, ambas pueden ser `.btn-secondary`; si una es claramente la principal, esa es la única `.btn-primary` del bloque.
3. Tamaños: `.btn-sm` (filas de tabla), default, `.btn-lg` (CTAs de pantallas vacías/onboarding).
4. Aplicar este sistema a TODO módulo nuevo y, retroactivamente, a los existentes (Calendarios, Marketing, Facturación, Conversaciones, Campaign, Launchpad, Dashboard, Settings).

## 6. Voz y tono (copy)

- Español impecable, directo, sin relleno.
- Usar siempre "IA" (no "AI").
- Frases de acción cortas: "Generar Plan Maestro", "Procesar Batch", "Conectar".
- Estados vacíos: tono motivador y claro ("Todavía no hay X. [acción para crear el primero]").

## 7. Aplicación a nuevas secciones

Toda sección nueva (Marketing, Facturación, Conversaciones, Automatización, Sitios, etc.) debe:

1. Usar `.container` + `h1`/`muted` para el header.
2. Tabs de navegación interna con `.primary` (activo) / `.ghost` (inactivo).
3. Contenido en `.card` dentro de `.grid.grid-3` (o `grid-2`/`grid-4` según densidad).
4. Estados con `.badge-*` consistentes con la tabla de colores.
5. Mensajes "en construcción" con ícono `ExternalLink` + texto `.muted` al pie de página.

## 8. Pendientes de marca

- [ ] Logo con fondo transparente + marco dorado resplandeciente (requiere re-subir imagen original).
- [ ] Mascota / asistente IA (robot 3D) — usar paleta dorada como acento, fondo oscuro/transparente.
- [ ] Versión del logo para favicon / app icon (cuadrada, sin subtítulo).
