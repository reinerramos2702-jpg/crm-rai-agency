# Historial de entregas — CRM RAI Agency

Registro cronológico de lo que se entregó en cada bloque de trabajo. Una entrada por
bloque cerrado (con su PR abierto). No se mergea nada sin aprobación explícita de Reiner.

---

## 2026-08-29 — BLOQUE 0 · Renombrado de marca (PR 0 · rama `v2/renombrado-marca`)

**Qué se entregó**

- Renombrado completo de "RAI Content Engine" / `content-engine-mvp` → **CRM RAI Agency** / `crm-rai-agency`
  en todo el código, la UI, la metadata de paquete y la documentación del repo.
- Barrido de verificación oficial del Bloque 0 confirmado vacío.
- Corrección de 5 errores de TypeScript **preexistentes en `main`** que impedían cumplir
  la regla no negociable nº 7 (`npx tsc --noEmit` limpio antes de cerrar un bloque).

**Archivos tocados (resumen)**

| Área | Archivos |
|---|---|
| UI visible | `src/app/layout.tsx`, `src/app/page.tsx`, `src/components/layout/Sidebar.tsx` |
| HTML generado por API | `src/app/api/research/ads-library/route.ts` |
| Prompt de IA | `src/app/api/content-grids/[id]/chat/route.ts` |
| Metadata de paquete | `package.json`, `package-lock.json` (regenerado con `npm install`) |
| Infra | `vercel.json` (`NEXT_PUBLIC_APP_URL`) |
| Assets | `scripts/generate-tutorial-slides.py` + 44 SVG de `public/tutorials/` |
| Comentarios de cabecera | `prisma/schema.prisma`, `src/app/globals.css` |
| Documentación | `README.md`, `ROADMAP_AUTOMATIZACION.md`, `CLAUDE.md`, `MEMORY.md`, `CONTEXT.md`, `BRAND_GUIDE.md` |
| Fix tsc preexistente | `src/lib/workspace.ts`, `src/app/api/workspace/brand-doc/route.ts`, `src/app/api/payments/[id]/transition/route.ts` |

**Verificación**

- `npx tsc --noEmit` → exit 0
- `npm run build` → exit 0
- Barrido `grep -rniI "content-engine-mvp\|RAI Content Engine\|Content Engine MVP"` sobre
  `*.ts *.tsx *.json *.md` → vacío

**Pendiente / decisión de Reiner** — ver sección "Propuestas que NO ejecuté" del PR 0.
