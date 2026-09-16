# Estado de sesión — CRM RAI Agency
Última actualización: 15 sep 2026 (sesión Cowork)

## Hecho en la última sesión
- Creado bucket R2 `crm-rai-agency-uploads` + token API R2 `crm-rai-agency-r2` (Object Read & Write, scope solo ese bucket — mínimo privilegio).
- Habilitada Public Development URL del bucket (`pub-67a8d996a3e0409993726b154de6b81c.r2.dev`) — Cloudflare la marca como rate-limited / no recomendada para producción; dominio custom queda pendiente como mejora futura.
- Agregadas a Vercel (Production + Preview, mismo scope que `R2_BUCKET` existente): `R2_ACCOUNT_ID`, `R2_PUBLIC_URL`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`.
- Usuario pegó los valores secretos, guardó y disparó redeploy en Vercel. **No verificado todavía** que el redeploy terminó bien ni que las 5 vars R2_* quedaron correctas.
- Confirmado vía `/api/me` en producción (antes de este cambio) que Vercel está healthy — DB/auth OK.
- Aclarado el alcance real del "cliente" a mostrar: es RAI Agency (uso interno de Reiner primero), no una demo externa pulida.
- Confirmado que Quadro Café (cliente de RAI Agency) también recibirá este CRM instalado para gestión de su negocio, con capacitación de staff (community manager, marketing) — pero después de que Reiner lo domine usándolo con RAI Agency como primer tenant.
- Memoria del proyecto (`overview.md`) actualizada con la relación de Quadro Café y el orden de rollout.
- Doc "ESTADO-SESION — CRM RAI Agency.md" subido al Project Knowledge de claude.ai (cuenta) — sincronizado ahora también al archivo local del repo.

## Decisiones tomadas
- R2 con token de mínimo privilegio (solo el bucket del proyecto), no token de cuenta completa — según sección 13 de buenas prácticas.
- Secretos de R2 los pega el usuario directamente en Vercel; Claude nunca los escribe ni los repite.
- Orden de rollout: 1) Reiner/RAI Agency prueba todo el CRM primero, 2) luego se instala y capacita a Quadro Café.

## Archivos/módulos tocados
- Vercel → Settings → Environment Variables (proyecto `crm-rai-agency`): 4 vars nuevas añadidas.
- Cloudflare R2: bucket + token nuevos.
- Memoria de proyecto: `overview.md` (líneas sobre Quadro Café).
- `/docs/ESTADO-SESION.md` (este archivo).

## Pendiente para la próxima sesión
- Verificar que las 5 vars `R2_*` en Vercel quedaron guardadas correctamente (sin revelar los secretos).
- Verificar que el redeploy disparado por el usuario terminó healthy (`/api/me` +, si se puede, un feature que use R2 — ej. subida de archivo/imagen).
- Renombrar el workspace de producción ("Default Workspace" / `dev-user-001`) a identidad real de RAI Agency.
- Login real del usuario y verificación visual de dashboard/launchpad/contactos en producción.
- RBAC no-owner: roles gerente/agente/viewer actualmente no aplican restricciones — siguiente prioridad después de lo anterior.
- PR #3 — módulo Instagram huérfano: resolver conflictos en `package-lock.json` y `run-due/route.ts`, luego merge.
- Backlog menor: documentar el VPS de Hostinger como recurso disponible; habilitar backups en el proyecto Supabase `bskdozxkgbxifftuulvc` (actualmente sin backups).
