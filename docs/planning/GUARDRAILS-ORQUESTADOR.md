# Guardrails del orquestador autónomo (10 oct 2026)

Objetivo: que el orquestador pueda trabajar con mínima interacción sin poder editar sus propias reglas ni declarar "hecho" sin evidencia.

## Piezas
| Pieza | Qué hace | Quién la cambia |
|---|---|---|
| `scripts/gate.mjs` | Corre reglas → panel → typecheck → lint → tests → build; falla rápido; el exit code manda. `--fast` omite build. | Solo Reiner |
| `scripts/panel-check.mjs` | Divs/sections/spans balanceados, `data-status` válido y coherente con clases, `data-id` sin duplicados, avisos de ítems "hechos" sin evidencia. | Solo Reiner |
| `scripts/rules-guard.mjs` + `.rai-rules.lock` | Hash SHA-256 de `AGENTS.md`, agentes, comandos, workflows y los propios scripts. Si cambian sin aprobación, el gate falla. | Solo Reiner (`--update` tras revisar el diff) |
| `orchestrator.md` (sección nueva) | Reglas inmutables, gates, detección de atasco, una sola puerta de aprobación. | Solo Reiner |

## Límites honestos
- OpenCode no confirma aquí si `permission.edit` admite patrones por ruta; por eso la protección real es el hash (`rules-guard`) + el gate en CI, no un deny de permisos. Verificar en la documentación de la versión instalada antes de depender de ello.
- El orden de los patrones `bash` ("el último gana") no está verificado en este repo; los `allow` de git de solo lectura son una mejora de fricción, no una garantía de seguridad.
- `CODEOWNERS` NO se creó: requiere el usuario/equipo de GitHub real de Reiner (no se inventa). Pendiente.
- Para que el gate bloquee de verdad hay que añadir `node scripts/rules-guard.mjs` y `node scripts/panel-check.mjs` a `.github/workflows/ci.yml` (cambia un archivo de reglas → aprobación de Reiner).
- Los `data-id`/`data-spec`/`data-gate` por ítem del panel quedan para una iteración posterior (el verificador ya los valida si existen).
