# MASTER PROMPT NOCTURNO — CRM RAI Agency v3.2
> Corre en modo `/goal` durante horas, sin supervisión activa de Reiner (él no duerme, pero no está frente al terminal). Construido en Cowork el 1 sep 2026, sobre las decisiones de la sesión de esa noche. **Revisado 1 sep tras auditoría técnica de Reiner**: se agregó una fase de arquitectura obligatoria antes de código (Bloque 0.5), reglas duras de aislamiento multi-tenant vía capa repository/service, RBAC formal, capa centralizada de IA con logging, testing obligatorio por bloque, migraciones Prisma seguras, auditoría de acciones, y disciplina de estructura de carpetas. El Bloque 2 original se partió en 2A/2B por ser demasiado ambicioso para una noche. **Revisado de nuevo 1 sep (segunda ronda)**: se agregaron rieles de ejecución interna — freno a refactors masivos, Definición de Terminado por bloque, disciplina de datos demo/errores/integraciones externas/webhooks/costos de IA, fases internas obligatorias para el Bloque 1, y un Principio de Evolución del Producto que prioriza arquitectura estable sobre cantidad de funcionalidades. **Actualizado 6 sep 2026:** Bloque 0 y 0.5 mergeados; Bloque 1 (multi-tenant + RBAC + Meta híbrido) validado con DB real y MERGEADO a main (PR #6, commit 7342d1a) — queda abierto el hallazgo de que los roles no-owner (gerente/agente/viewer) todavía no aplican permisos reales, priorizado como tarea aparte. `v2.0-master-prompt/MASTER-PROMPT-V2.md` fue fusionado a este archivo (ver Anexo, sección 15) y la carpeta se eliminó — este documento ya no depende de ningún archivo externo.

---

## CÓMO USAR ESTE ARCHIVO

1. Abre Claude Code (Opus) DENTRO del clon local del repo (Bloque 0 lo localiza y sincroniza si hace falta — ver más abajo).
2. Pega como primer mensaje, tal cual:

> "Lee completo el archivo `C:\Users\RAI Agency\OneDrive\Documentos\RAI Agency\RAI Agency CRM\v3.0-master-prompt\MASTER-PROMPT-V3-NOCTURNO.md` (NO está dentro de este repo, vive en la carpeta de planeación OneDrive — usa esta ruta absoluta) y ejecútalo con `/goal`, bloque por bloque, en el orden que indica, trabajando siempre dentro de este repo git — empezando siempre por el BLOQUE 0, sin saltar ninguna regla no negociable ni la auditoría de arquitectura del Bloque 0.5. No empieces a construir funcionalidad grande (Bloque 1 en adelante) sin haber cerrado el Bloque 0.5 primero."

3. O, si prefieres invocar `/goal` directo:

> `/goal "Lee completo C:\Users\RAI Agency\OneDrive\Documentos\RAI Agency\RAI Agency CRM\v3.0-master-prompt\MASTER-PROMPT-V3-NOCTURNO.md (ruta absoluta, el archivo vive fuera de este repo) y completa todos sus bloques en orden, trabajando dentro de este repo git, empezando por el Bloque 0 y sin saltarte el Bloque 0.5 (auditoría de arquitectura) antes de tocar código de producto. Meta de cada bloque: tsc --noEmit limpio + npm run build exit 0 + pruebas básicas del flujo implementado + PR abierto contra main + historial-entregas.md actualizado. Prioriza entregables funcionales pequeños y completos sobre cantidad — no inicies una funcionalidad que no puedas terminar con calidad dentro del bloque. Si una fase interna se bloquea más de ~2h sin avance medible, documentarlo en su PR y seguir con fases o bloques independientes — nunca detenerse por completo ni quedarse trabado toda la noche en uno solo."`

4. Por la mañana revisas los PRs abiertos uno por uno. Nada se mergea ni se deploya sin tu aprobación explícita — ver regla no negociable #2.

---

## 1. CONTEXTO DEL PROYECTO (leer primero, en este orden)

1. `CLAUDE.md` / `MEMORY.md` / `CONTEXT.md` / `ESTADO.md` del repo real (fuente de verdad de sesiones anteriores)
2. `historial-entregas.md` (créalo si no existe)
3. `docs/BUENAS-PRACTICAS-CRM.md` y `docs/CLAUDE-CODE-NOTEBOOK-MAESTRO.md` (carpeta de planeación OneDrive — reglas operativas y comandos de Claude Code)
4. `panel-control.html` (carpeta de planeación OneDrive) — checklist maestro con las 43 funcionalidades en alcance esta noche (20 calendario + 23 asesores/equipo/fidelización + 8 propuestas N1-N8), cada una con descripción y prioridad P0/P1/P2
5. Anexo (sección 15 de este mismo archivo) — spec técnica heredada de la v2.0 original para Bloque 1 (ya construido, referencia histórica) y Bloque 3 (todavía vigente)
6. `docs/AUTOMATIZACIONES-MODULO-CALENDARIO.md` — spec técnica de las 20 funcionalidades del calendario
7. `BRAND_GUIDE.md` del repo real — identidad visual obligatoria para todo lo nuevo
8. Carpeta `ghl-capturas/` (si el equipo la deja disponible) — capturas módulo por módulo de Go High Level, referencia funcional de qué trae un CRM comparable de mercado (00-sidebar, 01-dashboard, 02-launchpad, 03-contactos, 04-clientes-potenciales, 05-pasajeros, 06-pagos, 07-sitios, 08-contenido-multimedia, 09-reputacion, 10-informes, 11-marketplace y más). Usar como chequeo de "no dejar huecos obvios", NUNCA copiar textos/branding de GHL — todo con marca e identidad propia de CRM RAI Agency.

**Stack:** Next.js 14 App Router + TypeScript + Prisma + Postgres (Supabase) + BullMQ + Upstash Redis + Cloudflare R2 + Vercel AI SDK.

**Convenciones no negociables del repo** (ya establecidas, no inventar otras — ver `docs/BUENAS-PRACTICAS-CRM.md` sección 7):
- CSS de `globals.css` — nada de librerías de componentes nuevas
- `lucide-react` para íconos, `react-hot-toast` para notificaciones
- `runtime = 'nodejs'` en rutas API que lo necesiten
- `export const dynamic = 'force-dynamic'` en TODA ruta API que toque Prisma/DB — el bug del PR #1 (24 ago) fue justo por saltarse esto, no repetir
- `requireRole` → `isRoleContext` para control de acceso
- Params dinámicos como `Promise<{id}>` con `await params`
- Cifrado de credenciales con `src/lib/crypto.ts` (AES-256-GCM), nunca texto plano
- Dependencias npm nuevas: libres de instalar con criterio (populares, mantenidas), justificar en el PR

---

## 2. REGLAS NO NEGOCIABLES DE ESTA NOCHE (heredadas de `docs/BUENAS-PRACTICAS-CRM.md` + nuevas)

1. **Nunca tocar `main` directamente.** Todo el trabajo vive en ramas propias, sobre el clon local ya sincronizado.
2. **Nunca hacer merge a main ni deploy a producción por tu cuenta.** Cada bloque termina en un Pull Request abierto, esperando aprobación explícita de Reiner. Sin excepción, sin importar cuántas horas lleves corriendo.
3. **Nunca borrar nada** (rama, archivo, migración, dato) sin dejarlo documentado como propuesta en el PR.
4. **Calidad sobre cantidad, no "sin límite de tiempo" como licencia para sobre-construir.** Reiner autoriza que la noche completa se use si hace falta, pero eso NO es luz verde para intentar una mega-implementación de todo a la vez. Prioriza entregables funcionales pequeños y completos sobre alcance grande a medias. **No inicies una funcionalidad que no puedas terminar con calidad dentro de su bloque** — si un bloque es demasiado grande para terminarlo bien, es preferible entregar su primera mitad completa y documentar la segunda como bloque adicional, que entregar todo a medio hacer. Si una fase interna de un bloque queda bloqueada durante más de ~2 horas sin avance medible, documentar el bloqueo en el PR y continuar con fases independientes si hacerlo no compromete la arquitectura — los bloques arquitectónicos críticos (especialmente multi-tenant, RBAC, migraciones y seguridad) no deben abandonarse únicamente por complejidad temporal. No detenerse por completo bajo ninguna circunstancia salvo que TODOS los bloques queden bloqueados.
5. **Estabilidad del repositorio por encima de refactors masivos:** no realizar refactorizaciones masivas durante la implementación de bloques funcionales. Las mejoras arquitectónicas deben hacerse de manera incremental y justificada. Si una modificación arquitectónica afecta una parte significativa del código existente (más del 30% del repositorio o múltiples módulos críticos), detenerse, documentarlo en el PR y proponerlo como una tarea independiente. El objetivo no es reescribir el CRM, sino evolucionarlo sobre una base estable.
6. **Aislamiento por cliente:** cada tenant sus propias credenciales, nunca reutilizar entre tenants ni hardcodear datos de un cliente real.
7. **Nunca pegar API keys o tokens reales en código o commits** — variables de entorno o campos cifrados en DB.
8. **Ninguna funcionalidad se nombra ni se limita a un cliente específico** (ej. Belloanam, cuyo caso originó el módulo de asesores) — todo genérico multi-tenant, disponible para cualquier cliente con el mismo problema.
9. Antes de cerrar cada bloque: `npx tsc --noEmit` limpio y `npm run build` exit 0. Si algo no compila, no se avanza al siguiente bloque hasta resolverlo (o se documenta como bloqueado y se sigue con el próximo, regla #4).
10. Actualizar `historial-entregas.md` (fecha + qué se entregó + qué quedó bloqueado) al cerrar CADA bloque, no solo al final.
11. **Repo local siempre en modo espejo del remoto:** antes de crear la rama de cada bloque, `git fetch origin` + verificar que se parte de `origin/main` actualizado. Si el clon local estaba desactualizado, documentarlo en el PR del Bloque 0.
12. **Nada de contenido pago (imagen/video IA) sin decir costo estimado y esperar aprobación** — no debería aplicar esta noche (todo es código), pero si algún bloque lo necesitara, pausar y documentar en vez de generar.
13. Nada de contenido fabricado: nombres, fotos, cifras o reseñas de ejemplo — usar datos claramente marcados como `demo`/`seed` si hacen falta para probar algo.

---

## 3. REGLAS DE ARQUITECTURA NO NEGOCIABLES (nuevo — auditoría técnica de Reiner, 1 sep 2026)

Esta sección existe porque el mayor riesgo de esta noche no es que Claude Code trabaje poco — es que trabaje mucho y deje una base difícil de mantener. Tres pilares se protegen por encima de todo lo demás: **multi-tenant perfecto, roles/permisos sólidos, arquitectura de servicios limpia.** Si estos tres quedan bien, todo lo demás (calendario, asesores, IA, reportes, white-label) escala fácil. Si no, cada bloque nuevo agrava la deuda técnica.

**Auditoría antes de construir:**
- Antes de implementar cualquier bloque funcional grande (Bloque 1 en adelante), realizar una auditoría arquitectónica del estado actual — esto es exactamente el Bloque 0.5 más abajo, no es opcional ni se puede saltar "porque ya se hizo diagnóstico en el Bloque 0" (el Bloque 0 es de infraestructura/git, el 0.5 es de arquitectura de código).
- No crear nuevas arquitecturas paralelas si ya existe una solución funcional para lo mismo (ej. si ya hay un patrón de servicio para leads, no inventar uno nuevo para asesores — extenderlo).

**Multi-tenant — regla dura:**
- Toda operación de negocio debe estar aislada por tenant, sin excepción.
- **Queda prohibido hacer `prisma.model.findMany()` (o cualquier query directa) desde componentes React o módulos de negocio.** Toda consulta a base de datos pasa obligatoriamente por una capa `repository`/`service` que inyecta y valida `tenantId` automáticamente — nunca confiar en que el caller se acuerde de filtrar.
- Motivo: el peor bug posible en un CRM SaaS es Cliente A viendo datos del Cliente B. No es negociable, ni siquiera para ir más rápido esta noche.

**RBAC formal (no solo "roles mencionados"):**
- Roles mínimos del sistema: `SUPER_ADMIN` (RAI Agency, cross-tenant) · `AGENCY_OWNER` (dueño de una agencia/tenant que revende, ej. rol tipo Belloanam pero genérico) · `TENANT_ADMIN` (admin del negocio que compró el CRM) · `MANAGER` · `ADVISOR` (asesor) · `STAFF` (vendedor/CM/camarógrafo/editor — categorías del RRHH-lite, Bloque 4 ítem A1) · `CLIENT` (cliente final, reservado para cuando exista portal cliente).
- Permisos explícitos, no solo roles: `canCreateLead`, `canViewReports`, `canManageTeam`, `canManageBilling`, `canConnectMeta`, `canManageContent` (calendario), `canApproveContent` (flujo de aprobación C12), `canManageAdvisors` (kanban de captación, Bloque 4).
- Cada rol tiene un set de permisos por default, pero la autorización real en backend se valida por permiso, nunca por nombre de rol a pelo (evita que "si es ADVISOR entonces puede X" quede hardcodeado en 20 lugares distintos).

**Seguridad:**
- Nunca confiar únicamente en validaciones del frontend — ocultar un botón no es autorización. Toda autorización se valida en backend, siempre.

**IA — capa centralizada obligatoria:**
- Toda integración con modelos de IA (auto-caption, sugeridor de hora, cortapega de video, auditoría digital automática, scoring de asesores, etc.) pasa por una capa `/services/ai` — nunca se llama un modelo directo desde un componente React ni desde una ruta API suelta.
- Cada llamada registra: tenant, usuario, modelo utilizado, prompt (o su referencia), costo aproximado, fecha, resultado. Esto es crítico para poder facturar/auditar cuando haya clientes reales pagando por uso.

**Auditoría de acciones:**
- Toda acción crítica de negocio (cambiar estado de un lead, aprobar/rechazar contenido, cambiar rol de un usuario, conectar/desconectar Meta, cerrar una venta en el kanban de asesores) genera un registro de auditoría: quién, tenant, acción, fecha, entidad afectada. Ejemplo de la forma esperada: "Juan cambió el estado del lead Pedro de Auditado a Propuesta enviada".

**Migraciones Prisma seguras:**
- Nunca modificar el schema de Prisma sin: 1) revisar el impacto en datos/tenants existentes, 2) crear la migración explícita (nunca `db push` directo en algo que ya tiene datos), 3) validar que un rollback es posible, 4) documentar el cambio en el PR. Un CRM vivo muere por migraciones mal hechas — más aún corriendo varias horas sin supervisión.

**Testing obligatorio por bloque:**
- Cada bloque que toque backend/lógica de negocio incluye al menos: pruebas unitarias de la lógica crítica, pruebas de API de las rutas nuevas, pruebas de permisos (que un rol sin el permiso correspondiente reciba 403), y una prueba del flujo principal end-to-end. Con foco especial e ineludible en: login, aislamiento por tenant (que un tenant NUNCA vea datos de otro), creación de lead, y publicación de contenido.
- Si Playwright ya está en el repo (confirmar en Bloque 0), usarlo para los flujos end-to-end; si no está, instalarlo es válido (regla de dependencias nuevas del contexto) antes de construir sobre algo sin poder probarlo.

**Estructura de archivos — disciplina, no caos:**
- Mantener la separación ya esperada: `src/app`, `src/components`, `src/services`, `src/repositories`, `src/lib`, `src/hooks`, `src/types`.
- Antes de crear una carpeta nueva o un patrón arquitectónico distinto a los existentes, justificarlo explícitamente en el PR — no se agregan patrones nuevos "porque sí".

**Definición obligatoria de terminado (Definition of Done):**
- Ningún bloque se considera terminado únicamente porque compila. Un bloque está terminado cuando cumple: 1) funcionalidad implementada, 2) código integrado siguiendo la arquitectura existente, 3) pruebas principales pasando, 4) permisos y seguridad verificados cuando aplique, 5) migraciones Prisma documentadas cuando existan, 6) variables de entorno nuevas documentadas, 7) `historial-entregas.md` actualizado, 8) PR creado con resumen de cambios, archivos principales modificados, decisiones técnicas tomadas, riesgos conocidos y próximos pasos.

**Datos demo y pruebas:**
- Todo dato utilizado para pruebas vive exclusivamente en seeds, fixtures o ambientes demo claramente identificados. Nunca insertar datos de prueba directamente en producción. Nunca mezclar información real de clientes con datos demo.

**Manejo estándar de errores:**
- Toda API nueva implementa: códigos HTTP correctos, mensajes seguros para el usuario, logging interno, y manejo de errores sin exponer información sensible.

**Integraciones externas:**
- Toda integración con servicios externos considera: validación de autenticidad, manejo de errores temporales, reintentos controlados, límites de consumo, y trazabilidad completa.

**Webhooks:**
- Todo webhook externo valida origen o firma cuando aplique, registra el evento recibido, evita duplicados mediante idempotencia, y mantiene historial de procesamiento.

**Control de costos de IA:**
- Toda funcionalidad de IA contempla: consumo por tenant, registro de uso, costo aproximado, y la posibilidad futura de limitar o desactivar IA por tenant. La IA no debe convertirse en un costo invisible para la plataforma.

---

## 4. BLOQUE 0 — Diagnóstico, sincronización y fix de entorno (SIEMPRE PRIMERO, bloqueante)

Sin esto, ningún otro bloque puede abrir PRs de forma segura. Esto es infraestructura/git — la auditoría de código y arquitectura va en el Bloque 0.5, no aquí.

1. **Localizar el clon local.** Buscar en `Desktop`, `Documents` y subcarpetas una carpeta con remote `git@github.com:reinerramos2702-jpg/crm-rai-agency.git` o `https://github.com/reinerramos2702-jpg/crm-rai-agency.git`. Si no existe, clonarlo: `git clone https://github.com/reinerramos2702-jpg/crm-rai-agency.git` dentro de `Desktop/`.
2. **Sincronizar con GitHub (modo espejo, regla permanente #10):** `git remote -v` (confirmar que ya no dice `content-engine-mvp`), `git fetch origin`, comparar `HEAD` local vs `origin/main` — si diverge, hacer `git pull` / `git rebase` según corresponda para que la carpeta quede al día. Documentar en el PR de este bloque qué tan desactualizada estaba.
3. **Arreglar `GITHUB_TOKEN` inválido** (hallazgo sin resolver desde el 24 ago — Reiner confirma que probablemente sigue roto): revisar si hay una variable de entorno global `GITHUB_TOKEN` con un token inválido que `gh` esté priorizando sobre la cuenta autenticada por device flow. Si existe, limpiarla (o corregirla). Confirmar con `gh auth status` que muestra `Active account: true` con la cuenta correcta. **Bloqueante duro** — sin `gh` funcionando no se pueden abrir los PRs que exige la regla #2.
4. **Diagnóstico real del repo — ya parcialmente confirmado 1 sep vía GitHub app, verificar que sigue así:**
   - **PR #1 (fix build Fase 1) → CONFIRMADO MERGEADO.** Visto en el historial: commit "Merge pull request #1 from fase-1/estabilizacion". No hace falta re-hacer este fix.
   - **PR #2 "Bloque 0 — Renombrado de marca"** (`v2/renombrado-marca` → `main`) → CONFIRMADO ABIERTO, "Listo para fusionar". Único check en rojo es Cloudflare Workers (deploy no usado en este proyecto, no bloqueante — ver `panel-control.html` Hallazgos). Vercel preview sí compiló bien. **No lo mergees por tu cuenta (regla #2)** — si el mensaje de arranque de esta sesión no dice explícitamente que Reiner ya lo aprobó/mergeó, avisar en el PR de este bloque que sigue pendiente de su aprobación y seguir adelante con el resto igual (el código de `main` ya no tiene el nombre viejo en lo esencial, esto es solo el PR formal).
   - Confirmar con `git log --oneline -20` y `gh pr list` que no hay sorpresas nuevas desde el 1 sep.
   - Seguir sin confirmar: la rama Instagram huérfana (`claude/rai-instagram-crm-automation-ykkwg2`) — revisar con `gh pr list --state all` o `git branch -r` si ya se mergó o sigue suelta, y si sigue suelta abrir el PR de revisión (link en `panel-control.html`).
   - Revisar si el deploy vivo (`crm-rai-agency.vercel.app`) sigue mostrando residuos de Hotel MPV.
   - **Chequear si Playwright ya está en el repo** (buscar `@playwright/test` o `playwright` en `package.json`, o una carpeta `tests/`/`e2e/`) — determina si el testing obligatorio (sección 3) puede usarlo directo o hay que instalarlo primero.
5. **Con ese diagnóstico, decidir el orden de los bloques siguientes** (Reiner delegó esta decisión explícitamente): Bloque 0 de v2.0 (renombrado) está prácticamente cerrado — solo falta el merge de Reiner. Bloques 1-3 de `v2.0-master-prompt/MASTER-PROMPT-V2.md` (multi-tenant+Meta, calendario, pulido) probablemente NO están construidos todavía — confirmar con el diagnóstico. En cualquier caso, **el Bloque 0.5 corre siempre después de este, antes de tocar cualquier código de producto**, aunque el diagnóstico diga que Bloque 1 "ya está hecho" — hay que confirmar CÓMO está hecho, no solo que existe.
6. Escribir/crear `historial-entregas.md` con el estado real encontrado. Abrir PR `v3/bloque-0-diagnostico-sincronizacion` documentando todo lo anterior.

**Meta (criterio de éxito del bloque):** `gh auth status` correcto + repo local sincronizado con `origin/main` + diagnóstico completo documentado en PR (incluyendo estado de PR#2 y de Playwright) + orden de ejecución de la noche decidido y anotado.

---

## 5. BLOQUE 0.5 — Auditoría de arquitectura (SIEMPRE SEGUNDO, bloqueante — nunca saltar directo a construir)

Objetivo: que Claude Code entienda el repo real antes de tocarlo, para no crear `tenantId` duplicado, roles incompatibles, migraciones conflictivas, o APIs con patrones distintos a los que ya existen.

Revisar y documentar en el PR de este bloque (`v3/bloque-0.5-auditoria-arquitectura`):

1. **Modelo Prisma actual** — todas las tablas existentes, sus relaciones, y si ya existe algo parecido a `tenantId` en algún modelo.
2. **Auth actual** — cómo se autentica hoy (NextAuth, JWT propio, Supabase Auth, lo que sea que haya), y si ya hay algo de sesión/contexto de usuario disponible.
3. **Roles existentes** — si ya hay algún sistema de roles (aunque sea informal), compararlo contra el RBAC formal de la sección 3 y decidir cómo migrar sin romper lo que exista, no reemplazar a ciegas.
4. **Middleware** — qué corre hoy en middleware (si algo), y dónde hookear el chequeo de tenant/permisos.
5. **Estructura de carpetas real** — comparar contra la esperada (`src/app`, `src/components`, `src/services`, `src/repositories`, `src/lib`, `src/hooks`, `src/types`) y anotar qué falta crear vs qué ya existe con otro nombre.
6. **Patrones de API existentes** — cómo están hechas las rutas API que ya funcionan (Instagram, audit, ai-agents/dashboard, etc.) para replicar el mismo patrón en lo nuevo, no inventar uno paralelo.
7. **Componentes reutilizables existentes** — qué UI ya se puede reusar (tablas, modales, formularios) antes de crear nuevos.
8. **Estado real del frontend** — qué páginas/rutas ya existen y funcionan hoy.

Con ese inventario, **antes de escribir código del Bloque 1**, dejar en el PR un plan corto de cómo el multi-tenant + RBAC + capa repository/service se va a insertar en lo que ya existe (no un diseño desde cero ignorando el repo real).

**Meta (criterio de éxito del bloque):** inventario completo de los 8 puntos documentado en PR + plan de inserción de multi-tenant/RBAC sobre el código real (no hipotético) + `tsc`/`build` limpios (este bloque no debería romper nada, es solo lectura y documentación).

---

## 6. BLOQUE 1 — Fundación multi-tenant + RBAC + Meta híbrido *(COMPLETO — PR #6 mergeado a main 5 sep 2026, commit 7342d1a)*

**Estado 6 sep 2026:** validado con DB real (2 tenants, test de aislamiento sin skip) y mergeado. Se conserva la sección completa abajo como referencia de lo que se construyó — no como pendiente. **Hallazgo abierto, priorizado como tarea aparte:** los roles no-owner (gerente/agente/viewer) todavía no aplican permisos reales — `getRoleContext` resuelve siempre al workspace propio del usuario autenticado. No vender roles con permisos como funcionales hasta resolverlo.

Base: Anexo 15.1 (spec original heredada de v2.0-master-prompt, ya construida), más las reglas de arquitectura de la sección 3 de este documento — **esto ya no fue solo "tenantId en schema/queries/auth", fue la capa repository/service + RBAC formal completos.**

**Multi-tenant:**
- `tenantId` en schema, con migración Prisma segura (sección 3).
- Capa `repository`/`service` que inyecta y valida `tenantId` en toda query — nada de acceso directo a Prisma desde módulos de negocio.
- Prueba de aislamiento obligatoria: dos tenants demo, confirmar que uno NUNCA ve datos del otro.

**RBAC:**
- Implementar los 7 roles y los permisos base de la sección 3, con validación en backend (no solo frontend).
- Prueba de permisos: un usuario sin `canManageBilling`, por ejemplo, debe recibir 403 al intentar esa acción.

**Meta/Instagram — modelo híbrido, decisión cerrada 1 sep 2026:**
- Campo `metaMode` por tenant: `'shared_app'` (default) o `'own_app'`.
- `shared_app`: app RAI única + OAuth dinámico por tenant, credenciales cifradas — flujo rápido, sin Business Verification/App Review por cada venta. Este es el default para todo tenant nuevo.
- `own_app`: el tenant conecta su propia app de Meta (App ID + App Secret propios, cifrados igual que el resto). Pantalla de configuración donde el tenant elige el modo y, si elige `own_app`, pega sus credenciales.
- Ambos modos conviven en el mismo schema — no es una migración futura, se construye completo esta noche.
- Requiere permiso `canConnectMeta`.

**Estrategia de ejecución interna del Bloque 1:**

Aunque este bloque representa una única meta arquitectónica, Claude Code debe ejecutarlo internamente por fases ordenadas:

- **Fase 1 — Auditoría final:** revisión del modelo actual y preparación de cambios (se apoya en el inventario del Bloque 0.5).
- **Fase 2 — Aislamiento multi-tenant:** `tenantId`, contexto del tenant, capa repository/service, validación automática de tenant.
- **Fase 3 — RBAC:** roles del sistema, permisos explícitos, autorización backend, pruebas de acceso.
- **Fase 4 — Meta híbrido:** `shared_app`, `own_app`, credenciales cifradas, OAuth dinámico, permisos necesarios.
- **Fase 5 — Integración final:** pruebas completas, audit logs, documentación, revisión de arquitectura.

No abrir el PR final del Bloque 1 hasta completar estas fases o documentar claramente qué fase quedó bloqueada.

**Prioridad del Bloque 1:** este bloque establece la base SaaS del CRM RAI Agency. La prioridad no es solamente cumplir funcionalidades, sino dejar una arquitectura correcta sobre la cual todos los módulos futuros puedan crecer. Cuando exista conflicto entre velocidad y arquitectura, gana arquitectura.

**Meta (criterio de éxito del bloque):** las 5 fases completas o documentadas si alguna quedó bloqueada + capa repository/service funcionando (sin queries directas desde negocio) + RBAC con las 2 pruebas de arriba pasando + ambos modos de Meta funcionando en un flujo de prueba + audit log registrando al menos las acciones de conectar Meta y cambiar rol + PR abierto (con resumen de cambios, archivos principales, decisiones técnicas, riesgos conocidos y próximos pasos) + `tsc`/`build` limpios.

---

## 7. BLOQUE 2A — Calendario de Contenido, núcleo *(ejecutar solo si el diagnóstico confirma que no está ya hecho)*

Partido del Bloque 2 original — 20 funcionalidades en una sola noche junto con Meta/IA/reglas era demasiado para un bloque, prácticamente un producto aparte. Este bloque es solo la base funcional.

Spec: `docs/AUTOMATIZACIONES-MODULO-CALENDARIO.md` + sección "Automatizaciones — Calendario de Contenido" de `panel-control.html`, grupos "Núcleo — slider y calendario" y "Preview y experiencia visual" (crear contenido, editar, estados por color, calendario visual, slider semanal, drag&drop, duplicar tarjeta, subida múltiple, preview estilo feed, vista mes). No depende del Bloque 1 (mismo criterio que v2.0 original) pero si el Bloque 1 ya está, usar su capa repository/service en vez de acceso directo.

**Meta (criterio de éxito del bloque):** crear/editar/programar contenido con estados visibles funcionando end-to-end + prueba del flujo principal (subir → programar → ver en calendario) + PR abierto + `tsc`/`build` limpios.

---

## 8. BLOQUE 2B — Calendario de Contenido, automatización *(depende de 2A completo)*

Segunda mitad del Bloque 2 original: publicación real, IA, y reglas de negocio.

Spec: mismos documentos que 2A, grupos "Publicación — Graph API", "IA y automatización de contenido", "Reglas de negocio", "Guía integrada" (botón de publicar vía Graph API, reintento inteligente, auto-caption con IA, sugeridor de mejor hora, cortapega de video, banco de contenido, bloqueo de fechas, límite de frecuencia, aprobación en dos pasos, tooltips, recorrido guiado).

- Toda funcionalidad de IA de este bloque (auto-caption, sugeridor de hora, cortapega) pasa por la capa `/services/ai` de la sección 3, con logging completo.
- La publicación real a Meta usa el `metaMode` del tenant (Bloque 1) — no asumir un solo modo.
- Cada publicación exitosa/fallida genera registro de auditoría.

**Meta (criterio de éxito del bloque):** publicación de prueba funcionando en al menos un tenant demo + capa de IA con logging verificable + prueba de flujo principal (crear → aprobar si aplica → publicar) + PR abierto + `tsc`/`build` limpios. P2 (multi-red, marco de marca, racha) entran si alcanza el tiempo, se documentan como pendientes si no.

---

## 9. BLOQUE 3 — Pulido móvil y extras *(ejecutar solo si el diagnóstico confirma que no está ya hecho)*

Base: Anexo 15.2 (spec original heredada de v2.0-master-prompt, todavía vigente). Depende de que exista UI de los bloques anteriores para pulir.

**Meta:** paridad móvil verificada con Playwright (`hover: none` + `pointer: coarse`, lección ya documentada de la sesión de rediseño web) + PR abierto.

---

## 10. BLOQUE 4 — Captación de Asesores, Equipo Interno y Fidelización

Spec completa: sección "Captación de Asesores, Equipo Interno y Fidelización" de `panel-control.html` — 23 funcionalidades aprobadas sin descarte (3 ideas originales de Reiner marcadas P0/core + 20 de Claude), agrupadas en 5 áreas: Captación de asesores (funnel de reclutamiento), Gestión de equipo interno, Contenido y redes (extensión del calendario), Fidelización y marketing automation, Negocio y operación de la agencia. **Todo genérico multi-tenant — regla no negociable #7, ninguna referencia a un cliente específico.**

Requiere Bloque 1 (multi-tenant + RBAC) completo primero — el RRHH-lite (rol `STAFF` con categorías asesor/vendedor/CM/camarógrafo/editor) y el panel privado de dueño de agencia (rol `AGENCY_OWNER`) son aplicaciones directas del RBAC de la sección 3, no un sistema de roles nuevo y aparte.

- Toda acción del kanban de captación (mover un lead de etapa) genera registro de auditoría.
- El scoring IA del formulario de aplicación (B5) pasa por la capa `/services/ai`.

**Meta (criterio de éxito del bloque):** los ítems marcados P0 en el panel funcionando end-to-end, usando los roles/permisos del Bloque 1 (no roles hardcodeados nuevos) + PR abierto + `tsc`/`build` limpios. P1/P2 entran si alcanza el tiempo, se documentan como pendientes si no.

---

## 11. BLOQUE 5 — Guión de capacitación 0-100

Idea original de Reiner (1.2 en el panel), P0 — sin esto la promesa de capacitación de 2-3 meses + soporte 1 año del pricing ($937.47) no se puede cumplir en escala.

1. Generar `docs/GUION-CAPACITACION-0-100.md` en el repo real: documento que explica cada funcionalidad y cada botón del CRM construido hasta este punto (Bloques 1-4), de cero a cien, en lenguaje simple — Reiner se lo aprende primero y luego capacita a cada negocio que compra el CRM.
2. Estructura sugerida: un capítulo por módulo (Auth/Tenants/Roles, Calendario de Contenido, Captación de Asesores, Equipo Interno, Fidelización), cada uno con: qué hace, para qué sirve, paso a paso de uso, capturas o descripción de cada botón.
3. Dejar enganchado con la Biblioteca de recursos in-app (E18 del panel, si el Bloque 4 ya la construyó) — el mismo contenido debe poder consultarse dentro del CRM, no solo como doc externo.

**Meta:** documento completo cubriendo el 100% de lo construido hasta este punto en la noche (no solo lo que había antes) + PR abierto.

---

## 12. BLOQUE 6 — Propuestas nuevas N1-N8 (aprobadas completas esta noche)

Spec completa: sección "Ideas nuevas — pendientes de aprobar" de `panel-control.html` — **las 8 quedan aprobadas para esta noche** (N1 Calculadora ROI en vivo, N2 Programa de referidos, N3 Firma electrónica, N4 Auditoría digital recurrente, N5 Leaderboard de asesores, N6 Reporte white-label, N7 Alerta de asesor inactivo, N8 Reporte contable simple). Depende de Bloques 1 y 4 completos (todas construyen sobre tenants/roles/asesores/reportes ya existentes).

N4 (auditoría recurrente) usa la capa `/services/ai`. Todas usan la capa repository/service del Bloque 1 — sin excepciones de "es rápido y ya".

**Meta (criterio de éxito del bloque):** las 8 funcionando end-to-end + PR abierto + `tsc`/`build` limpios. Si el tiempo no alcanza para las 8, priorizar N1 (ROI, conecta directo con la directiva de cierre psicológico ya documentada) y N4 (alimenta el dashboard ejecutivo) primero, documentar el resto como pendiente.

---

## 13. PRINCIPIO DE EVOLUCIÓN DEL PRODUCTO

El objetivo de esta ejecución nocturna no es construir la mayor cantidad de funcionalidades posibles. El objetivo principal es crear una base SaaS profesional, segura y escalable para el CRM RAI Agency.

Todas las decisiones deben priorizar, en este orden:

1. Arquitectura sostenible.
2. Seguridad de datos.
3. Separación correcta entre tenants.
4. Código mantenible.
5. Experiencia consistente para futuros clientes.

Cuando exista conflicto entre velocidad vs. arquitectura, cantidad vs. calidad, o funcionalidad nueva vs. estabilidad, **siempre gana estabilidad y arquitectura.**

Una funcionalidad parcialmente completada pero correctamente diseñada es preferible a una funcionalidad completa difícil de mantener.

---

## 15. ANEXO — Spec heredada de v2.0-master-prompt (fusionada aquí 6 sep 2026, carpeta original eliminada)

### 15.1 Spec original de Bloque 1 (multi-tenant + Meta por cliente) — YA CONSTRUIDO en PR #6, referencia histórica

**Multi-tenant (estructural):**
- Agregar `tenantId` a todos los modelos Prisma relevantes.
- Middleware de auth que resuelve el tenant activo y lo inyecta en cada query.
- TODAS las queries existentes filtradas por `tenantId` — auditoría completa, no solo las nuevas.
- Migración Prisma idempotente.
- Panel de administración: crear / editar / suspender tenants.
- Tests de aislamiento: verificar que un tenant NUNCA puede leer datos de otro.

**Meta por cliente (Instagram/Facebook) — nota: superado por el modelo híbrido `shared_app`/`own_app` decidido 1 sep 2026, ver Bloque 1 arriba:**
- Cada tenant conecta su propia app de Meta (no una app RAI compartida).
- UI de onboarding: el cliente pega su App ID, App Secret, y completa el flujo OAuth con su propia app.
- Almacenamiento cifrado por tenant vía `src/lib/crypto.ts`, nunca en env vars globales.
- Validación contra Graph API antes de guardar.
- Webhook por tenant: verificar firma `X-Hub-Signature-256` usando el `META_APP_SECRET` de CADA tenant.
- Reutilizar como base la lógica ya construida en la rama `claude/rai-instagram-crm-automation-ykkwg2` (mergeada a main) — adaptada de single-tenant a multi-tenant.
- Documentación paso a paso por cliente (`docs/INSTAGRAM_SETUP.md`).

### 15.2 Spec original de Bloque 3 (pulido móvil + extras) — TODAVÍA VIGENTE

**3.1 Auditoría y pulido móvil de TODO el CRM (no solo lo nuevo):**
- Revisar CADA botón de CADA módulo existente (CRM base, Instagram, AutoViral, RAI Lead Machine): touch targets de mínimo 44px, estados de carga, feedback visual al tocar.
- Responsive real verificado en cada pantalla, no solo diseño "que se vea bien" en escritorio.
- Performance: lazy loading de imágenes, code splitting donde aplique, optimización de queries N+1 si aparecen.
- `BRAND_GUIDE.md` aplicado de forma consistente en TODO el CRM, no solo módulos nuevos.
- Si el tiempo alcanza: explorar viabilidad de PWA instalable (manifest + service worker básico) — no bloqueante si no da tiempo.

**3.2 Inbox unificado (WhatsApp + Instagram + Email):**
- Bandeja única que agregue mensajes de los 3 canales.
- Responder desde un mismo lugar, con indicador de canal de origen.
- Reutilizar el patrón de `SocialActionLog` / arquitectura de mensajería ya existente del módulo Instagram como base.
- WhatsApp: base Meta Cloud API directo (no Twilio ni otro BSP). Requiere verificación de negocio en Meta (puede tardar días) — no bloquea el código: construir la integración completa (webhook, envío/recepción, cifrado por tenant) y documentar en `docs/` los pasos que Reiner debe hacer en Meta Business Manager por cliente.

**3.3 Motor de automatizaciones extendido:**
- Ampliar el motor ya existente (`src/app/api/automations/run-due`, `automations/runs`) con reglas más flexibles tipo "si esto pasa, haz esto".
- UI donde el usuario arma sus propias reglas sin tocar código (trigger → condición → acción).
- Reutilizar el `WorkflowRun` / engine ya existente en `src/lib/automations/engine` como base, no reescribir.

**3.4 Portal de cliente + alertas proactivas:**
- Vista de acceso limitado para que el negocio grande le dé visibilidad a su cliente final. Alcance exacto: calendario de contenido (ver/aprobar posts programados) + reportes básicos (posts publicados, engagement) — nada de configuración, nada de datos de otros tenants, nada de módulos fuera de esos dos.
- Alertas proactivas automáticas: token de Meta por vencer (60 días), racha de publicación rota, factura/pago vencido si aplica, error de publicación repetido.
- Notificaciones visibles en dashboard + opción de email.

**3.5 Cierre de documentación (obligatorio, no opcional):**
- Actualizar `ESTADO.md`, `CONTEXT.md`, `MEMORY.md` con todo lo construido en los 3 bloques.
- Actualizar `historial-entregas.md` con las 3 entregas (fecha + resumen de cada bloque).
- Dejar en cada PR una sección "Cómo probar esto" con pasos concretos para que Reiner verifique sin tener que leer código.

---

## 16. CIERRE DE LA NOCHE

- Actualizar `historial-entregas.md` con el resumen final: qué se completó, qué quedó bloqueado, cuántos PRs quedaron abiertos.
- Confirmar que ninguna migración Prisma quedó aplicada sin documentar en su PR correspondiente.
- Confirmar que el audit log tiene entradas reales de las acciones críticas de la noche (no vacío).
- Ningún PR se mergea ni se deploya — todos esperan revisión de Reiner por la mañana.
- Si TODOS los bloques restantes quedaran bloqueados antes de completar la lista, documentarlo claramente y detenerse ahí — no hace falta forzar nada.
