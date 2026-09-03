# Historial de entregas — CRM RAI Agency

> Registro de cada bloque cerrado durante la ejecución nocturna de `v3.0-master-prompt/MASTER-PROMPT-V3-NOCTURNO.md`. Un bloque por sección, fecha + qué se entregó + qué quedó bloqueado. No se borra entre sesiones.

---

## 3 sep 2026 — BLOQUE 0: Diagnóstico, sincronización y fix de entorno

**Rama:** `v3/bloque-0-diagnostico-sincronizacion` · **PR:** (este mismo bloque, ver enlace en el mensaje del PR)

### Completado

1. **Clon local localizado y confirmado.** `content-engine-mvp` (worktree principal, rama `main`) con remote `https://github.com/reinerramos2702-jpg/crm-rai-agency.git` — ya no dice `content-engine-mvp` como nombre de repo remoto, solo la carpeta local conserva el nombre viejo.
2. **Sincronización modo espejo:** `git fetch origin` + comparación de HEAD — `main` local ya estaba **100% al día** con `origin/main` (`8eb1ccc`), sin divergencia. No hizo falta pull/rebase.
3. **`GITHUB_TOKEN` inválido — diagnosticado, workaround aplicado, fix permanente PENDIENTE de aprobación del usuario:**
   - Causa confirmada: variable de entorno de **usuario** de Windows `GITHUB_TOKEN` con un token `ghp_...` expirado/inválido, que `gh` prioriza sobre la cuenta autenticada por device flow (keyring, cuenta `reinerramos2702-jpg`, scopes `gist, read:org, repo`).
   - Intento de borrarla (`[Environment]::SetEnvironmentVariable("GITHUB_TOKEN", $null, "User")`) fue **bloqueado por el permission classifier** de Claude Code (cambio de entorno persistente del sistema, fuera de alcance sin confirmación explícita del usuario).
   - **Workaround aplicado toda la noche:** anteponer `GITHUB_TOKEN= GH_TOKEN=` a cada invocación de `gh`, forzando el uso de la cuenta del keyring. Confirmado funcional (usado para pushear ramas, comentar y abrir PRs).
   - **Acción pendiente para el usuario:** borrar manualmente la variable de entorno de usuario `GITHUB_TOKEN` en Windows (Panel de Control → Variables de entorno, o `[Environment]::SetEnvironmentVariable("GITHUB_TOKEN", $null, "User")` en una PowerShell propia) para que `gh auth status` vuelva a mostrar `Active account: true` en la cuenta correcta sin necesitar el workaround.
4. **Diagnóstico real del repo confirmado vía `gh pr list --state all`:**
   - **PR #1** (fix build Fase 1) → **MERGEADO**, confirmado en el historial de commits (`Merge pull request #1 from fase-1/estabilizacion`).
   - **PR #2** "BLOQUE 0 — Renombrado de marca" (`v2/renombrado-marca` → `main`) → **ABIERTO**, sigue esperando aprobación/merge explícito del usuario. No se tocó (regla no negociable #2).
   - **Rama Instagram huérfana** `claude/rai-instagram-crm-automation-ykkwg2` → seguía suelta, sin PR. Diverge de `main` en `4d60003` con 5 commits propios (módulo completo de auto-publicación + DMs por keyword, `src/lib/instagram.ts` 527 líneas, 34 archivos, +3201/-52). **Se abrió PR #3** de revisión (`main` ← rama Instagram) para que el usuario decida integrar/descartar — no se mergeó.
   - **Playwright:** está en `package.json` como dependencia (`"playwright": "^1.60.0"`) pero **sin configurar** — no existe `playwright.config.ts`, ni carpeta `tests/`/`e2e/`, ni script de test. El testing obligatorio de la sección 3 del master prompt necesita instalar `@playwright/test` y crear la configuración desde cero en el Bloque 1 (no solo "usarlo", hay que armarlo).
   - **Deploy vivo con residuos de otro proyecto** (`content-engine-mvp.vercel.app` mostrando "Cargando KPIs del hotel…") — confirmado, sigue sin resolver. Es un problema de configuración de deploy en Vercel, no de código; queda documentado, no se toca desde este bloque (fuera de alcance de diagnóstico de git/código).
   - **Check de Cloudflare Workers en rojo en PR #2** — confirmado presente, no bloqueante (Vercel preview sí compiló). Sigue sin decidirse si la integración de Cloudflare sigue siendo necesaria; queda para revisión del usuario junto con el merge de PR #2.
5. **Worktree `crm-rai-agency-v2`** (rama `v2/modulo-calendario-contenido`, construida sobre PR #2) — reconciliado en sesión previa (3 sep), trabajo pendiente ya comiteado (`05257e8`) y pusheado a `origin/v2/modulo-calendario-contenido`. `npx tsc --noEmit` pendiente de reconfirmar ahí antes de seguir tocando ese módulo (regla explícita de esta sesión) — ver bloque de verificación más abajo.

### Orden de ejecución decidido para el resto de la noche

- **Bloque 0.5 (auditoría de arquitectura)** — sigue inmediatamente, obligatorio antes de tocar cualquier código de producto, aunque el diagnóstico sugiera que partes del Bloque 1/2A ya podrían existir en `v2/modulo-calendario-contenido`.
- **Bloque 1 (multi-tenant + RBAC + Meta híbrido)** — su necesidad real (¿ya existe algo?) se confirma en el 0.5, no aquí.
- **Bloque 2A/2B (calendario)** — el worktree `crm-rai-agency-v2` ya tiene avance real (`service.ts`, `publisher.ts`, `settings/route.ts`, schema) — el 0.5 debe inventariarlo en detalle para no reconstruir.
- **Bloques 3-6** — sin cambios de orden respecto al master prompt (dependen de los anteriores).

### Bloqueado

- Fix permanente de `GITHUB_TOKEN` (variable de entorno de usuario) — requiere acción manual del usuario, ver arriba. No bloquea el resto de la noche gracias al workaround por sesión.
- Deploy vivo con residuos de Hotel MPV — fuera de alcance de este bloque (config de Vercel, no código/git).

### Verificación

- `git rev-parse HEAD origin/main` → mismo hash, confirmado sincronizado.
- `gh pr list --state all` (con workaround) → funcional, 3 PRs abiertos/cerrados listados correctamente.
- `tsc`/`build`: este bloque no tocó código de producto (solo diagnóstico + este archivo), no aplica.

---
