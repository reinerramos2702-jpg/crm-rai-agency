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

Corte A — Configuración real por workspace (rápido, base de todo):
- Guardar handle, hora por defecto, zona horaria, marca y reglas en BD por workspace (nuevo modelo o JSON en `Workspace`/ajustes), con migración; el handle sale de la conexión Meta, sin valores por defecto de otros negocios.
- Corregir el interruptor y el estado visual; migrar lo que haya en `localStorage` una sola vez.

Corte B — Publicación real:
- Soporte de carrusel (contenedores hijos + padre) y verificación de formato de imagen en `publish/instagram`.
- Modelo `ScheduledPost` + cron protegido (`/api/cron/publish`, declarado en `crons` de `vercel.json`) con bloqueo contra doble publicación, reintentos y estados `draft|scheduled|publishing|published|failed`.
- Revisar la rama remota `claude/rai-instagram-crm-automation-ykkwg2` antes de escribir código nuevo.

Corte C — Interfaz (mejora completa):
- Rediseño de `/automatizacion` en pasos o pestañas (Marca, Instagram, Reglas, Contexto) con tarjetas más ligeras; vista de calendario con tarjeta por día y estado visible; botón «Programar lote» con resumen y confirmación; indicador de conexión Meta (conectado / expirado).
- Visible en móvil (localhost móvil) y PC; sin efectos de desenfoque.

Orden recomendado: A → B → C, con evidencia en cada corte (tests, `tsc`, captura en PC y móvil). Corte B depende de los permisos de Meta y de URLs públicas de imagen (ver §5).
