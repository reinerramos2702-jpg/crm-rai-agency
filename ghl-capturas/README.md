# ghl-capturas/ — Capturas de referencia de GoHighLevel

Carpeta de capturas que Claude lee para replicar el frontend de GHL pantalla por pantalla.
**No se trackea en git** (ver `.gitignore`). Es archivo de referencia local.

---

## Convención de carpetas

Una carpeta por módulo, prefijada con número para mantener orden GHL en el sidebar:

```
00-sidebar/                      ← nav completo GHL (referencia de orden global)
01-dashboard/
02-launchpad/                    ✅ replicado
03-contactos/                    ✅ replicado
04-clientes-potenciales/         ✅ replicado
05-pasajeros/                    ⏳ pendiente
06-pagos/                        ⏳ pendiente
07-sitios/                       ⏳ pendiente
08-contenido-multimedia/         ⏳ pendiente
09-reputacion/                   ⏳ pendiente
10-informes/                     ⏳ pendiente
11-marketplace/                  ⏳ pendiente
12-agentes-ia/                   (refinar Bot Goals)
13-conversaciones/
14-calendarios/
15-automatizacion/
16-marketing/
17-facturacion/
```

---

## Convención de nombres de archivo

Dentro de cada carpeta, numerar en orden lógico de aparición en GHL:

```
01-vista-principal.png            ← pantalla por defecto al entrar al módulo
02-tab-<nombre>.png               ← cada sub-tab del top o de la izquierda
03-modal-crear.png                ← modal de "Añadir / Nuevo"
04-modal-editar.png               ← modal de edición si difiere
05-drawer-personalizar.png        ← drawer lateral derecho si existe
06-filtros-avanzados.png          ← panel/popover de filtros
07-empty-state.png                ← cómo se ve sin datos (importante: replicamos sin demo)
08-detalle-fila.png               ← vista detalle de un ítem (si la tiene)
09-bulk-actions.png               ← barra que aparece al seleccionar varios
10-context-menu.png               ← menú ⋮ con sus opciones desplegadas
```

Si una pantalla tiene scroll largo → 2 capturas (`01a-above-fold.png`, `01b-below-fold.png`) en lugar de stitch.

---

## Reglas de captura (para que el replicado salga bien al primer intento)

1. **Pantalla completa** — incluir sidebar + topbar + contenido. Necesario para que yo escale proporciones.
2. **Un estado por captura** — no mezclar (vacío vs con datos) en la misma imagen.
3. **Sin recortar bordes** — los radios, sombras y separadores importan.
4. **Modales / drawers / popovers** → captura con el elemento abierto Y con la pantalla de fondo visible (no solo el modal recortado).
5. **Hover / tooltip** → si el diseño cambia al hacer hover, captura del estado hover también (`01-vista-principal-hover.png`).
6. **Tema oscuro o claro** → da igual cuál uses en GHL. Yo siempre aplico paleta RAI (dorado oscuro). Lo que importa es la **estructura y composición**, no los colores de GHL.

---

## Flujo operativo

1. Tú capturas el módulo entero a su carpeta (ej. `05-pasajeros/`).
2. Me dices: **"replica /pasajeros — carpeta `ghl-capturas/05-pasajeros/`"**.
3. Yo leo todas las imágenes de la carpeta en una sola pasada.
4. Replico módulo completo (vista principal + tabs + modales + drawer + empty state).
5. Actualizo `CONTEXT.md` tabla "Estado actual de módulos" + bullet en historial.
6. Marco la carpeta como `✅ replicado` en este README.

---

## Estado actual

| Módulo | Carpeta | Capturas | Estado replica |
|---|---|---|---|
| Sidebar (referencia) | `00-sidebar/` | ⏳ | n/a |
| Dashboard | `01-dashboard/` | ⏳ | ✅ ya replicado (antes del flujo capturas) |
| Launchpad | `02-launchpad/` | ⏳ | ✅ replicado (jun 18) |
| Contactos | `03-contactos/` | ⏳ | ✅ replicado (jun 18) |
| Clientes Potenciales | `04-clientes-potenciales/` | ⏳ | ✅ replicado (jun 18, 5 caps) |
| **Pasajeros** | `05-pasajeros/` | ⏳ | ⏳ esqueleto — **siguiente** |
| Pagos | `06-pagos/` | ⏳ | ⏳ esqueleto |
| Sitios | `07-sitios/` | ⏳ | ⏳ esqueleto |
| Contenido multimedia | `08-contenido-multimedia/` | ⏳ | ⏳ esqueleto |
| Reputación | `09-reputacion/` | ⏳ | ⏳ esqueleto |
| Informes | `10-informes/` | ⏳ | ⏳ esqueleto |
| Marketplace | `11-marketplace/` | ⏳ | ⏳ esqueleto |
| Agentes IA | `12-agentes-ia/` | ⏳ | ✅ replicado (refinable con caps GHL Bot Goals) |
| Conversaciones | `13-conversaciones/` | ⏳ | ✅ ya replicado |
| Calendarios | `14-calendarios/` | ⏳ | ✅ ya replicado |
| Automatización | `15-automatizacion/` | ⏳ | ✅ ya replicado |
| Marketing | `16-marketing/` | ⏳ | ✅ ya replicado (datos vacíos) |
| Facturación | `17-facturacion/` | ⏳ | ✅ ya replicado (datos vacíos) |

**Leyenda capturas:** ⏳ = vacía · 📸 = tiene capturas pero no replicado · ✅ = replicado

---

## Notas

- Capturas pueden ser `.png`, `.jpg` o `.webp`. Prefiero PNG por calidad.
- Si una captura no es clara, anótalo en `_notas.md` dentro de la subcarpeta.
- Si GHL agrega features nuevos después → re-captura y avísame para actualizar.
