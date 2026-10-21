---
description: "Cierra la sesión: actualiza docs/ESTADO-SESION.md y entrega el prompt de continuidad para la sesión nueva."
agent: build
subtask: false
---

Ejecutá el protocolo de cierre y continuidad descrito en la sección 5 de AGENTS.md:

1. Actualizá `docs/ESTADO-SESION.md` de este repo con lo hecho en esta sesión, decisiones tomadas (con motivo y alternativa descartada), archivos/módulos tocados, y pendiente vigente para la próxima sesión (sobrescribiendo, no acumulando).
2. Entregá el prompt de continuidad de 4 checkpoints, listo para copiar y pegar en la sesión nueva, tal como está especificado en AGENTS.md sección 5.

No cierres si `git status` no está limpio o si hay hallazgos sin volcar al `.md` — avisá primero (ver sección 4 de AGENTS.md).

Argumento opcional: $ARGUMENTS (ej. modo de ejecución vigente para la próxima sesión, si es distinto al default).
