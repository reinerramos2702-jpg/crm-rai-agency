# Buenas Prácticas — CRM RAI Agency
> Documento vivo. Consultarlo antes de cada sesión de Cowork o Claude Code sobre este proyecto.
> Fuentes: reglas propias fijadas en sesiones Cowork/Claude Code (24-31 ago, 1 sep 2026) + adaptado de `CLAUDE-CODE-NOTEBOOK-MAESTRO.md` (curso MoureDev, 13 ago 2026, guardado íntegro en esta misma carpeta como referencia completa).
> Actualizar esta sección 0 cada vez que se fije una regla nueva — es la que de verdad se sigue en el día a día.

---

## 0. Reglas fijas de este proyecto (no negociables)

**Git / repo / deploy**
- Nunca tocar `main` directamente — todo el trabajo vive en rama propia o worktree (`fase-1/estabilizacion`, `v2/...`, etc.)
- Nunca merge a `main` ni deploy a producción (`wrangler deploy` / Vercel prod) sin aprobación explícita de Reiner. Si el CLI pregunta, default = "todavía no".
- Cada bloque de trabajo termina en un Pull Request abierto esperando revisión — nunca se auto-mergea, sin importar cuánto tiempo lleve corriendo.
- Nunca borrar nada (rama, archivo, migración, dato) sin dejarlo documentado como propuesta en el PR — la decisión de borrar es de Reiner.
- Antes de cerrar cada bloque: `npx tsc --noEmit` limpio + `npm run build` exit 0. Si no compila, no se avanza al siguiente bloque.
- Actualizar `historial-entregas.md` (fecha + qué se entregó) al cerrar cada bloque.

**Multi-tenant / seguridad**
- Aislamiento por cliente: cada tenant con sus propias credenciales, nunca reutilizar entre tenants ni hardcodear datos reales de un cliente.
- Nunca pegar API keys/tokens reales en código o commits — todo vía variables de entorno o campos cifrados en DB (`src/lib/crypto.ts`, AES-256-GCM).
- Ninguna funcionalidad del CRM se nombra ni se limita a un cliente específico (ej. el caso Belloanam que originó el módulo de asesores) — todo se construye genérico, disponible para cualquier tenant con el mismo problema.

**Generación de contenido**
- Nunca generar contenido pago (imagen/video IA) sin decir el costo estimado antes y esperar aprobación explícita.
- Video (Higgsfield/Seedance) requiere la palabra literal **"EDU"** de Reiner — enforced a nivel de permisos de herramienta.
- Las imágenes las genera Reiner mismo en DALL-E/ChatGPT con el prompt que Cowork redacta — nunca las genera Claude directo.
- Cero contenido fabricado: nombres, fotos, cifras o reseñas inventadas.

**Flujo de trabajo (los 3 agentes)**
1. **Chat externo (Claude.ai)** — planeación y estrategia, no código.
2. **Cowork** — edita archivos en la carpeta vía puente remoto, organiza, supervisa lo que hace Claude Code. NO hace git directo (el puente no resuelve el gitdir del worktree en Windows).
3. **Claude Code (terminal, nativo en la máquina)** — recibe prompts ya preparados, ejecuta, hace git/deploy real.
- Relay entre agentes: bloques "Para pegar en Claude Code" copiados literal de un chat a otro.
- Formato de respuesta fijo en Cowork: siempre 2 bloques — Información general / Tareas a ejecutar (skill `bloques-info-tareas`).

---

## 1. Bucle agéntico
Exploración → Planificación → Ejecución → Verificación → Fin. Siempre en ese orden, sin saltar fases (ver `MASTER-PROMPT-V2.md`, sección "Orden de trabajo").

## 2. Modo de edición para este proyecto
**Plan mode** antes de cualquier tarea compleja o de tocar un módulo por primera vez → revisar/modificar el plan → aprobar → ejecutar en manual o accept edits.

**Auto mode / `/goal` SÍ se usa en este proyecto** — actualizado 3 sep 2026. Lo que consume auto mode acá son tokens de la cuenta Pro de Reiner, no dinero real de cliente ni facturación — no hay razón para restringirlo por eso. Corridas nocturnas largas vía `/goal` (ver `v3.0-master-prompt/MASTER-PROMPT-V3-NOCTURNO.md`) son el modo normal de trabajo para bloques grandes, siempre con estos guardarraíles fijos (no negociables, auto mode no los saltea):
- Nunca merge a `main` ni deploy a producción sin aprobación explícita de Reiner — cada bloque cierra en PR abierto, nunca auto-mergeado.
- Nunca borrar nada sin documentarlo como propuesta en el PR.
- `tsc --noEmit` + `build` limpios antes de cerrar cada bloque.
- Delegar en subagentes (4-5 en paralelo) está permitido cuando el bloque tenga partes realmente independientes (módulos/archivos distintos) — nunca dos subagentes editando el mismo archivo o la misma capa arquitectónica a la vez.

**Lo único que sigue prohibido sin aprobación previa explícita** (esto sí es dinero real, no tokens): deploy a producción, cualquier gasto de contenido pago con IA (imagen/video), y cualquier acción que toque facturación o datos financieros reales de un cliente. Auto mode no es excusa para saltarse esa aprobación en esos casos puntuales — todo lo demás (construir, refactorizar con criterio, abrir PRs, correr toda la noche) corre libre en auto mode.

## 3. Contexto y sesión
- `/context` antes de tareas largas — **40-50% ocupado = empiezan alucinaciones**, ojo especialmente en sesiones largas de Claude Code construyendo un bloque completo.
- `/clear` para tarea nueva sin relación. `/compact` si el chat importa pero se está llenando.
- `@archivo` cuando sepas exactamente qué tocar — no dejar que lea todo el repo (ahorra tokens, evita alucinación).
- Doble `Esc` / `/rewind` para deshacer código y conversación si algo sale mal y no se había comiteado con Git todavía.

## 4. Memoria del proyecto
- `CLAUDE.md` corto — solo lo esencial (rol, reglas fijas de la sección 0, stack, contexto de negocio). Uno gigante penaliza cada ejecución.
- Reglas secundarias específicas (branding visual, convenciones JS, accesibilidad) van en `.claude/rules/`, no en el `CLAUDE.md` principal — se cargan solo cuando la tarea las necesita.
- `MEMORY.md` / `CONTEXT.md` / `ESTADO.md` (dentro del repo real, no en esta carpeta) — historial de sesiones, se leen primero en cada sesión nueva. Ya confirmado como fuente de verdad en `COWORK-BRIEFING.md`.

## 5. Modelos y esfuerzo
- **Sonnet**: día a día. **Opus**: tareas complejas — default para trabajo serio de este proyecto (ver master prompt v2.0: "Abre Claude Code (Opus) DENTRO del worktree"). **Fable**: solo si hace falta lo máximo.
- `/model` + `/effort` según complejidad real de la tarea, no siempre el más caro.

## 6. Skills, comandos, MCP — higiene de contexto
- Desactivar skills/MCPs que no se usen en este proyecto — cada uno cuesta contexto.
- Comando (`.claude/commands/`) = se dispara solo si escribes `/nombre`. Skill (`.claude/skills/`) = se dispara sola si detecta que aplica (ej. `git-buenas-practicas` de RAI Agency, ya activa siempre que se toque código de cliente).
- Subagentes: dominar 1 bien (ej. "Reviewer" solo lectura, Opus, auditoría) antes de crear varios. Agent teams = nivel avanzado, no prioridad ahora para este proyecto.

## 7. Convenciones técnicas no negociables del repo
(de `MASTER-PROMPT-V2.md`, sección 1 — vigentes en todo el código nuevo)
- CSS de `globals.css` — nada de librerías de componentes nuevas.
- `lucide-react` para íconos, `react-hot-toast` para notificaciones.
- `runtime = 'nodejs'` en rutas API que lo necesiten.
- `export const dynamic = 'force-dynamic'` en TODA ruta API que toque Prisma/DB — el bug del PR #1 fue justo por saltarse esto, no repetir.
- `requireRole` → `isRoleContext` para control de acceso.
- Params dinámicos como `Promise<{id}>` con `await params` (estilo Next 14/15).
- Dependencias npm nuevas: libre de instalar cuando la funcionalidad lo requiera, con criterio (populares, bien mantenidas, sin dependencias sospechosas) — justificar brevemente en el PR.

## 8. Checklist rápido antes de cada sesión
- [ ] Leer `ESTADO.md` / `CONTEXT.md` / `historial-entregas.md` del repo real antes de asumir en qué quedó todo
- [ ] Exploración → Planificación → Ejecución → Verificación, en ese orden
- [ ] Prompt específico — cuanto mejor el guardarraíl, menos alucina
- [ ] Modo plan si la tarea es compleja o es primera vez que se toca ese módulo
- [ ] `@archivo` en vez de dejar que lea todo el repo
- [ ] Git obligatorio — rewind/checkpoints es un extra, no un sustituto; rama por feature, nunca directo a main
- [ ] `/context` antes de tareas largas
- [ ] `tsc --noEmit` + `build` limpios antes de cerrar bloque
- [ ] `historial-entregas.md` actualizado al cerrar bloque
- [ ] Ninguna feature nueva nombrada o limitada a un cliente específico
- [ ] Nada pago (imagen/video IA) sin costo estimado + aprobación previa
- [ ] Nada se mergea/deploya a producción sin aprobación explícita

## 9. Plantilla CLAUDE.md de este proyecto
(para rellenar en el repo real `crm-rai-agency`, no en esta carpeta de planeación)
```markdown
# CRM RAI Agency
Rol: agente de desarrollo Full-Stack sobre el CRM multi-tenant de RAI Agency (Next.js 14 + Prisma + Supabase).
Reglas fijas: ver sección 0 de docs/BUENAS-PRACTICAS-CRM.md — nunca main directo, nunca deploy sin aprobación, nunca borrar sin documentar, aislamiento por tenant.
Stack: Next.js 14 App Router + TypeScript + Prisma + Postgres (Supabase) + BullMQ + Upstash Redis + Cloudflare R2 + Vercel AI SDK.
Contexto de negocio: CRM vendible a negocios ($937.47 fijo, incluye capacitación 2-3 meses + soporte 1 año). Multi-tenant, un solo deploy sirve a todos los clientes.
Restricciones: sin librerías de componentes nuevas fuera de globals.css; lucide-react + react-hot-toast; dynamic = 'force-dynamic' en toda ruta API con Prisma.
```

## 10. Referencia completa
El notebook original del curso (comandos, hooks, plugins, automatización 24/7, RAG vs Obsidian, etc.) queda íntegro en `docs/CLAUDE-CODE-NOTEBOOK-MAESTRO.md` para consulta — este documento es el resumen aplicado y priorizado para trabajar en este proyecto específico.
