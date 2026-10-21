# SPEC — Programación y publicación automática en Instagram (v0.2 BORRADOR)

Fecha: 13 oct 2026. Estado: borrador, sin implementar, NO enviado a OpenCode.
Decisión de Reiner (13 oct): por ahora solo Instagram. El community manager de cada empresa programa un lote, pulsa **Programar** y se olvida: el CRM publica solo cada día a la hora fijada.

## 1. Objetivo
- Botón **Programar** en el calendario de contenido: deja los posts del lote en estado `scheduled`.
- Un proceso periódico (cron) publica en Instagram los posts cuya hora ya llegó, sin intervención humana.
- Multi-tenant: cada workspace usa su propia cuenta IG conectada; nunca publica con la cuenta de otro.

## 2. Hechos a verificar en la documentación oficial de Meta antes de implementar (no asumir)
- Flujo de publicación: crear contenedor de medios y luego publicarlo (`/{ig-user-id}/media` → `/{ig-user-id}/media_publish`); carruseles = contenedores hijos + contenedor padre.
- Permisos necesarios (esperados): `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `pages_read_engagement`. Verificar la lista exacta vigente.
- Las imágenes deben estar en una URL pública; verificar formato aceptado (se espera JPEG; los PNG actuales de `Plan 31-1102026/salida` podrían requerir conversión).
- Existe un límite diario de publicaciones por API y de elementos por carrusel; verificar cifras vigentes.
- La app está en modo "Sin publicar" (desarrollo): publica solo con cuentas con rol en la app. Para cuentas de clientes hace falta App Review (+ posible verificación de negocio). Ver P7 de `SPEC-planes-monetizacion.md`.

## 3. Diseño propuesto
- Modelo `ScheduledPost` (workspaceId, socialAccountId, caption, mediaUrls[], mediaType image|carousel, scheduledAt, status `draft|scheduled|publishing|published|failed`, attempts, lastError, igMediaId, publishedAt). Migración nueva, índice (status, scheduledAt).
- Almacén de imágenes con URL pública (Supabase Storage o similar; decidir) y conversión a JPEG si Meta lo exige.
- Cron `POST /api/cron/publish` (protegido con secreto, no público): toma posts `scheduled` con `scheduledAt <= now` usando bloqueo (`UPDATE ... WHERE status='scheduled' RETURNING`) para que no se publique dos veces; reintentos con tope; registra `logAudit`.
- Idempotencia: guardar `igMediaId` apenas exista el contenedor; si falla tras crear, reanudar sin duplicar.
- UI: botón Programar (con confirmación y resumen del lote), vista de estado por día, botón Reintentar/Cancelar, aviso si el token de la cuenta expiró.
- Tokens de Meta cifrados en BD; nunca en logs.
- Revisar antes la rama remota `claude/rai-instagram-crm-automation-ykkwg2` (trae `src/app/api/cron/instagram/route.ts` y módulo Instagram que no está en `main`) para reutilizar, no duplicar.
- Planes: publicación automática es función de pago (34 USD en adelante) según `SPEC-planes-monetizacion.md`; Reiner/RAI la usa sin tope mientras tanto.

## 4. Criterios de aceptación (para el prompt maestro)
- Un lote de N posts programados se publica en su hora sin acción humana en un entorno real de prueba (cuenta IG de RAI), con evidencia (captura + `igMediaId`).
- Un post nunca se publica dos veces (test de concurrencia/reintento).
- Un workspace no puede programar sobre la cuenta de otro (test de aislamiento).
- Fallo de Meta → estado `failed` con error legible, sin pérdida del post.
- Tests y `tsc` en verde.

## 5. Pendiente de Reiner
- Confirmar permisos añadidos en Meta (pestaña congelada el 13 oct; reintentar).
- Hora(s) de publicación por defecto y zona horaria (se propone la del workspace).
- Dónde alojar las imágenes públicas.
- Cargar lote 1 (días 1–15 de `Contenido RRSS/Instagram/Plan 31-1102026/salida`).

## 6. Auditoría del estado actual (13 oct 2026, evidencia en código y captura de `/automatizacion`)

Hallazgos verificados:
- La pantalla `/automatizacion` es `src/components/pipeline-ig/ContentIGTab.tsx` (895 líneas). TODA su configuración (handle, hora, publicación automática, marca, notas, reglas) se guarda en `localStorage` del navegador (`rai-ig-*`): no es por workspace, no se comparte entre dispositivos ni personas, y un proceso del servidor no puede leerla. Por eso nada de lo que se configura ahí puede ejecutarse solo.
- El interruptor «Publicación automática vía API» solo cambia un valor local (`autoPublish`); no existe backend que lo use.
- Valores por defecto con restos de otro negocio: handle `@Hotel_mpv` y hora `20:47`. En una empresa nueva se filtraría el handle de otro negocio.
- Visual: el interruptor se dibuja como un cuadrado blanco diminuto (el estilo global de `input` se impone al checkbox); texto de estado en mayúsculas desalineado; el formulario es una sola columna larga con notas en un textarea pequeño.
- `POST /api/publish/instagram` publica UNA imagen o video por llamada con la conexión Meta del workspace (`WorkspaceMetaConnection`), pero no soporta carruseles y ninguna pantalla lo invoca.
- No hay modelo de publicaciones programadas, ni cron (`vercel.json` tiene `crons: []`, vacío), ni vista de estado por día.

## 7. Plan por cortes (propuesto; no implementado; sin enviar a OpenCode)

Corte A — Configuración real por workspace (rápido, base de todo) — **HECHO local 13 oct, rama `rai-feat-automatizacion-config`, commit 42a5562; VERIFICADO en staging 14 oct (navegador PC: guardado en DB, persiste tras recarga, localStorage legado migrado, interruptor deshabilitado «Próximamente», chip «Instagram sin conectar», zona America/Caracas)** (columna `Settings.contentPlannerConfig`, migración `20261013120000_add_content_planner_config` APLICADA en staging el 13 oct por Reiner (verificada: columna `staging.Settings.contentPlannerConfig` tipo jsonb; producción sin tocar), API `/api/content-planner/config`, hook `useContentPlannerSync`, interruptor deshabilitado «Próximamente» hasta corte B; 25 tests nuevos, 233 en total, `tsc` limpio; pendiente verificación visual en localhost PC y móvil):
- Guardar handle, hora por defecto, zona horaria, marca y reglas en BD por workspace (nuevo modelo o JSON en `Workspace`/ajustes), con migración; el handle sale de la conexión Meta, sin valores por defecto de otros negocios.
- Corregir el interruptor y el estado visual; migrar lo que haya en `localStorage` una sola vez.

Corte B — Publicación real:
- Soporte de carrusel (contenedores hijos + padre) y verificación de formato de imagen en `publish/instagram`.
- Modelo `ScheduledPost` + cron protegido (`/api/cron/publish`, declarado en `crons` de `vercel.json`) con bloqueo contra doble publicación, reintentos y estados `draft|scheduled|publishing|published|failed`.
- Revisar la rama remota `claude/rai-instagram-crm-automation-ykkwg2` antes de escribir código nuevo.

Corte C — Interfaz (mejora completa):
- Rediseño de `/automatizacion` en pasos o pestañas (Marca, Instagram, Reglas, Contexto) con tarjetas más ligeras; vista de calendario con tarjeta por día y estado visible; botón «Programar lote» con resumen y confirmación; indicador de conexión Meta (conectado / expirado).
- Visible en móvil (localhost móvil) y PC; sin efectos de desenfoque.

Reconciliación 13 oct: el disparador del corte B NO es `vercel.json` `crons` sino D4 de `SPEC-publicacion-contenido-ig-fb.md` (GitHub Actions + `run-due` con `CRON_SECRET`; Hobby limita la frecuencia). El slice 7 de esa spec (`BrandProfile`) se sustituye por `Settings.contentPlannerConfig` (corte A). Los carruseles entran en alcance (esa spec los excluía). Detalle en `docs/planning/PROMPT-MAESTRO-OPENCODE.md` §9.7.

Permisos Meta (14 oct, verificado en una pestaña nueva): añadidos y en «Listo para prueba» `instagram_business_basic`, `instagram_business_content_publish`, `instagram_basic`, `instagram_content_publish`, `pages_show_list` y `pages_read_engagement` (Meta mostró «Se ha producido un error» al añadir este último, pero se aplicó; recargar la página antes de dar por fallida una acción). App sigue «Sin publicar»: solo cuentas con rol.

Orden recomendado: A → B → C, con evidencia en cada corte (tests, `tsc`, captura en PC y móvil). Corte B depende de los permisos de Meta y de URLs públicas de imagen (ver §5).

Corte C (UI) — 15 oct, rama `rai-feat-automatizacion-ui` (local): pestaña «Marca y cuenta» dentro de Contenido IG (antes la config colgaba bajo las campañas), cabecera con % de avance, nav de secciones con checks, barra de guardado fija, banner «Completa tu configuración», pasos Configura→Planea→Programa en estado vacío, campos responsive (verificado en 390 px sin desborde horizontal), placeholders neutros. Sin cambios de API/DB.
Corte C (UI) — capa premium 15 oct: anillo de avance, tarjetas con filo dorado y entrada escalonada, nav con scroll-spy, barra de guardado con destello, planificador con burbujas y **negritas renderizadas** (antes se veían `**`), calendario con resumen por estado y tarjetas por pilar (rejilla fluida, 2 columnas en 390 px sin desborde). Reglas del sistema premium respetadas: solo tokens `--rai-*`, sin blur, solo transform/opacity animados, hover bajo `(hover:hover)`, `prefers-reduced-motion` respetado. Pendiente: verificar tema claro (Perla) y botones «Regenerar día»/«Publicar siguiente» (siguen sin lógica; corte B).
Corte C (UI) — escenario premium 15 oct: fondo 100% CSS en Contenido IG (malla de puntos + brillos dorado/púrpura contenidos y con bordes desvanecidos; sin imágenes ni blur; deriva lenta solo con transform y desactivada con reduced-motion), tarjetas levemente translúcidas con numeral fantasma, título con degradado, anillo con halo. Verificado: tema oscuro y claro (Perla, con ajuste de contraste del texto sobre dorado) y 390 px sin desborde. Pendiente: pasar el patrón al resto de módulos (spec `SPEC-sistema-visual-premium.md`).
Corte C (UI) — recorrido guiado 15 oct: `ProductTour.tsx` (sin dependencias; overlay con spotlight, tooltips en cascada, 12 pasos que cambian de pestaña solos, teclado ←/→/Esc, bottom-sheet en móvil, objetivos más altos que la pantalla se recortan a su parte visible). Arranca la primera vez que se abre Contenido IG (clave localStorage `rai-tour-ig-v1`) y se repite con «Ver recorrido». Corrección: el numeral fantasma de las tarjetas chocaba con el chip «Instagram sin conectar» → eliminado; detector de solapes en cabeceras/filas sin colisiones. Microcopy de ayuda bajo campos clave. Deuda: la marca de «tour visto» es por navegador (pasar a preferencia de usuario en DB cuando haya perfil de usuario con preferencias); aplicar el mismo componente al resto de módulos.

## Auditoría responsive (Corte C)
- Anchos verificados: 320, 360, 390, 768, 1024, 1280, 1440 × 4 vistas (campañas, planner, calendario, config).
- Criterios: sin scroll horizontal de página, sin elementos más anchos que viewport, sin solapes entre hermanos de contenedores clave, sin botones recortados.
- Fix 1024: `.app-main{min-width:0}` + `.rai-toptabs` con scroll horizontal propio (tabs externas en `automatizacion/page.tsx`).

## Corte B — implementación local (15 oct 2026, rama `rai-feat-programacion-ig`, commits da14717 y 0229698; sin push)
Hecho (Meta SIMULADO por defecto; nada se envió a Meta ni a producción):
- Modelo `ScheduledPost` + migración aditiva `20261015120000_add_scheduled_post`. Para staging: `docs/planning/staging-scheduledpost.sql` (schema `staging`, lo pega Reiner en el SQL editor; producción NO se toca; rollback = `DROP TABLE`).
- `src/lib/scheduled-posts.ts` (lógica pura: validación de lote, zona horaria sin dependencias, anti-SSRF de URLs, reintentos 5/15/45 min, `safeError` sin tokens), `src/lib/publish-runner.ts` (claim atómico `updateMany` condicionado a `status='scheduled'` → nunca doble publicación; reanuda con `igContainerId`; locks vencidos >15 min se recuperan; máx. 3 intentos), `src/lib/instagram-publisher.ts` (`SimulatedPublisher` por defecto, `MetaPublisher` con imagen y carrusel; se activa solo con `IG_PUBLISH_MODE=live`).
- APIs: `GET/POST /api/content-planner/schedule` (lote idempotente por workspace+campaña+día), `POST /api/content-planner/schedule/:id` (`cancel`, `retry`, `publish-now`; siempre scope del workspace activo), `GET|POST /api/cron/publish` (Bearer `CRON_SECRET`, comparación en tiempo constante). Workflow `.github/workflows/publish-scheduled.yml` cada 15 min (necesita secretos `APP_URL` y `CRON_SECRET`; no corre hasta que se publique la rama).
- UI (Contenido IG → Calendario): botón «Programar lote» con diálogo de resumen/confirmación, chip de estado por día (programado/publicando/publicado/falló/cancelado) con Cancelar/Reintentar, «Publicar siguiente» (publicar ahora la siguiente programada), «Regenerar día N» (precarga el chat del planificador), aviso de modo simulado. Lo publicado en servidor se refleja en el estado del día.
- Tests: 42 nuevos (275 en total): anti doble publicación concurrente, reintentos, failed tras 3 intentos, no reintentable, reanudación sin duplicar, locks vencidos, aislamiento entre workspaces, anti-SSRF, zonas horarias (Caracas, Madrid con DST), cron 401/200. `tsc` limpio.
Pendiente / deuda: (1) verificar en la documentación vigente de Meta versión de Graph, límites y formato de imagen antes de `IG_PUBLISH_MODE=live`; (2) almacén de imágenes públicas JPEG (decisión pendiente; el modo live exige URLs https públicas); (3) el reintento mueve `scheduledAt` (se pierde la hora original; candidato a columna `retryAt`); (4) gating por plan de pago aún no aplicado; (5) prueba de punta a punta con cuenta IG real de RAI y evidencia (`igMediaId`) — requiere permisos Meta, token y URLs públicas.

## Corte C (extensión) — 15 oct
Look premium (fondo, tarjetas, títulos, entradas escalonadas) y recorrido guiado de 11 pasos (`rai-tour-auto-v1`) en Flujos, Plantillas, Actividad y Configuración; `.modal-backdrop` sin blur; anillo de avance SVG con color progresivo (muted → dorado → verde), línea de pasos y check de publicado que se trazan (solo con `prefers-reduced-motion: no-preference`). Verificado sin overflow en 320/390/768/1024/1440 × 5 pestañas. Descartado a propósito: rotación 3D con scroll (recarga y resta legibilidad en una herramienta de trabajo).
