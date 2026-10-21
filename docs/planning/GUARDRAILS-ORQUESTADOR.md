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
- `.github/CODEOWNERS` creado con el usuario real `reinerramos2702-jpg`. Solo es obligatorio si Reiner activa en GitHub la regla de rama "Require review from Code Owners" (no se pudo activar desde aquí).
- `ci.yml` incluye el job `guardrails` (rules-guard + panel-check) en esta rama; entra en vigor solo si Reiner aprueba el merge.
- Los atributos `data-*` del panel son opcionales y aditivos; ver sección siguiente. No se reescribió el panel (evita conflictos con la rama del login).

## Convención de atributos `data-*` (opcionales, aditivos)
El JS del panel solo depende de `data-status` (`pending|done|blocked`) y de la clase `done`; esos NO cambian. Para el control autónomo se pueden añadir por ítem:

| Atributo | Valor | Validación de `panel-check` |
|---|---|---|
| `data-id` | id estable (p. ej. `LOGIN-01`) | único |
| `data-phase` | `ready`, `in_progress`, `qa`, `needs_decision`, `failed`, `unverified` | vocabulario cerrado |
| `data-depends-on` | ids separados por coma | cada id debe existir; sin autorreferencia |
| `data-attempts` | entero | numérico |
| `data-commit` | hash git (7-40 hex) | formato |
| `data-spec`, `data-gate`, `data-branch`, `data-started-at`, `data-verified-at` | texto | sin validar aún |

Mapa de estados: `ready/in_progress/qa` = `pending` + `data-phase`; `needs_decision/failed/unverified` = `blocked` + `data-phase` + causa en `check-desc`. Cada ítem nuevo debería nacer con `data-id`; los 82 existentes se migran por lotes en una tarea propia del panel.
