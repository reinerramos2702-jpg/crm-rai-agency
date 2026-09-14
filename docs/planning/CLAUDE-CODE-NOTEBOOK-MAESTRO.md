# Claude Code — Notebook Maestro
> Fuente: curso "Claude Code: Curso completo desde cero en 3 horas (2026)" — MoureDev by Brais Moure, 13 ago 2026.
> Documento vivo. Consultar antes de cada sesión de Claude Code. Actualizar según se aprende más.
> Guardado en RAI Agency CRM / docs el 1 sep 2026 — referencia completa. Ver `BUENAS-PRACTICAS-CRM.md` para la versión aplicada a este proyecto.

---

## 1. Bucle agéntico (base de todo)
Exploración → Planificación → Ejecución → Verificación → Fin.
Claude Code ya es un "arnés" (harness) con este bucle integrado. Todo lo que sigue son capas que **tú** le añades encima para hacerlo determinista (que responda siempre igual, no al azar).

---

## 2. Instalación y primeros pasos
* Instalación: 1 comando desde documentación oficial (macOS/Linux/WSL vía PowerShell o similar).
* Verificar: `claude --version` / `claude --help`
* Alternativa sin instalar nada: claude.ai/code (versión web, requiere repo en GitHub).
* Primer arranque: `claude` → onboarding (tema color, login con suscripción o API key).

---

## 3. Comandos básicos de sesión
| Comando | Qué hace | Cuándo usar |
|---|---|---|
| `/help` | Lista comandos | Te pierdes |
| `/clear` | Abre ventana de contexto nueva (la anterior queda archivada, no se borra) | Contexto >40-50% lleno, o nueva tarea sin relación |
| `/resume` | Recupera sesión anterior | Volver a algo que dejaste a medias |
| `claude -c` | Reanuda última sesión directo desde terminal | Atajo de resume |
| `claude -r` | Selector de sesiones desde terminal | Igual que /resume pero fuera de la app |
| `/compact` | Resume la conversación actual sin perder lo esencial, reduce % de contexto usado | Chat importante que no quieres cerrar pero se llena |
| `/context` | Visualiza % de ventana de contexto usada y en qué se gasta | Antes de tareas largas, o si notas respuestas raras |
| `/config` | Configuración general (settings) | Personalizar comportamiento |
| `/status` | Uso, límites, suscripción | Controlar consumo |
| `/model` | Cambiar modelo (Haiku/Sonnet/Opus/Fable) | Cada tarea según complejidad |
| `/effort` | Nivel de esfuerzo: low → high → max → ultra code | Ajustar velocidad/coste vs inteligencia |
| **Doble `Esc`** o `/rewind` | Abre checkpoints — deshacer código Y conversación a un punto anterior | Te equivocaste y no habías comiteado con Git |
| `Shift+Tab` | Cicla entre modos: manual / accept edits / plan / auto | Cambiar nivel de autonomía del agente |
| `@archivo` | Referencia directa a un fichero del proyecto | Evitar que lea todo el repo — ahorra tokens, evita alucinación |
| `!comando` | Modo shell — ejecuta comando de terminal sin salir de Claude Code | Abrir editor, lanzar build, etc. sin exit |
| `by the way <pregunta>` | Pregunta en paralelo sin interrumpir la tarea en curso | Duda rápida mientras el agente trabaja |

⚠️ Regla de oro contexto: **40-50% ocupado = empiezan alucinaciones**. Vigila con `/context`.

---

## 4. Modelos — cuál usar cuándo
| Modelo | Uso recomendado |
|---|---|
| Haiku | Casi nunca — muy rápido pero poco listo |
| **Sonnet** | Tareas rutinarias, día a día — el que más usarás |
| **Opus** | Tareas complejas, por defecto para trabajo serio |
| **Fable** | Máximo rendimiento, caro — solo cuando necesitas lo mejor |

Modo thinking: déjalo siempre activo (mejor calidad de respuesta, más tokens).

---

## 5. Modos de edición (Shift+Tab)
| Modo | Autonomía | Recomendación |
|---|---|---|
| **Manual** (default) | Pide permiso para TODO | **Empieza aquí siempre si eres principiante** |
| **Accept edits** | Autónomo en ediciones, pide permiso para el resto | Nivel intermedio |
| **Plan** | No escribe código — solo planifica, pregunta dudas, presenta plan a revisar | **Usar antes de cualquier tarea compleja o primer proyecto** |
| **Auto** | Decide y ejecuta todo solo | Solo si ya controlas bien el flujo — riesgo alto para principiante |

**Flujo recomendado para ti ahora mismo:** modo plan → revisar/modificar el plan → aprobar → ejecutar en manual o accept edits (no auto todavía).

---

## 6. Memoria persistente

### CLAUDE.md / AGENTS.md
* `/init` genera el fichero de memoria principal del proyecto.
* **CLAUDE.md** = específico de Claude Code. **AGENTS.md** = estándar cross-herramienta (Codex, Cursor, etc. también lo leen). Mismo propósito, distinto nombre.
* Se lee automáticamente en cada sesión nueva del proyecto.
* **Regla de oro: CORTO.** Solo lo esencial — rol del agente, reglas fijas, stack, contexto de negocio. Un CLAUDE.md de 5000 líneas penaliza cada ejecución.
* Qué pasa si lo saturas: gasta tokens en leerlo cada vez, ralentiza, empeora respuestas.

### `.claude/rules/` — reglas secundarias
* Para reglas específicas (estilo visual, JS, accesibilidad) que NO deben ir en el CLAUDE.md principal.
* Se referencian desde CLAUDE.md, no se cargan solas.
* El agente las lee solo cuando la tarea las necesita → ahorra contexto.

### `/memory` y Auto Memory
* `/memory` → consulta qué memoria/reglas tiene cargadas ahora mismo.
* Auto Memory (on/off) → el propio agente decide guardar cosas que considera importantes. Si no lo quieres, apágalo.

---

## 7. Comandos personalizados (`.claude/commands/`)
* **Qué son:** un prompt reutilizable que TÚ invocas con `/nombre`.
* **Cuándo crear uno:** tarea que repites siempre igual (ej: "convierte esta idea en una card con título+descripción+emoji").
* **Cómo:** "crea un comando personalizado en .claude/commands llamado X que haga Y". Se guarda como `.md` en esa carpeta.
* **Diferencia clave con skill:** el comando SOLO se ejecuta si tú escribes `/comando`. Nunca se dispara solo.
* Recomendación: crear a nivel de proyecto (`.claude/`), no global, salvo que sepas que lo usarás en todos tus proyectos — evita meterle contexto irrelevante al agente.

---

## 8. Skills (`.claude/skills/`)
* **Qué son:** una habilidad que el agente puede invocar **automáticamente** si detecta que la tarea encaja, sin que tú la llames.
* Estructura: carpeta con `SKILL.md` (nombre, descripción, contenido de la habilidad).
* Se puede forzar la llamada manual con `/nombre-skill`.
* Se puede fijar modelo específico para una skill (ej: siempre Sonnet aunque la sesión esté en Opus) — se pone en la config de la skill.
* **Control de skills:** `/skills` → puedes poner cada una en auto / name-only (solo si la llamas) / user-only / desactivada. Desactiva las que no uses — cada skill cargada consume contexto.
* Skills de comunidad: skills.sh y repos de GitHub (ej: "frontend-design" con cientos de miles de instalaciones). Se instalan desde la propia app (Settings → Skills → buscar) o pidiéndoselo al agente.
* **Cuándo crear skill vs comando:** ¿quieres que se dispare solo cuando la IA detecta la necesidad? Skill. ¿Quieres controlarlo tú 100%? Comando.

---

## 9. MCP (Model Context Protocol)
* **Qué es:** conexión del agente a sistemas externos (bases de datos, Slack, email, herramientas de terceros). Como un puerto USB.
* Se añade con `/mcp` o `claude mcp add <nombre>`, o pidiéndoselo al agente ("añade el MCP de Playwright a nivel de proyecto").
* Se guarda en `.mcp.json` en la raíz del proyecto (nivel proyecto) o config global.
* `/mcp` → ver conectados, conectar/desconectar/reconectar, ver tools que ofrece.
* **Igual que skills: desactiva los que no uses.** Cada MCP conectado es contexto/tokens gastados.
* Gestión visual: app de escritorio → Settings → Connectors (marketplace tipo Supabase, con botón "Conectar" directo).

---

## 10. Plugins
* Empaquetan comandos + skills + MCPs + hooks en una sola instalación.
* Úsalo cuando una herramienta de terceros conocida (ej. Playwright) ya trae su plugin — más rápido que instalar cada pieza suelta.
* Disponible desde `/plugins` o Settings → Plugins en la app de escritorio.

---

## 11. Subagentes y orquestación
* **Qué son:** "trabajadores" especializados que tú creas, con su propio rol, permisos y modelo.
* Ejemplo: agente "Reviewer" — solo lectura (Read/Grep/Glob, sin Write), modelo Opus, tarea única = auditar accesibilidad.
* Se crean en `.claude/agents/` (o `.agents/` equivalente cross-tool).
* Se invocan: "usa el agente Reviewer para analizar la web".
* **No te compliques todavía** — dominar 1 agente bien antes de crear varios.
* **Agent teams:** varios Claude coordinados en paralelo que se hablan entre sí. Nivel avanzado, no es prioridad ahora.

### Secuencial vs Paralela
| | Secuencial | Paralela |
|---|---|---|
| Ejecución | Uno depende del anterior | Simultánea, sin dependencias |
| Costo | Menos tokens, más tiempo | Más tokens, menos tiempo |

**Ultra Code** (nivel de esfuerzo máximo): agente principal despliega un enjambre de subagentes paralelos especializados + 1 agente verificador final que audita y consolida. Caro, úsalo solo en tareas grandes que lo justifiquen.

**Escalera de cómputo** (evolución del rol del desarrollador):
1. **Operar** — humano maneja herramientas manualmente
2. **Orquestar** — humano dirige agentes que operan
3. **Apostar** — humano asigna presupuesto en tokens (no horas-hombre); hay correlación real costo↔calidad

---

## 12. Hooks (`.claude/hooks`)
* Acciones automáticas en momentos concretos del bucle agéntico: `PreToolUse`, `PostToolUse`, `PostToolUseFailure`.
* Ejemplo: si una tool falla → dispara automáticamente skill de tests para verificar que nada se rompió.
* No lo necesitas de entrada — es refinamiento sobre un flujo ya maduro.

---

## 13. Editores de código clásicos
* Terminal (recomendado por el autor) / App de escritorio Claude / Extensión en VS Code-like (Cursor, VS Code, Antigravity).
* Extensión oficial "Claude Code" para editores → integra el chat dentro del editor. Opcional, cuestión de preferencia.

---

## 14. Modelos locales gratis (Ollama)
* Instalar Ollama, descargar modelo (ej. Qwen, Gemma), lanzar con `ollama launch claude`.
* Permite usar Claude Code sin suscripción ni coste, con modelos más pequeños/lentos/menos listos, pero privados y gratis.
* Útil si tienes máquina potente y quieres el "harness" de Claude Code sin pagar modelos Anthropic.

---

## 15. Comandos extra
| Comando | Qué hace |
|---|---|
| `/loop` | Repite un prompt en bucle a intervalo de tiempo — monitoreo 24/7, scraping periódico |
| `/goal` | Ejecuta hasta cumplir una condición medible (no por tiempo) — debugging autónomo, refinamiento iterativo. ⚠️ Puede correr horas — cuidado con el gasto |
| `/schedule` | Tarea programada (ej. "todos los lunes 9am ejecuta X") |
| `/background` | Manda la sesión actual a segundo plano, libera terminal |
| `/fork` | Copia la conversación actual y la lanza en segundo plano (mantiene contexto) |
| `/bug` | Reporta errores a Anthropic |
| `/export` | Exporta toda la conversación a fichero de texto |
| `/recap` | Resumen de lo que ha pasado en la sesión |
| `/permissions` | Ver permisos de tools activos |
| `/code-review` | Revisión automática de código |

### Framework DAME (para /loop y /goal)
* **D**isparador — evento/prompt que inicia el ciclo
* **A**gente — acción que modifica la variable
* **M**eta — pregunta booleana/métrica de verificación
* **E**stado — diagnóstico que retroalimenta la siguiente iteración

---

## 16. Automatización 24/7 — dos caminos
| | Routines nativas (Anthropic) | N8N en VPS propio |
|---|---|---|
| Infraestructura | Nube Anthropic | Servidor privado propio |
| Escalabilidad | Limitada | Alta |
| Modelos | Solo Anthropic | Multimodelo (OpenRouter, OpenAI, etc.) |
| Costo | Incluido en plan, cobra por cuota/tokens | Fijo, predecible |

**Flujo N8N + MCP (ej. cotizador automático):**
1. VPS con N8N + API key
2. Cargar skill N8N + conector MCP (`/mcp`)
3. Conectar vía variables de entorno
4. Alimentar datos base (CSV/catálogo)
5. Prompt maestro pidiendo la arquitectura del flujo
6. Claude Code construye nodos, prueba, publica en N8N — queda activo sin mantener la PC encendida

---

## 17. Browser Control + Segundo Cerebro
* **Browser Control nativo:** Chromium integrado y aislado (sin cuentas/historial personal), visión agéntica por capturas de pantalla. Reemplaza Playwright para sitios sin API/MCP.

| | RAG | Obsidian |
|---|---|---|
| Base | Vectorización semántica | Notas Markdown interconectadas |
| Uso | Bases de datos gigantes | Estrategia, contexto personalizado, ideas |

* **God Node:** nota central en Obsidian que ancla todos los subtemas — le da a la IA visión general instantánea del negocio.

---

## 18. Buenas prácticas — checklist
* [ ] Exploración → Planificación → Ejecución → Verificación, siempre en ese orden
* [ ] Sé específico en los prompts — cuanto mejor el guardarraíl, menos alucina
* [ ] Modo plan para cualquier tarea compleja o primer proyecto
* [ ] `@archivo` cuando sepas exactamente qué fichero tocar — no dejes que lea todo el repo
* [ ] Git obligatorio (rewind/checkpoints es un extra, no un sustituto)
* [ ] `/context` antes de tareas largas — 40-50% = cuidado
* [ ] `/clear` para tarea nueva sin relación, `/compact` si el chat importa pero se llena
* [ ] Desactiva skills/MCPs que no uses en el proyecto — cada uno cuesta contexto
* [ ] CLAUDE.md corto — solo lo esencial
* [ ] `/model` + `/effort` según complejidad real de cada tarea, no siempre el más caro

---

## 19. Plantilla CLAUDE.md por proyecto (rellenar por cada uno)
> Nota: se corrigió "SIZERS" → tu proyecto se llama **Mi Santuario**.

```markdown
# CRM RAI Agency
Rol:
Reglas fijas:
Stack:
Contexto de negocio:
Restricciones:
```
