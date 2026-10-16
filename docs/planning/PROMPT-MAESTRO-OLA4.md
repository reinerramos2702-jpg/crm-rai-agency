# PROMPT MAESTRO — Ola 4 (Claude Code / OpenCode) — 16 oct 2026

Uso: abrir Claude Code en la carpeta del repo, rama `rai-feat-dashboard-premium`. Ejecutar `/effort high`. Pegar el bloque «PROMPT» de abajo. Después, `/goal` con la condición de la sección «GOAL».
Spec cerrada: `docs/SPEC-ola4-entorno-sesion-configuracion-modulos.md`. Este prompt NO sustituye a `docs/planning/PROMPT-MAESTRO-OPENCODE.md` (bloques anteriores A/B/C); es independiente.

## PROMPT
Ejecuta el bloque completo descrito en @docs/SPEC-ola4-entorno-sesion-configuracion-modulos.md de principio a fin, de forma autónoma, sin pausas para preguntar salvo bloqueo real (credenciales o permisos faltantes, o una decisión de producto que el spec no cubra).

Preflight (antes de tocar nada): lee `AGENTS.md`/`CLAUDE.md` si existen, `docs/ESTADO-SESION.md` (sección «Ola 3»), la sección «Ola 3 — 16 oct» de `docs/planning/panel-control.html`, `docs/DISENO-EFECTOS.md` y `docs/planning/CATALOGO-GHL-DIAGNOSTICO.md`. Corre `git status` y `git branch --show-current` (debe ser `rai-feat-dashboard-premium`). Lo que no sea tuyo en `git status` no se toca ni se commitea.

Orquestación:
- Delega a subagentes la exploración y mapeo (dónde vive cada pieza) y, en S5, hasta 3 módulos en paralelo con carpetas de propiedad disjunta (su ruta, su CSS, sus `src/lib/*` nuevos y sus pruebas). Subagentes de solo lectura salvo que la tarea exija escribir. Los archivos compartidos (`globals.css`, `effects.css`, `Sidebar`, `layout`, `roles.ts`, `tours.ts`) los edita solo el hilo principal o con ediciones puntuales.
- La verificación final (tsc, eslint, vitest, build, panel-check) la haces tú directo, nunca un subagente.
- Mantén el repo compilable en todo momento: trabaja archivo por archivo y verifica a mitad de cada slice.

Bucle (repite hasta cumplir el goal o toparte con un bloqueo real), slice por slice en el orden S0 → S9 del spec:
1. Ejecuta el siguiente paso pendiente del slice.
2. Verifica: `npx tsc --noEmit`, `npx eslint src`, `npx vitest run` y la evidencia concreta que pide el spec. Nunca aceptes un «debería funcionar».
3. Si falla: diagnostica la causa real (sin parchar encima), corrige y vuelve a verificar. Tras 3 intentos con la misma estrategia, cambia de enfoque; si sigue fallando, marca el ítem `blocked` en el panel con la causa exacta y pasa al siguiente slice.
4. Si pasa: commit local del slice (mensaje convencional), actualiza el ítem del panel con comando, resultado y hash, y sigue.
5. Goal: el de la sección 4 del spec. No reportes cerrado sin cumplirlo.

Reglas fijas:
- Rama `rai-feat-dashboard-premium`, solo commits locales. NUNCA push, merge, deploy, migraciones ni cambios en `prisma/schema.prisma`, ni `IG_PUBLISH_MODE=live`, ni activar la voz real, ni llamadas reales a Retell, ni tocar producción, aunque el bucle haya cumplido el goal: eso lo decide Reiner.
- Nunca imprimas, copies ni registres valores de `.env*`; solo nombres de clave y hosts enmascarados.
- No ejecutes `next build` sobre `.next` mientras `next dev` esté abierto (usa `NEXT_DIST_DIR` distinto tras S0, o una copia).
- Sin blur; animaciones solo `transform`/`opacity` de 150–250 ms bajo `prefers-reduced-motion: no-preference`; 100 % responsive 320–1440; sin scrollers anidados; `localStorage` solo en `useEffect`; archivos ≤ 500 líneas; ortografía impecable en español; escribe siempre «Reiner».
- Si falta un dato real: no inventes; deja marcador visible y anótalo.
- No hagas verificación visual iniciando sesión con contraseñas; si no hay sesión abierta, marca «pendiente de Reiner» y entrega la lista de comprobación.
- Registra el avance en `docs/ESTADO-SESION.md`, `docs/DISENO-EFECTOS.md`, `docs/planning/RENDIMIENTO.md` y el panel (`node scripts/panel-check.mjs` debe dar 0 errores).

Al terminar (goal cumplido o bloqueo real): resumen corto de qué se hizo, evidencia de cada verificación y qué falta. Si hay bloqueo real: detente, di exactamente qué falta y no improvises.

## GOAL (para `/goal`)
`tsc` 0 errores + `eslint src` 0 + `vitest` verde + build correcto con `distDir` propio + `node scripts/panel-check.mjs` 0 errores + ítems S0–S9 de «Ola 4» en el panel `done` o `blocked` con evidencia + el grep de scrollers anidados solo devuelve excepciones documentadas + commits locales por slice + docs actualizados.
