# Tutoriales de la Guía de Inicio (RAI Agency) — Sistema SVG

## ⚡ Sistema actual: SVG generados por código

Las diapositivas del tutorial **ya no son imágenes PNG generadas con Gemini**. Ahora son **SVG
generados por un script Python** (`scripts/generate-tutorial-slides.py`), 100% editables como
código y versionables en git.

- Cada paso (`id`) tiene `slide-1.svg` y `slide-2.svg` en `public/tutorials/<id>/`.
- El modal "Ver tutorial" en `/launchpad` los carga directo (`<img src=".../slide-N.svg">`).
- `public/tutorials/manifest.json` declara `version` y `slides` (=2) por paso, más `"format": "svg"`.

## Cómo actualizar un tutorial cuando cambia la UI

1. Abre `scripts/generate-tutorial-slides.py`.
2. Busca la entrada del `id` en el diccionario `DATA` (ej. `'crear-contacto': {...}`).
3. Edita `title`, `nav` (item del sidebar a resaltar), o el `heading` / `desc` / `cta` de cada
   diapositiva para reflejar el nuevo flujo.
4. Ejecuta:
   ```bash
   python3 scripts/generate-tutorial-slides.py
   ```
   Esto regenera **todos** los `slide-1.svg` / `slide-2.svg` (rápido, sin costo, sin internet).
5. Sube `version` del `id` correspondiente en `public/tutorials/manifest.json` (ej. de `1` a `2`)
   y actualiza `updatedAt`.
6. Verifica en el navegador: `/launchpad` → expande el paso → "Ver tutorial".

**Regla de oro**: el `id` es el contrato entre `CATEGORIES` (en `src/app/launchpad/page.tsx`),
`DATA` (en el script) y `manifest.json`. Si renombras un paso, renombra las tres referencias y la
carpeta `public/tutorials/<id>/`.

## Si se necesita más fidelidad visual (mockups reales)

El generador actual produce un layout esquemático (sidebar + topbar + tarjeta con texto y botón
resaltado), suficiente para guiar al usuario sin depender de servicios externos. Si en el futuro
se quiere un mockup más fiel a una pantalla real (ej. kanban con tarjetas, formulario completo),
se puede:

- Ampliar `render_slide()` en el script con nuevas plantillas (`render_kanban_slide`,
  `render_form_slide`, etc.) y asignar la plantilla por paso en `DATA`.
- O añadir un campo `template` por diapositiva en `DATA` para elegir el layout.

Todo sigue siendo código Python + SVG: editable directamente, sin imágenes externas, sin
regeneración manual con IA de imágenes.

## Notas

- El texto SVG está en español y usa la paleta de marca RAI (`#0A0A0F`, `#1A1A2E`, `#2A2A4A`,
  `#C9A84C` → `#E8B923`, `#F5F5F5`, `#8888AA`).
- Si un paso nuevo se agrega a `CATEGORIES`, agrégalo también a `DATA` en el script y a
  `manifest.json` (`version: 1, slides: 0` hasta correr el generador).
