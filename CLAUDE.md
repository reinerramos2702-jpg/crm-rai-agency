# CLAUDE.md — Instrucciones para Claude (Cowork / Claude Code)

> Lee este archivo primero. Siempre. Antes de tocar cualquier código.

---

## 0. ANTES DE TODO (migración de cuentas — jun 19 2026 en adelante)

**Este proyecto vive en GitHub.** Si estás en una cuenta nueva de Claude (web/Cursor):
1. Verifica el repo clonado: `crm-rai-agency/` con todos los archivos.
2. La carpeta umbrella `RAI Agency/` contiene un `MEMORY.md` y un `CLAUDE.md` adicionales (cross-project) — léelos si existen.
3. **Nunca** crees handoff files nuevos. El estado vive en los documentos de la tabla de fuentes de verdad (abajo) + los 2 umbrella.

## 0.1 Fuentes de verdad vigentes (actualizado 10 oct 2026)

| Qué | Dónde | Nota |
|---|---|---|
| Reglas permanentes del agente (Git, bloques de respuesta, cierre) | `AGENTS.md` | Manda sobre cualquier otro documento |
| Estado actual y punto de reanudación | `docs/ESTADO-SESION.md` | Reemplaza el "SIGUIENTE PASO" de `CONTEXT.md` |
| Backlog único y decisiones | `docs/planning/panel-control.html` | `ROADMAP.md` fue eliminado |
| Requisitos de un bloque en curso | `docs/SPEC-<bloque>.md` | Hoy: `docs/SPEC-login-registro-ui.md` |
| Stack, convenciones, modelos, módulos | `docs/MEMORY.md` | Solo cambia si cambia la arquitectura |
| Historia anterior (jun-sep 2026) | `docs/CONTEXT.md` | Solo lectura histórica; no refleja el estado actual |
| Arquitectura del ecosistema (Generador, Automatización, Multimedia, Sitios Web), ADR y hoja de ruta | `docs/ARQUITECTURA-ECOSISTEMA-CRM.md` | Todo modelo nuevo es *Propuesta* hasta que Reiner lo apruebe |
| Mapa de agentes, tecnologías y base de conocimiento reutilizable (efectos, prácticas, legal) | `docs/planning/roadmap-agentes-rai.html` | Se actualiza al adoptar o descubrir una técnica; es la referencia que se pasa a proyectos nuevos |
| Efectos adoptados y rechazados del CRM | `docs/DISENO-EFECTOS.md` | Reglas duras: sin desenfoque, solo `transform`/`opacity` |
| Buenas prácticas de Claude Code (seguridad, secretos, cierre) | `docs/BUENAS-PRACTICAS-CLAUDE-CODE.md` | v1.5 · el agente nunca lee ni imprime valores de secretos (§13) |
| Código y documentos sin uso, pendientes de revisión | `_revisar-obsoletos/` | Nada se borra sin el «sí» de Reiner; ver su `LEEME.md` |

## 1. Inicio de sesión — protocolo obligatorio

1. Lee `AGENTS.md` (reglas permanentes) y `docs/ESTADO-SESION.md` (estado y punto de reanudación).
2. Lee `docs/MEMORY.md` (stack, convenciones, modelos de datos, reglas críticas).
3. Revisa `docs/planning/panel-control.html` (backlog y decisiones) y, si hay un bloque en curso, su `docs/SPEC-<bloque>.md`.
4. Verifica el estado real del repo (`git status`, `git log`) antes de confiar en cualquier documento: el código manda sobre lo escrito.
5. Lee `ghl-capturas/README.md` solo si la tarea es replicar un módulo de GHL.
6. No preguntes "¿en qué quieres trabajar?" — la sección "Pendiente" de `docs/ESTADO-SESION.md` define el siguiente paso. Arráncalo, respetando que push, merge, deploy, migraciones remotas y RLS requieren aprobación explícita.

### Flujo de replicación GHL (Fase 1)

- El usuario captura cada módulo de GHL a `ghl-capturas/<NN>-<modulo>/` con capturas numeradas (`01-vista-principal.png`, `02-tab-X.png`, `03-modal-crear.png`, etc.).
- Al recibir orden tipo **"replica /pasajeros — carpeta `ghl-capturas/05-pasajeros/`"**:
  1. Lee TODAS las imágenes de la carpeta en una sola pasada (no de a una).
  2. Replica el módulo COMPLETO en una sesión: vista principal + sub-tabs + modales + drawer + empty states.
  3. Estética RAI (dorado oscuro), iconos `lucide-react`, clases `globals.css`. No copies colores GHL.
  4. Sin lógica, sin DB, sin APIs nuevas. Botones → `toast('Próximamente')`. Forms renderizan pero no envían.
  5. Empty states obligatorios ("aún no tienes X").
  6. Si es módulo nuevo grande → actualiza `MEMORY.md` también (tabla §4 Módulos del CRM).
  7. Actualiza `docs/ESTADO-SESION.md` y el item correspondiente en `docs/planning/panel-control.html` (y marca ✅ en `ghl-capturas/README.md`).

## 2. Cierre de sesión — actualizar memoria

Al terminar cualquier sesión con cambios significativos:
1. Actualiza `docs/ESTADO-SESION.md`: qué se hizo, decisiones, pendiente en orden de ejecución (protocolo "New session" de `AGENTS.md`).
2. Actualiza el item del bloque en `docs/planning/panel-control.html` con resultados reales (no "debería funcionar").
3. Actualiza `docs/MEMORY.md` solo si cambió algo estructural (nuevo módulo, nuevo modelo Prisma, nueva convención).
4. No crees archivos de handoff nuevos. No dupliques fuentes de verdad.

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
- Código o documentación sin uso: se mueve a `_revisar-obsoletos/` conservando su ruta (con `LEEME.md`), nunca se deja como código muerto ni se borra sin autorización. Clean code, sin `TODO` ni parches temporales, y fronteras claras entre módulos (ver `docs/ARQUITECTURA-ECOSISTEMA-CRM.md` §2).
- Archivos temporales de trabajo → `/tmp/` (sandbox), no al proyecto.
- Logs, builds: ignorados (`.next/`, `node_modules/`, `*.log`, `*.tsbuildinfo`).

## 4. Verificación antes de cerrar cualquier sesión

```bash
# En Windows PowerShell (no en sandbox):
cd crm-rai-agency
npx tsc --noEmit   # debe salir limpio, exit 0
```

Si hay errores de TypeScript, resolverlos antes de cerrar. No marcar tarea como completada si `tsc` falla.

## 5. Cómo iniciar nueva sesión (instrucción para el usuario)

Pega esto al empezar un chat nuevo:

> "Lee CLAUDE.md, AGENTS.md y docs/ESTADO-SESION.md en crm-rai-agency. Verifica el estado real con git. Luego continúa desde la sección Pendiente de ESTADO-SESION.md."

---

*Este archivo no se modifica entre sesiones — solo si cambian las reglas del proyecto.*
