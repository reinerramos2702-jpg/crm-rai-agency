# Rendimiento del CRM — diagnóstico, cambios y cómo medir (16 oct 2026)

Queja original: «lags» generales (cada clic y cada módulo tarda; Pagos, Automatización → Actividad y Agentes IA, los peores) y un scroll que «hay que hacerlo dos veces».

## 1. Diagnóstico

| # | Causa | Evidencia medida | Peso |
|---|-------|------------------|------|
| 1 | Transición universal `html * { transition: … }` en `globals.css` | Al cambiar `data-theme` se crearon **660 animaciones CSS** y el recálculo de estilos tardó **30–145 ms** por cambio. Cualquier cambio de clase/estado en la página dispara el mismo coste (todos los elementos tienen transiciones activas). | Alto (percepción de «todo va lento») |
| 2 | Navegación sin `loading.tsx`: el clic no hace nada hasta que el servidor entrega la página | Clic en menú → cambio de URL: **Contactos 2188 ms, Conversaciones 2395 ms, Pagos 2021 ms** (módulos ya compilados, pasados 30 s de la caché del router). | Alto |
| 3 | Latencia de la base remota: cada consulta ≈ **0,8 s** | `/api/settings`, `/api/automations`, `/api/payments`, `/api/bookings`: 810–870 ms **en cada repetición** (una sola consulta). La base de staging está en `aws-1-us-west-2` (Oregón) y el cliente está en Venezuela. `/api/me` (sin consulta) responde en 24–60 ms. | Alto (dominante en datos) |
| 4 | Compilación bajo demanda de `next dev` | Primera visita: Marketing 13,1 s, Agentes IA 6,3 s, Calendarios 3,6 s. No existe en producción. | Solo desarrollo |
| 5 | `.gradient-text` (logo del menú) con `animation: shine 3s infinite` sobre `background-position` | Repintado continuo del logo en el hilo principal (no medible en este navegador: tiene «reducir movimiento» activo). Eliminada. | Medio |
| 6 | Menú lateral de 22 módulos con scroll propio | scrollHeight 1364–1390 px frente a 660–800 px de ventana: **siempre hay scroll en el menú** (ver §3). | Causa del scroll doble |

`getRoleContext` (auth + workspace + rol): para el **dueño** del workspace sin cabecera `X-Workspace-Id` ya hacía 0 consultas (workspace por defecto cacheado y rol por `ownerId`). Para miembros invitados y para peticiones con cabecera hacía 1–2 consultas (≈ 0,8–1,6 s) en CADA llamada de API; una pantalla lanza 4–8 llamadas a la vez. Ahí actúa la caché nueva.

## 2. Cambios

- `src/app/globals.css`: eliminadas `html{transition}` y `html *{transition}`. Nueva clase **`html.theme-anim`** (transición de color/fondo/borde/sombra de 250 ms) que solo existe 350 ms tras cambiar `data-theme`; la añade/quita un observador en `src/app/layout.tsx` (así funciona venga el cambio de donde venga, p. ej. Configuración). Eliminado el `shine` infinito del logo y el `* { -webkit-overflow-scrolling }` móvil. `html{scrollbar-gutter:stable}`. Menú: `overscroll-behavior: contain` y versión compacta en pantallas de hasta 900 px de alto.
- `src/components/layout/Sidebar.tsx`: el centrado del módulo activo en el menú ya no es `smooth` (competía con la rueda del usuario).
- `src/components/ui/PageSkeleton.tsx` + 18 `loading.tsx` (raíz, launchpad, campaign/new, generador-imagenes, marketing, contenido-multimedia, sitios, conversaciones, contactos, clientes-potenciales, calendarios, pasajeros, reservas, facturacion, reputacion, informes, marketplace, keys). El clic responde con la estructura en < 100 ms. Los demás módulos reutilizan `PageSkeleton`.
- `src/lib/role-context-cache.ts` + `roles.ts`: caché del contexto de autorización de **≤ 5 s** (ver §4).
- `src/lib/route-data.ts`: `ROUTE_DATA` ampliado (pagos, automatización, agentes, ajustes) y `warmCommonData` reducida a 4 URLs (`WARM_URLS`).
- `next.config.mjs`: `experimental.optimizePackageImports: ['lucide-react']` (única librería grande de UI; no hay date-fns/recharts). Requiere reiniciar `next dev`. No existe `middleware.ts`; las cabeceras de `headers()` son estáticas (sin coste por petición).

## 3. Scroll doble — causa

No se pudo reproducir con rueda sintética sobre el contenido (un solo gesto desplaza la página 600 px). Lo demostrado:

1. El menú lateral es `position:fixed; overflow-y:auto` y su contenido (1364–1390 px) **no cabe nunca** en una ventana de 660–800 px → es un contenedor con scroll bajo el cursor. Tras cada clic en el menú el puntero queda sobre él; la siguiente rueda **desplaza el menú, no la página**, y hay que mover el ratón al contenido y repetir.
2. Tras cada cambio de módulo el código desplazaba el menú con `behavior:'smooth'`, que cancelaba la rueda del usuario.
3. Sin `overscroll-behavior`, al llegar al final del menú el gesto se «encadenaba» a la página de forma impredecible.
4. Recorrido de 15 rutas a 1440×800 (iframes ocultos): **el único scroller anidado por defecto era el menú**; el documento era el scroll principal.

Mitigación aplicada: `contain`, scroll no suave, compactación en pantallas bajas. **Deuda:** con 22 módulos el menú seguirá teniendo scroll en portátiles (≤ 900 px); la solución definitiva es agrupar/plegar secciones del menú.

## 4. Caché de contexto de autorización (código de seguridad)

- La identidad (JWT firmado y vigente) se verifica **en cada petición**; la caché solo guarda lo que sale de la base (workspace + rol). La clave usa userId/email ya verificados + cabecera de workspace: no se deriva ni guarda el token.
- TTL absoluto de 5 s (no deslizante): un cambio de rol/membresía surte efecto como máximo 5 s después en cualquier proceso; en el mismo proceso es inmediato vía `invalidateRoleContext(userId)`, llamada desde `POST /api/team`, `PATCH|DELETE /api/team/[id]` y `POST /api/auth/register` (activa invitaciones).
- Nunca se cachea: no autenticado, `null` (sin acceso al workspace) ni el rol mínimo `viewer`.
- Una invalidación con una consulta en vuelo descarta su resultado (contador de época). Peticiones simultáneas del mismo usuario comparten una sola consulta.
- Interruptor de emergencia: `ROLE_CONTEXT_CACHE=off`.
- Pruebas: `src/lib/__tests__/role-context-cache.test.ts` (12) y `roles-cache.test.ts` (9).
- Límite: con varias instancias del servidor (producción escalada) la invalidación explícita no cruza procesos; el TTL de 5 s es el tope.

## 5. Mediciones (dev, `next dev`, caché del router vencida, clic en el menú)

| Módulo | Antes: URL cambia | Después: URL cambia (esqueleto visible) |
|--------|-------------------|------------------------------------------|
| Contactos | 2188 ms | 28 ms |
| Conversaciones | 2395 ms | 22 ms |
| Pagos | 2021 ms | 29 ms |
| Calendarios | — (compilación 3,6 s) | 30 ms |
| Marketing | — (compilación 13 s) | 29 ms |
| Agentes IA | 154 ms (caché del router) | 58 ms |
| Cambio de tema (recálculo de estilos) | 30–145 ms, 660 animaciones | 12–23 ms, 0 animaciones fuera de la ventana de 350 ms |

El tiempo hasta datos reales sigue dominado por la base remota (≈ 0,8 s por consulta; ver §6).

## 6. Pendiente / sugerencias (sin implementar)

1. **Mover la base a una región cercana** (us-east-1 / São Paulo) o usar un pooler regional: cada consulta baja de ≈ 0,8 s a ≈ 0,2–0,3 s. Es la mejora de datos más grande.
2. Paralelizar con `Promise.all` las rutas con consultas secuenciales; en Pagos, Automatización y Agentes IA cada pantalla debe resolverse en **una** ronda de consultas.
3. Índices compuestos `(workspaceId, createdAt DESC)` en `Payment`, `AutomationRun`, `Booking`, y `(workspaceId, userId, status)` en `WorkspaceMember`.
4. Conversaciones, Contactos y Calendarios usan `fetch` directo (no la caché SWR): migrarlos a `useCachedJson` permite precargarlos desde `ROUTE_DATA` y mostrar lo último conocido al instante.
5. Selectores `[style*="…"]` del tema claro y de móvil (≈ 40 en `globals.css`) obligan a comparar atributos en cada recálculo; sustituir por clases.

## 7. Cómo medir en modo producción (Reiner)

El binario de la VM de trabajo es Linux y `node_modules` es de Windows, así que **no se pudo construir aquí**. En tu PC:

```
node --env-file=.env.staging node_modules/next/dist/bin/next build
node --env-file=.env.staging node_modules/next/dist/bin/next start
```

Abre `http://localhost:3000`, inicia sesión y compara: (a) clic en Pagos / Contactos / Conversaciones (debe verse el esqueleto al instante y la página en < 1 s si la base responde), (b) Chrome → Rendimiento → grabar un cambio de tema (no debe haber «Recalculate Style» de cientos de ms), (c) rueda del ratón sobre el menú y sobre el contenido. Los tiempos de `next dev` incluyen compilación bajo demanda y no son representativos.
