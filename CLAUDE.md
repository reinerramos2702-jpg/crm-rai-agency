# CLAUDE.md — Instrucciones para Claude (Cowork / Claude Code)

> Lee este archivo primero. Siempre. Antes de tocar cualquier código.

---

## 0. ANTES DE TODO (migración de cuentas — jun 19 2026 en adelante)

**Este proyecto vive en GitHub.** Si estás en una cuenta nueva de Claude (web/Cursor):
1. Verifica el repo clonado: `content-engine-mvp/` con todos los archivos.
2. La carpeta umbrella `RAI Agency/` contiene un `MEMORY.md` y un `CLAUDE.md` adicionales (cross-project) — léelos si existen.
3. **Nunca** crees handoff files nuevos. Todo va en estos 3 docs + los 2 umbrella.

## 1. Inicio de sesión — protocolo obligatorio

1. Lee `MEMORY.md` completo (stack, convenciones, modelos de datos, reglas críticas).
2. Lee `CONTEXT.md` completo (estado actual del proyecto, última sesión, siguiente paso).
3. Lee `ghl-capturas/README.md` (estructura de capturas de referencia GHL + estado por módulo).
4. Revisa la sección "▶️ SIGUIENTE PASO" en `CONTEXT.md` — eso es lo que toca hacer.
5. No preguntes "¿en qué quieres trabajar?" — el siguiente paso ya está definido. Arráncalo.

### Flujo de replicación GHL (Fase 1)

- El usuario captura cada módulo de GHL a `ghl-capturas/<NN>-<modulo>/` con capturas numeradas (`01-vista-principal.png`, `02-tab-X.png`, `03-modal-crear.png`, etc.).
- Al recibir orden tipo **"replica /pasajeros — carpeta `ghl-capturas/05-pasajeros/`"**:
  1. Lee TODAS las imágenes de la carpeta en una sola pasada (no de a una).
  2. Replica el módulo COMPLETO en una sesión: vista principal + sub-tabs + modales + drawer + empty states.
  3. Estética RAI (dorado oscuro), iconos `lucide-react`, clases `globals.css`. No copies colores GHL.
  4. Sin lógica, sin DB, sin APIs nuevas. Botones → `toast('Próximamente')`. Forms renderizan pero no envían.
  5. Empty states obligatorios ("aún no tienes X").
  6. Si es módulo nuevo grande → actualiza `MEMORY.md` también (tabla §4 Módulos del CRM).
  7. Actualiza `CONTEXT.md` (tabla "Estado actual" + bullets sesión + marca ✅ en `ghl-capturas/README.md`).

## 2. Cierre de sesión — actualizar memoria

Al terminar cualquier sesión con cambios significativos:
1. Actualiza `CONTEXT.md`: agrega la sesión al historial, marca tareas completadas, actualiza el "SIGUIENTE PASO".
2. Actualiza `MEMORY.md` solo si cambió algo estructural (nuevo módulo, nuevo modelo Prisma, nueva convención).
3. No crees archivos de handoff nuevos. No dupliques. Todo va en estos 3 archivos.

## 3. Reglas de código — no negociables

### UI / Frontend
- CSS global en `src/app/globals.css` — NUNCA usar el componente library en `src/components/ui/`. Las páginas de features usan clases CSS directas (`.card`, `.btn-primary`, etc.). Ver lista completa en MEMORY.md § Clases CSS.
- Iconos: `lucide-react` v0.400.0 únicamente.
- Toasts: `react-hot-toast` (`import toast from 'react-hot-toast'`).
- Sin gráficas instaladas — usar SVG puro (patrón: `src/app/agentes-ia/page.tsx` → `LineChart`).
- Componentes cliente: `'use client'` al tope. Nunca importar `src/lib/llm-providers.ts` en cliente — usar el const local `LLM_PROVIDERS` (patrón en `generador-imagenes/[id]/page.tsx`).

### API routes
- Siempre: `export const runtime = 'nodejs'`
- Params dinámicos: `{ params }: { params: Promise<{ id: string }> }` → obligatorio `await params`
- Auth + roles: `requireRole(req, [...])` → `isRoleContext(ctx)` → si no, retornar `ctx`
- Respuestas error: `NextResponse.json({ error: '...' }, { status: NNN })`

### Prisma / DB
- **NUNCA correr `npx prisma generate`, `prisma migrate dev/status` desde el sandbox Linux** sobre el mount de Windows. Corrompe el binario de Prisma engine.
- Workaround para generate: copiar `node_modules/{.prisma,@prisma,prisma}` + `prisma/` + `.env` a `/tmp/gen`, correr ahí, copiar resultado de vuelta con `cp -rf`.
- Migraciones: crear el SQL manualmente en `prisma/migrations/<timestamp>_<name>/migration.sql` y actualizar `prisma/schema.prisma`. El usuario corre `npx prisma migrate deploy` + `npx prisma generate` en Windows PowerShell.
- Acceso al workspace: `ctx.workspace.id`, usuario: `ctx.auth.userId`.

### Organización de archivos
- Sin duplicar archivos. Sin crear READMEs no solicitados.
- Archivos temporales de trabajo → `/tmp/` (sandbox), no al proyecto.
- Logs, builds: ignorados (`.next/`, `node_modules/`, `*.log`, `*.tsbuildinfo`).

## 4. Verificación antes de cerrar cualquier sesión

```bash
# En Windows PowerShell (no en sandbox):
cd content-engine-mvp
npx tsc --noEmit   # debe salir limpio, exit 0
```

Si hay errores de TypeScript, resolverlos antes de cerrar. No marcar tarea como completada si `tsc` falla.

## 5. Cómo iniciar nueva sesión (instrucción para el usuario)

Pega esto al empezar un chat nuevo:

> "Lee CLAUDE.md, MEMORY.md y CONTEXT.md en content-engine-mvp. Luego continúa desde el SIGUIENTE PASO definido en CONTEXT.md."

---

*Este archivo no se modifica entre sesiones — solo si cambian las reglas del proyecto.*
