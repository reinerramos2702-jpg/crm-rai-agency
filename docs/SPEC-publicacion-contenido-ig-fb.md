# SPEC — Publicación programada de contenido en Instagram + Facebook

Estado: **BORRADOR v1 (10 oct 2026) — NO listo para ejecutar.** Faltan los puntos de §9 (decisiones/verificaciones de Reiner). Ningún agente implementa hasta que §9 esté cerrada y Reiner lo apruebe.
Rama prevista: `rai-feat-publicacion-ig-fb`. Precondición: login (v4) cerrado. Depende de decidir la base respecto a `rai-feat-calendario-contenido` (ver §3).

## 1. Objetivo
Programar y publicar automáticamente en Instagram y Facebook lotes de contenido (p. ej. 15 publicaciones + historias) a partir de carpetas `día N` con imagen + archivo `.md` (copy/hashtags), con calendario visual en el CRM. Todo scoped por `workspaceId`.

## 2. Estado real verificado (10 oct 2026)
- Existe `src/app/api/publish/instagram/route.ts`: publica solo en IG, de forma inmediata (container + `media_publish`), permiso `canManageContent`, credenciales de `WorkspaceMetaConnection` (cifradas, por workspace; modos `shared_app` y `own_app`; guarda `igBusinessId`, `pageId`, `tokenExpiresAt`).
- No hay publicación en Facebook, ni historias, ni planificador, ni importador. `vercel.json` tiene `crons: []`.
- Rama `rai-feat-calendario-contenido` (`d6f362d`): publicada en remoto, sin merge, usa `tenantId` en lugar de `workspaceId` → requiere adaptación selectiva, no merge directo.

## 3. Reglas de la API de Meta (docs oficiales leídas el 10 oct 2026)
- IG: imágenes, reels, carruseles e historias vía Content Publishing API. **Sin programación nativa**: el CRM necesita su propio planificador. Límite ~100 publicaciones por API/24 h por cuenta (la documentación es inconsistente con 50 para carruseles → tratar 50 como tope seguro hasta verificar). Imágenes solo JPEG.
- Facebook Página: posts de feed admiten `scheduled_publish_time`; historias solo inmediatas.
- Conclusión de diseño: el CRM programa; un worker/cron dispara la publicación a la hora. Para FB feed se puede delegar la programación a Meta o usar el mismo planificador (decisión §9-D3).
- Los permisos/App Review necesarios para cuentas ajenas de clientes (modo `shared_app`) **no están verificados** → no asumir; ver §9.

## 4. Alcance (cuando §9 esté cerrada)
Slices en orden, cada uno con su gate:
1. **Modelo de datos**: `ScheduledPost` (workspaceId, plataforma IG|FB, tipo FEED|STORY, mediaUrl, caption, scheduledAt, estado PENDING|PUBLISHING|PUBLISHED|FAILED|CANCELLED, intentos, error, permalink, externalId, createdBy). Migración **solo local/dev; la remota requiere aprobación de Reiner**.
2. **Motor de publicación** (`src/lib/publishing/`): adaptadores `instagram` y `facebook` detrás de una interfaz común; reutilizar y refactorizar la lógica de `publish/instagram/route.ts` sin cambiar su contrato actual; reintentos con backoff, idempotencia por `ScheduledPost.id`, estados auditables (`logAudit`).
3. **Planificador**: endpoint `run-due` protegido por `CRON_SECRET` (patrón existente `automations/run-due`), con bloqueo anti-doble ejecución. Disparador externo (ver §9-D4); no depender del cron de Vercel Hobby.
4. **Importador `día N`**: lee carpeta `día N` (imagen JPEG + `.md`), valida (formato, tamaño, caption vacío), crea `ScheduledPost` en borrador con fecha asignada por regla (1/día a una hora configurable). Sin inventar copy: si falta `.md`, estado borrador incompleto.
5. **UI Calendario**: vista mensual/semanal de `ScheduledPost`, arrastrar para reprogramar, estado por color, editar caption, cancelar, publicar ahora. Usa tokens/`fx-*` existentes; ambos temas; respeta `SPEC-sistema-visual-premium.md` si ya está aplicada.
6. **Historias** (IG y FB inmediatas): mismo motor, tipo STORY; planificador dispara a la hora (FB sin programación nativa).
7. **Generación de imágenes dentro del CRM**: FUERA de este spec (decisión §9-D5); el flujo base es importar imágenes ya hechas (ChatGPT Work).

## 5. Criterios de aceptación (mínimos)
1. `tsc --noEmit`, lint, `vitest run` y `build` verdes (en Windows/OpenCode).
2. Tests unitarios del motor con Meta mockeado: éxito, fallo, reintento, idempotencia, token vencido, límite diario.
3. Tests de aislamiento: un workspace no ve ni publica `ScheduledPost` de otro.
4. Importador: tests con carpetas válidas, sin `.md`, imagen no JPEG, imagen enorme.
5. Prueba real de publicación en **cuenta de prueba de Reiner** (IG + FB) con evidencia (permalink); sin ella el bloque no se cierra.
6. e2e del calendario en desktop y mobile.
7. Sin tokens/secretos en logs, respuestas ni commits.
8. Sin push, merge, deploy ni migración remota sin aprobación expresa.

## 6. Reglas fijas
- Nunca publicar en cuentas reales de clientes durante desarrollo; solo cuenta de prueba aprobada por Reiner.
- Nunca registrar tokens; errores de Meta sanitizados.
- No tocar módulos estables (auth, RBAC, rate-limit) salvo lo mínimo y justificado.
- Cero dependencias nuevas salvo aprobación (si se necesita un parser de `.md`, preferir lectura simple de texto).

## 7. Costos / operación a estimar antes de aprobar
- Disparador externo del planificador (gratis vs. pago) y plan de Vercel.
- Almacenamiento de imágenes (¿URL pública estable? Meta necesita URL accesible para el container de IG).
- Si en el futuro se generan imágenes nativas: costo por imagen (fuera de alcance).

## 8. Deuda a registrar en el panel al cerrar
Generación de imágenes nativa, reels/carruseles, analítica de publicaciones, App Review para cuentas de terceros, rate-limit persistente, renovación automática de token largo.

## 9. Pendientes que bloquean la ejecución (decide/verifica Reiner)
- **D1 Cuenta Meta**: chequeo de 3 pasos (IG Business/Creator + Página FB; App en developers.facebook.com; token con permisos con tus cuentas). Estado actual: "no estoy seguro".
- **D2 Alcance de cuentas**: ¿solo cuentas propias de Reiner (modo Desarrollo) o clientes de terceros (App Review)?
- **D3 Facebook feed**: programación nativa de Meta vs. planificador propio.
- **D4 Disparador**: cron externo gratuito vs. plan de pago vs. worker propio.
- **D5 Imágenes**: confirmar que v1 solo importa imágenes ya creadas.
- **D6 Base de código**: rescatar selectivamente de `rai-feat-calendario-contenido` (adaptar `tenantId`→`workspaceId`) vs. empezar limpio.
- **D7 Hora/regla de programación** por defecto de los 15 posts.
