# Estado de sesión — CRM RAI Agency
Última actualización: 7 septiembre 2026

## Hecho en la última sesión
- Centralizada toda la planeación (antes solo en OneDrive de una PC) en `docs/planning/` del repo: `panel-control.html`, `MASTER-PROMPT-V3-NOCTURNO.md`, 5 docs de soporte, `claude-outputs/`.
- `v2.0-master-prompt/` fusionado como Anexo 15 dentro de `MASTER-PROMPT-V3-NOCTURNO.md` y eliminado por completo (ya no existe en ningún lado).
- Limpiados duplicados sueltos en la carpeta OneDrive (panel-control.html en raíz, carpeta v3.0-master-prompt/, docs/*.md sueltos, Claude outputs/) — verificados byte a byte contra `docs/planning/` antes de borrar. `docs/planning/` queda como única copia.
- `panel-control.html` actualizado con el estado real del proyecto (PR #6 mergeado, catálogo GHL 8 fichas, Retargeting Fase 1, PR #10, más una nueva sección "6-7 SEP" con todo lo de esta sesión).
- Carpeta local de Windows renombrada: `content-engine-mvp` → `crm-rai-agency`.
- Worktrees git obsoletos eliminados del disco: `content-engine-mvp-bloque1` (PR #6, ya mergeado) y `crm-rai-agency-v2` (PR #10, ya pusheado) — nada se perdió, todo vive en GitHub.
- Rama `docs/centralizar-planeacion` creada en un worktree limpio, con los archivos de `docs/planning/` ya comiteados — el sandbox de Cowork no tiene credenciales de git para hacer push.

## Decisiones tomadas
- La ruta OneDrive `C:\Users\RAI Agency\OneDrive\Documentos\RAI Agency\RAI Agency CRM` pasa a ser **para siempre** el working directory real del repo (clon git, no carpeta de docs suelta) — sincroniza sola entre computadoras. Ejecutado por Reiner directamente.
- Consecuencia: la carpeta plana `C:\Users\RAI Agency\crm-rai-agency` (el checkout renombrado hoy) queda redundante — **pendiente decisión de Reiner** de si se borra.

## Archivos/módulos tocados
- `docs/planning/panel-control.html`, `docs/planning/MASTER-PROMPT-V3-NOCTURNO.md` (repo + OneDrive, misma ruta ahora).
- Carpetas eliminadas: `v2.0-master-prompt/` (OneDrive), duplicados sueltos en OneDrive, `content-engine-mvp-bloque1/` y `crm-rai-agency-v2/` (disco local).
- Cowork Project doc `Pendientes Abiertos — CRM RAI Agency.md` actualizado con todo lo anterior.

## Pendiente para la próxima sesión
1. **Push + PR de `docs/centralizar-planeacion`** — ejecutar desde la terminal local de Claude Code de Reiner (ahí `gh` ya está autenticado). Prompt exacto ya entregado en esta sesión.
2. **Decidir si se borra la carpeta plana `crm-rai-agency`** (redundante con la copia de OneDrive) — pregunta pendiente de respuesta.
3. Reconectar en Cowork la carpeta OneDrive tras cualquier operación de git pesada (verificar que el link no se cortó).
4. El resto del backlog técnico grande (PR #3, RBAC no-owner, migración de producción, etc.) sigue en `claude/Pendientes Abiertos — CRM RAI Agency.md` del proyecto de Cowork — no se repite aquí.
