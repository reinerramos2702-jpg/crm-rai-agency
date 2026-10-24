# Buenas Prácticas — Claude Code
> Documento maestro de referencia. Incluir en la raíz de cada proyecto (`/docs/BUENAS-PRACTICAS-CLAUDE-CODE.md`). Consultar al iniciar sesión y actualizar según evolucione el flujo de trabajo.

**Versión:** 1.5 — 23 oct 2026

<details>
<summary>Changelog</summary>

- **1.5** (23 oct 2026): sección 13 — regla de que el agente nunca lee, lista ni imprime valores de secretos (ni de `.env`, paneles o columnas sensibles); Reiner los genera y pega directo en cada servicio. Nueva regla de base de datos: toda tabla nueva en `public` lleva RLS y grants en la misma migración. Retirado el alias de proyecto en desuso de la sección 18.
- **1.4** (18 sep 2026): añadida guía de cuándo correr `/clear` durante migraciones de rutas largas (tipo "Commit 3") — al cerrar cada archivo de ruta completo, nunca a mitad de uno con handlers pendientes.
- **1.3** (17 sep 2026): añadida nomenclatura de chats/sesiones (Cowork/Claude Code) dentro de la sección 19 — distinta del `ESTADO-SESION.md`.
- **1.2** (02 sep 2026): convención de nomenclatura ajustada a prefijo por nombre real de cada proyecto; añadida sección Cierre y continuidad de sesión.
- **1.1** (02 sep 2026): añadidas secciones Seguridad, Testing/Verificación, Antipatrones conocidos, Convención de nomenclatura cross-proyecto.
- **1.0**: versión inicial, adaptada del curso base a formato profesional genérico.

</details>

## Índice
1. [Bucle agéntico](#1-bucle-agéntico)
2. [Gestión de contexto y sesión](#2-gestión-de-contexto-y-sesión)
3. [Selección de modelo y esfuerzo](#3-selección-de-modelo-y-esfuerzo)
4. [Modos de ejecución](#4-modos-de-ejecución-shifttab)
5. [Memoria persistente del proyecto](#5-memoria-persistente-del-proyecto)
6. [Comandos personalizados](#6-comandos-personalizados-claudecommands)
7. [Skills](#7-skills-claudeskills)
8. [MCP](#8-mcp-model-context-protocol)
9. [Plugins](#9-plugins)
10. [Subagentes y orquestación](#10-subagentes-y-orquestación)
11. [Hooks](#11-hooks-claudehooks)
12. [Control de versiones](#12-control-de-versiones--obligatorio)
13. [Seguridad](#13-seguridad)
14. [Testing y verificación](#14-testing-y-verificación)
15. [Antipatrones conocidos](#15-antipatrones-conocidos)
16. [Automatización 24/7](#16-automatización-247)
17. [Comandos de programación y monitoreo](#17-comandos-de-programación-y-monitoreo)
18. [Convención de nomenclatura cross-proyecto](#18-convención-de-nomenclatura-cross-proyecto)
19. [Cierre y continuidad de sesión](#19-cierre-y-continuidad-de-sesión)
20. [Checklist operativo](#20-checklist-operativo)
21. [Plantilla CLAUDE.md por proyecto](#21-plantilla-claudemd-por-proyecto)

---

## 1. Bucle agéntico

Todo trabajo con el agente sigue: **Exploración → Planificación → Ejecución → Verificación → Cierre.**

El harness ya trae este bucle integrado. Las capas de este documento lo hacen determinista — que el agente responda de forma consistente y auditable en vez de variable.

---

## 2. Gestión de contexto y sesión

| Comando | Función | Cuándo aplicar |
|---|---|---|
| `/clear` | Abre ventana nueva (la anterior queda archivada) | Nueva tarea sin relación con la anterior, o contexto saturado |
| `/compact` | Resume la conversación activa reduciendo % de contexto | Sesión relevante que no conviene cerrar pero se está llenando |
| `/context` | Muestra % de contexto usado y su distribución | Antes de tareas largas o si la respuesta pierde calidad |
| `/resume` / `claude -r` | Recupera sesiones anteriores | Retomar trabajo pausado |
| `/rewind` (doble Esc) | Checkpoints — revierte código y conversación a un punto anterior | Error sin commit previo |
| `@archivo` | Referencia directa a un fichero | Evitar lectura completa del repo — ahorra contexto, reduce alucinación |
| `!comando` | Ejecuta shell sin salir del agente | Comandos puntuales durante la sesión |
| `by the way <pregunta>` | Consulta en paralelo sin interrumpir la tarea activa | Duda rápida durante ejecución |

**Regla de contexto:** 40–50% de ocupación es el umbral de alerta — a partir de ahí aumenta el riesgo de alucinación. Verificar con `/context` antes de tareas extensas.

**`/clear` durante migraciones de rutas largas (tipo "Commit 3", 15-20 archivos con el mismo patrón):** correr `/clear` al **cerrar un archivo de ruta completo** — todos sus handlers (GET/POST/PATCH/DELETE) ya aprobados — nunca a mitad de un archivo con handlers pendientes de confirmar, para no perder de vista cuál diff quedó a medio revisar. El código ya vive en disco antes de limpiar — lo único que se pierde con `/clear` es el hilo de la conversación, no el trabajo hecho. Antes de limpiar: confirmar que el panel de control del proyecto (`docs/planning/panel-control.html` para CRM RAI Agency, o el equivalente por proyecto) ya refleja qué rutas quedaron migradas — es la fuente de verdad, no el chat. Al reabrir tras el `/clear`: repriming corto tipo "seguimos con `<próxima ruta>`, mismo patrón que `<última ruta cerrada>`, roles según `MODULE_ACCESS`" en vez de repetir todo el contexto.

---

## 3. Selección de modelo y esfuerzo

| Modelo | Uso |
|---|---|
| Haiku | Tareas triviales, alto volumen, bajo costo |
| Sonnet | Trabajo rutinario — uso por defecto |
| Opus | Tareas complejas, arquitectura, decisiones de diseño |
| Fable | Máximo rendimiento — reservar para lo que realmente lo justifique |

`/effort`: ajustar nivel (low → high → max → ultra) según complejidad real de la tarea, no por defecto al máximo. Modo *thinking* activo siempre — mejora calidad de respuesta a cambio de más tokens.

---

## 4. Modos de ejecución (`Shift+Tab`)

| Modo | Autonomía |
|---|---|
| Manual | Confirma cada acción |
| Accept edits | Autónomo en ediciones, confirma el resto |
| Plan | No escribe código — solo planifica y presenta el plan a revisión |
| Auto | Ejecuta todo sin confirmación |

**Flujo estándar:** Plan → revisión/ajuste del plan → aprobación → ejecución en Accept edits (Auto solo en flujos ya validados y de bajo riesgo — nunca en tareas irreversibles: borrado masivo, deploy a producción, rotación de credenciales).

---

## 5. Memoria persistente del proyecto

### CLAUDE.md / AGENTS.md
- Se genera con `/init`, se lee automáticamente en cada sesión nueva.
- Contenido: rol del agente, reglas fijas, stack, contexto de negocio, restricciones.
- **Debe mantenerse corto** — solo lo esencial. Un CLAUDE.md sobrecargado penaliza cada ejecución (más tokens leídos, respuestas más lentas y peores).
- **Nunca incluir secretos, API keys, tokens ni credenciales** — ver sección 13.

### `.claude/rules/`
- Reglas secundarias (estilo visual, convenciones de código, accesibilidad) que no van en el CLAUDE.md principal.
- Se referencian desde CLAUDE.md; el agente las carga solo cuando la tarea las necesita.

### `/memory`
- Consulta qué memoria y reglas están activas en la sesión actual.
- Auto Memory: el agente decide qué guardar por su cuenta — desactivar si se prefiere control manual total.

---

## 6. Comandos personalizados (`.claude/commands/`)

- Prompt reutilizable invocado explícitamente con `/nombre`. Nunca se dispara solo.
- Crear para tareas que se repiten siempre igual con el mismo formato de salida.
- Alcance: nivel de proyecto (`.claude/`) salvo que se use en todos los proyectos — evita cargar contexto irrelevante.

---

## 7. Skills (`.claude/skills/`)

- Habilidad que el agente invoca **automáticamente** al detectar que la tarea encaja; forzable con `/nombre-skill`.
- Estructura: carpeta con `SKILL.md` (nombre, descripción, contenido).
- Se puede fijar modelo específico por skill.
- `/skills` controla el modo de cada una: auto / name-only / user-only / desactivada.
- **Desactivar toda skill no usada en el proyecto activo** — cada una consume contexto aunque no se invoque.

---

## 8. MCP (Model Context Protocol)

- Conecta el agente a sistemas externos (bases de datos, APIs de terceros, herramientas internas).
- Alta: `/mcp`, `claude mcp add <nombre>`, o pedirlo directamente al agente.
- Configuración en `.mcp.json` (nivel proyecto) o config global.
- `/mcp` para ver conectores activos, conectar/desconectar/reconectar y listar sus tools.
- **Desconectar todo MCP no usado en el proyecto activo** — mismo principio que las skills. Cada conector activo es superficie de ataque adicional (ver sección 13).

---

## 9. Plugins

- Empaquetan comandos + skills + MCPs + hooks en una sola instalación.
- Preferir plugin oficial de una herramienta conocida antes que instalar cada pieza suelta.
- Gestión: `/plugins` o Settings → Plugins.
- Auditar el origen del plugin antes de instalar — un plugin de marketplace de terceros tiene el mismo nivel de acceso que uno oficial.

---

## 10. Subagentes y orquestación

- Trabajadores especializados con rol, permisos y modelo propios. Ejemplo: agente de solo lectura dedicado a auditoría, sin permisos de escritura.
- Se crean en `.claude/agents/`, se invocan por nombre explícito.
- Escalar de a poco: dominar un subagente antes de orquestar varios en paralelo.
- **Principio de mínimo privilegio:** cada subagente recibe solo los permisos que su tarea requiere (ej. Reviewer = Read/Grep/Glob, sin Write ni Bash).
- **Agent teams** (varios agentes coordinados entre sí): nivel avanzado, evaluar solo cuando el flujo base ya es estable.

### Secuencial vs. Paralelo

| | Secuencial | Paralelo |
|---|---|---|
| Ejecución | Dependiente | Simultánea |
| Costo | Menor en tokens, mayor en tiempo | Mayor en tokens, menor en tiempo |

**Ultra Code:** agente principal despliega subagentes paralelos especializados + un verificador final que audita y consolida. Reservar para tareas grandes que justifiquen el costo.

**Escalera de cómputo (rol del desarrollador):**
1. Operar — manejo manual de herramientas.
2. Orquestar — dirección de agentes que operan.
3. Asignar presupuesto en tokens — decisión de inversión, no de horas-hombre.

---

## 11. Hooks (`.claude/hooks/`)

- Acciones automáticas en puntos del bucle agéntico: `PreToolUse`, `PostToolUse`, `PostToolUseFailure`.
- Ejemplo: fallo de una tool dispara automáticamente una skill de verificación.
- Aplicar sobre flujos ya maduros y estables, no como punto de partida.
- Un hook mal definido en `PreToolUse` puede bloquear o alterar silenciosamente acciones — revisar su lógica igual que código de producción.

---

## 12. Control de versiones — obligatorio

- Git es requisito, no opcional. `/rewind` es un complemento de recuperación dentro de sesión, nunca un sustituto de commits.
- Commit antes de cualquier cambio estructural o de riesgo.
- Ver [[git-buenas-practicas]] para flujo de ramas, mensajes de commit, push y deploy específico de cada proyecto cliente.

---

## 13. Seguridad

### Gestión de secretos
- **El agente nunca lee, lista ni imprime valores de secretos ni variables sensibles:** `.env`, API keys, tokens, `CRON_SECRET`, `DATABASE_URL`, claves `service_role`, secretos de GitHub Actions, columnas sensibles en la base de datos. Tampoco usa opciones de descifrado ni lista las variables de los paneles para "verificar". Quien genera los valores es el usuario, en su PC, y los pega directo en cada servicio. Si algo se expone en un chat, se rota.
- **Nunca** commitear `.env`, API keys, tokens, credenciales de DB o claves privadas — `.gitignore` debe cubrirlos desde el primer commit del repo.
- Secretos siempre vía variables de entorno o gestor de secretos (Cloudflare Secrets, Supabase Vault, etc.), nunca hardcodeados ni pegados en CLAUDE.md, prompts, o `.claude/commands/`.
- Rotar credenciales que hayan sido expuestas en un chat, log o commit, aunque el repo sea privado.
- Revisar antes de cada push: `git diff --staged` para confirmar que no hay secretos en el diff.

### Superficie de exposición del agente
- Cada MCP conectado, skill activa o plugin instalado es una vía de acceso adicional a datos o sistemas — mantener conectado solo lo que el proyecto activo usa (sección 8 y 9).
- Revisar permisos de subagentes: ningún subagente de solo-lectura debería tener acceso a Bash o Write sin justificación explícita.
- Modo Auto nunca en operaciones irreversibles o sensibles: borrado de datos, rotación/generación de credenciales, deploy directo a producción sin revisión.

### Dependencias y supply chain
- Verificar origen de skills/plugins de terceros antes de instalar — mismo criterio que instalar una librería de npm/pip desconocida.
- Mantener dependencias del proyecto (`package.json`, `requirements.txt`, etc.) actualizadas; ejecutar auditoría de vulnerabilidades (`npm audit` o equivalente) como parte del checklist de cierre de tarea grande.

### Datos de usuarios / clientes
- Ningún dato personal identificable (PII) de clientes reales entra en prompts, ejemplos, o logs de sesión salvo estricta necesidad y con el conocimiento del cliente.
- Entornos de prueba usan datos sintéticos o anonimizados, nunca copia directa de producción.

### Acceso y autenticación
- Autenticación de servicios (Cloudflare, Supabase, GitHub) vía tokens con alcance mínimo necesario, no tokens de cuenta completa cuando el proyecto solo necesita un scope puntual.
- Revisar y revocar accesos de integraciones/MCP que ya no se usan.

### Base de datos (Postgres / Supabase)
- Toda tabla nueva en el esquema `public` lleva RLS (`ENABLE ROW LEVEL SECURITY`) y sus grants explícitos **en la misma migración** que la crea. Nunca depender de los privilegios por defecto: en Supabase una tabla nace abierta a `anon` y `authenticated`.
- Tras aplicar cualquier migración: correr el asesor de seguridad y confirmar que no hay `rls_disabled_in_public`.

---

## 14. Testing y verificación

- Ninguna tarea se marca cerrada sin pasar por la fase de Verificación del bucle agéntico (sección 1).
- Antes de dar por terminada una tarea de código: build limpio, lint sin errores, y si existen, tests automatizados en verde.
- Para cambios en flujos críticos (pagos, auth, deploy): smoke test manual además del automatizado.
- El agente debe reportar explícitamente qué verificó y cómo — no aceptar un "listo" sin evidencia (output de build/test, captura, log).
- Cambios de UI: verificación visual (captura o preview) antes de considerar la tarea cerrada.

---

## 15. Antipatrones conocidos

- **Contexto saturado sin `/clear`/`/compact`:** el agente empieza a inventar rutas de archivo o funciones inexistentes — cortar la sesión antes de que ocurra, no después.
- **Reescribir código correcto:** el agente "arregla" una función que ya funcionaba porque no tenía contexto suficiente del resto del sistema — mitigar con `@archivo` explícito en vez de dejar que explore libremente.
- **Auto mode en tarea irreversible:** deploy, borrado masivo o rotación de credenciales ejecutados sin revisión humana — estas tareas siempre en Plan o Manual.
- **CLAUDE.md como vertedero:** ir agregando reglas sin depurar — degrada cada sesión nueva del proyecto. Auditar y podar periódicamente.
- **Skills/MCP acumulados:** conectores de proyectos anteriores que quedan activos y consumen contexto o exponen superficie innecesaria — desactivar al cerrar cada proyecto.
- **Confiar en "listo" sin verificación:** aceptar el resultado del agente sin pasar por sección 14.

---

## 16. Automatización 24/7

| | Routines nativas | Infraestructura propia (ej. N8N en VPS) |
|---|---|---|
| Infraestructura | Gestionada | Propia |
| Escalabilidad | Limitada | Alta |
| Modelos | Solo Anthropic | Multi-proveedor |
| Costo | Incluido en plan / por consumo | Fijo y predecible |

Flujo típico de automatización externa: VPS con orquestador + API key → cargar skill/MCP correspondiente → conectar vía variables de entorno → alimentar datos base → definir arquitectura del flujo → construcción, prueba y publicación por el agente, quedando activo de forma independiente.

VPS propio: mismas reglas de seguridad de la sección 13 aplican al servidor — firewall, acceso SSH por clave (no password), actualizaciones del sistema al día.

---

## 17. Comandos de programación y monitoreo

| Comando | Función |
|---|---|
| `/loop` | Repite un prompt a intervalo fijo — monitoreo continuo, scraping periódico |
| `/goal` | Ejecuta hasta cumplir una condición medible, no por tiempo — usar con control de gasto |
| `/schedule` | Tarea programada (fecha/hora fija) |
| `/background` | Envía la sesión activa a segundo plano |
| `/fork` | Clona la conversación actual y la corre en paralelo manteniendo contexto |
| `/export` | Exporta la conversación completa |
| `/recap` | Resumen de lo ocurrido en la sesión |
| `/code-review` | Revisión automática de código |

### Framework DAME (para `/loop` y `/goal`)
- **D**isparador — evento o prompt que inicia el ciclo.
- **A**gente — acción que modifica el estado.
- **M**eta — condición booleana o métrica de verificación.
- **E**stado — diagnóstico que retroalimenta la siguiente iteración.

---

## 18. Convención de nomenclatura cross-proyecto

- **Prefijo = nombre real del proyecto**, no una etiqueta genérica. Cada proyecto tiene su propio prefijo corto y reconocible, derivado de su nombre:
  - RAI Agency → `rai-`
  - Mi Santuario → `santuario-`
  - Hotel Muévete por Vargas → `mpv-`
  - Quadro Café → `quadro-`
  - MediGo → `medigo-`
  - TenseFree → `tensefree-`
- Aplica al mismo prefijo en: nombres de skills/commands propios (`.claude/`), pestañas de terminal (ej. `RAI · <tarea>`, `Santuario · <tarea>`), ramas de Git cuando el flujo del proyecto no ya define otra convención, **y títulos de chat/sesión** (ver sección 19 — nomenclatura de chats).
- Objetivo: al ver un nombre de skill, pestaña, rama o chat, identificar el proyecto sin ambigüedad — evita que trabajo de un proyecto se filtre o se confunda con otro en sesiones donde manejas varios en paralelo.
- Nombre de proyecto en CLAUDE.md idéntico al nombre real usado en documentación y repo — evitar nombres en desuso o alias antiguos (ej. nunca "SIZERS", el proyecto es Mi Santuario).
- Carpeta `/docs/` con estructura fija por proyecto:
  ```
  /docs/
    BUENAS-PRACTICAS-CLAUDE-CODE.md   (este documento, o symlink/copia)
    CLAUDE.md                          (o en raíz, según convención del proyecto)
    ARQUITECTURA.md
    DEPLOY.md
  ```
- Un único documento de buenas prácticas como fuente — evitar copias divergentes por proyecto; actualizar aquí y propagar.

---

## 19. Cierre y continuidad de sesión

Objetivo: cortar una sesión larga (ahorro de tokens, contexto limpio) sin perder el hilo del trabajo — el estado vive en un documento, no en el historial del chat.

### Frase clave de activación
**"New session"** — frase fija de activación en todos los proyectos. Al recibirla, el agente:

1. Actualiza `/docs/ESTADO-SESION.md` del proyecto (crea el archivo si no existe) añadiendo:
   - Qué se hizo en esta sesión (resumen breve, no transcript).
   - Decisiones tomadas y su razón.
   - Archivos/módulos tocados.
   - Pendientes explícitos para la próxima sesión.
2. Entrega un **prompt listo para copiar** con el que abrir el chat/sesión nueva — carga solo lo esencial (referencia a `ESTADO-SESION.md` + próxima tarea concreta), no repite todo el historial.

### Formato de `ESTADO-SESION.md`
```markdown
# Estado de sesión — [Proyecto]
Última actualización: [fecha]

## Hecho en la última sesión
- ...

## Decisiones tomadas
- ...

## Archivos/módulos tocados
- ...

## Pendiente para la próxima sesión
- ...
```

### Formato del prompt de continuidad (lo que el agente entrega para pegar en el chat nuevo)
```
Continuamos [Proyecto]. Estado actual en /docs/ESTADO-SESION.md — léelo antes de responder.
Próxima tarea: [tarea concreta pendiente].
```

- El documento se **acumula y se poda**, no crece sin control: cada cierre de sesión sobrescribe "Pendiente" con lo vigente y archiva lo ya resuelto (no se listan tareas cerradas indefinidamente).
- Este protocolo reemplaza `/compact` cuando el corte es entre sesiones/chats distintos (Cowork → nuevo chat); `/compact` sigue siendo la herramienta correcta para reducir contexto **dentro** de la misma sesión sin cerrarla (sección 2).
- Aplica el mismo principio de sección 18: un `ESTADO-SESION.md` por proyecto, nombrado igual en todos — no versiones distintas por chat.
- **Ruta:** `/docs/ESTADO-SESION.md` dentro de la **raíz de cada proyecto/repo** — no es un archivo global compartido entre proyectos. Cada proyecto (RAI Agency, Mi Santuario, Hotel MPV, Quadro Café, MediGo, TenseFree...) tiene el suyo, junto a su propio `CLAUDE.md` y `BUENAS-PRACTICAS-CLAUDE-CODE.md`. "New session" en un proyecto solo lee/actualiza el `ESTADO-SESION.md` de ESE proyecto.

### Nomenclatura del chat/sesión (Cowork o Claude Code — distinto del documento)

El `ESTADO-SESION.md` es la fuente de verdad; el título del chat es solo para ubicarlo en el sidebar. Aun así, mismo prefijo de proyecto (sección 18) para no mezclar trabajo entre proyectos abiertos en paralelo.

- **Formato de título:** `<prefijo-proyecto> — <fase/foco> — <fecha DD mon>`. Ej.: `rai — Fase 0 seguridad — 17 sep`, `quadro — Go-live empleados — 17 sep`.
- **Un solo chat activo por proyecto a la vez** — nunca dos chats abiertos para el mismo frente de trabajo; evita que la próxima sesión adivine cuál es la fuente de verdad.
- **Al activar "New session"** (o cuando el chat se sienta pesado sin llegar a cerrar fase): renombrar el chat que se cierra con prefijo `[cerrado]` delante — ej. `[cerrado] rai — Fase 0 seguridad — 17 sep`. El chat nuevo abre con el mismo prefijo de proyecto, foco/fecha actualizados.
- **Cambio de fase** (ej. termina Fase 0, arranca Fase 1): el chat nuevo cambia el foco en el título (`rai — Fase 1 <foco> — <fecha>`), no reutiliza el de la fase anterior.
- **Borrado:** nunca inmediato. Solo después de confirmar que `ESTADO-SESION.md` y `Pendientes Abiertos` (o equivalente) ya capturaron todo lo relevante de ese chat — el chat es transcript, no respaldo. Si hay duda, dejarlo con prefijo `[cerrado]` en vez de borrar.

---

## 20. Checklist operativo

- [ ] Exploración → Planificación → Ejecución → Verificación, en ese orden, sin saltos.
- [ ] Prompt específico y acotado — el guardarraíl reduce alucinación.
- [ ] Modo Plan antes de cualquier tarea compleja o de alto impacto.
- [ ] `@archivo` cuando el fichero objetivo es conocido — no dejar que el agente lea todo el repo.
- [ ] Commit de Git antes de cambios estructurales.
- [ ] `/context` antes de tareas largas.
- [ ] `/clear` para tarea nueva sin relación, o al cerrar un archivo de ruta completo en migraciones largas (nunca a mitad de uno); `/compact` si la sesión importa pero se satura.
- [ ] Skills y MCPs no usados en el proyecto activo: desactivados.
- [ ] CLAUDE.md corto — solo lo esencial, sin secretos.
- [ ] `/model` y `/effort` ajustados a la complejidad real de cada tarea.
- [ ] Sin secretos en diff antes de push (`git diff --staged`); el agente no leyó ni imprimió valores de secretos.
- [ ] Migración con tabla nueva en `public`: RLS y grants en la misma migración; asesor de seguridad sin errores.
- [ ] Build/lint/tests en verde antes de cerrar tarea de código.
- [ ] Auto mode descartado para cualquier acción irreversible.
- [ ] Sesión larga cerrada con frase clave antes de cambiar de chat — `ESTADO-SESION.md` actualizado, no perdido en historial.
- [ ] Chat cerrado renombrado con prefijo `[cerrado]` — no borrado hasta confirmar que el documento capturó todo.

---

## 21. Plantilla CLAUDE.md por proyecto

```markdown
# [Nombre del proyecto]

Rol:
Reglas fijas:
Stack:
Contexto de negocio:
Restricciones:
```

---

*Fuente base: curso "Claude Code: Curso completo desde cero en 3 horas (2026)" — MoureDev by Brais Moure, 13 ago 2026. Adaptado a flujo de trabajo profesional propio.*
