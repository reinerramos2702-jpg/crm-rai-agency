# SPEC — Publicación programada de contenido en Instagram + Facebook

Estado: **v2.1 (10 oct 2026) — decisiones D2–D9 cerradas (§9).** Ejecutable por slices 1–6 con Meta simulado; lo que depende de cuentas/secretos reales de Reiner está en §10 y se marca `blocked`, no se pregunta. Requiere login v4 cerrado antes de arrancar (precondición).
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
- **Instagram sin Página (verificado en docs 10 oct):** la ruta "Instagram Login" (permisos `instagram_business_basic`, `instagram_business_content_publish`) no declara requerir una Página de Facebook; la ruta "Facebook Login" (`instagram_basic`, `instagram_content_publish`, `pages_read_engagement`) sí usa token de Página. El adaptador debe soportar la ruta que `WorkspaceMetaConnection` tenga configurada.
- **Facebook exige una Página:** la documentación leída solo cubre publicar en Páginas; publicar en un perfil personal no está confirmado → se trata como no soportado. Reiner no tiene Página confirmada (usa su perfil personal) → crear una Página gratis es prerrequisito de FB (ver §10).
- No verificado en docs: comportamiento del modo Desarrollo sin App Review para cuentas propias → tratar como supuesto hasta la prueba real.
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
7. **Persistencia de marca y datos del negocio en DB (D9)**: hoy `ContentIGTab` guarda todo (negocio, marca, manual de marca, reglas, handle) solo en `localStorage` del navegador (claves `rai-ig-*`). Crear modelo `BrandProfile` por `workspaceId` (campos: nombre, tipo, ubicación, web, teléfono, WhatsApp, servicios, público, competidores, colores, tono, documento de marca, modo de fotos/logo, handle IG, hora por defecto, reglas de lenguaje, notas), endpoints GET/PUT con RBAC (`canManageContent`), y migrar `ContentIGTab` para leer/guardar vía API (con `apiFetch`). Importación única desde `localStorage` si la DB está vacía (con confirmación del usuario). Tests: aislamiento por workspace, validación de entrada, límites de tamaño del documento de marca. Migración solo local/dev.
8. **Generación de imágenes dentro del CRM**: FUERA de este spec (decisión §9-D5); el flujo base es importar imágenes ya hechas (ChatGPT Work).

## 5. Criterios de aceptación (mínimos)
1. `tsc --noEmit`, lint, `vitest run` y `build` verdes (en Windows/OpenCode).
2. Tests unitarios del motor con Meta mockeado: éxito, fallo, reintento, idempotencia, token vencido, límite diario.
3. Tests de aislamiento: un workspace no ve ni publica `ScheduledPost` de otro.
4. Importador: tests con carpetas válidas, sin `.md`, imagen no JPEG, imagen enorme.
5. Prueba real de publicación en **cuenta propia de Reiner** (IG + Página de FB) con evidencia (permalink); sin ella el bloque no se declara cerrado, pero los slices 1–6 sí pueden quedar `done` con Meta simulado (ver §10).
6. e2e del calendario en desktop y mobile.
7. Sin tokens/secretos en logs, respuestas ni commits.
8. Sin push, merge, deploy ni migración remota sin aprobación expresa.

## 6. Reglas fijas
- Nunca publicar en cuentas de clientes; en desarrollo solo cuentas propias de Reiner y solo cuando D1 esté verificado.
- Nunca registrar tokens; errores de Meta sanitizados.
- No tocar módulos estables (auth, RBAC, rate-limit) salvo lo mínimo y justificado.
- Cero dependencias nuevas salvo aprobación (si se necesita un parser de `.md`, preferir lectura simple de texto).

## 7. Costos / operación a estimar antes de aprobar
- Disparador externo del planificador (gratis vs. pago) y plan de Vercel.
- Almacenamiento de imágenes (¿URL pública estable? Meta necesita URL accesible para el container de IG).
- Si en el futuro se generan imágenes nativas: costo por imagen (fuera de alcance).

## 8. Deuda a registrar en el panel al cerrar
Generación de imágenes nativa, reels/carruseles, analítica de publicaciones, App Review para cuentas de terceros, rate-limit persistente, renovación automática de token largo.

## 9. Decisiones cerradas por Reiner (10 oct 2026)
| Id | Decisión | Consecuencia para el agente |
|---|---|---|
| D2 | v1 publica **solo en las cuentas propias de Reiner** (app `RAI Agency Publisher`, modo Desarrollo, Reiner es Administrador). Futuro: cada cliente conecta su propia cuenta/app de Meta al CRM y publica con su token. | No construir App Review ni flujo de terceros. **Sí** mantener todo scoped por `workspaceId` y reutilizar `WorkspaceMetaConnection` (ya soporta `own_app`), sin asumir una sola cuenta global. Registrar "cuentas de clientes" como deuda en el panel. |
| D3 | **Planificador propio** para IG y FB (feed e historias). | No usar `scheduled_publish_time` de Meta. Un solo modelo de estados. |
| D4 | Disparador: **GitHub Actions programado** (cron cada ~5 min) que llama a `run-due` con `CRON_SECRET`. | Crear el endpoint y un workflow `.github/workflows/publish-scheduler.yml` (el secreto y la URL los configura Reiner en GitHub; ver D8). Documentar que puede retrasarse unos minutos. Sin cron de Vercel. |
| D5 | v1 **solo importa** imágenes ya creadas (carpetas `día N`). Generación de imágenes: fase posterior. | Fuera de alcance. |
| D6 | **Rescate selectivo** de `rai-feat-calendario-contenido`. | Auditar esa rama, adaptar solo lo compatible (`tenantId`→`workspaceId`, RBAC, `apiFetch`); sin merge directo. Registrar qué se rescató y qué no. |
| D9 | La marca/datos del negocio de RAI Agency deben vivir en **base de datos por workspace**, no en `localStorage`. Mientras no exista (slice 7), Claude rellena el formulario en el navegador 2 como carga provisional (hecho el 10 oct: datos de RAI Agency, @raiagency__, dominio `raiagency.net` confirmado como oficial). | Implementar el slice 7; al migrar, importar esos valores a `BrandProfile`. Tarea fija de Claude (navegador 2): mantener lleno y verificado el formulario Contenido IG. |
| D7 | Regla de horarios por defecto (supuesto reversible): 1 publicación por día a las 10:00 hora de Caracas (UTC-4), configurable por lote. | Implementar como parámetro del importador, no como constante. |

## 10. Lo único que el agente NO puede cerrar solo (preparar y marcar `blocked`, no preguntar)
Estas tareas se dejan listas y registradas en el panel como `blocked` con la causa exacta; el resto del bloque avanza igual:
- **D1 pasos 1 y 3 (Meta, real):** Reiner confirmó (10 oct) que `@raiagency__` es cuenta **Instagram Business**. Falta: (a) crear una **Página de Facebook** (gratis) y vincularla a la cuenta, necesaria para publicar en FB y para la ruta Facebook Login de IG; (b) token con permisos de publicación de la app `RAI Agency Publisher`. Verificado el 10 oct: la app existe en modo Desarrollo y Reiner es Administrador; el vínculo IG↔Página y los permisos **no** están verificados. Nota: el navegador 2 no tiene sesión de Instagram iniciada; Reiner debe iniciar sesión él mismo (el agente nunca introduce contraseñas).
- **D8 secretos y operación:** `CRON_SECRET`, URL de la app y activación del workflow de GitHub los configura Reiner; la migración Prisma remota y cualquier deploy requieren su aprobación.
- **Criterio de aceptación 5 (publicación real en cuenta de prueba):** se prepara el script/checklist y se marca `blocked` hasta que D1 esté verificado. Los slices 1-6 se verifican con Meta simulado (mock) y no dependen de esto.
