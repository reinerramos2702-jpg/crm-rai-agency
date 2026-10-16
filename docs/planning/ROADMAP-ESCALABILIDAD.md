# Roadmap de escalabilidad, robustez y cumplimiento (CRM RAI Agency)

Origen: tres guías de ingeniería que compartió Reiner (15 oct 2026): rendimiento y UX a escala, arquitectura defensiva y marco legal. Este documento las cruza con el estado real del repo. Es un registro de decisiones y backlog: no implica que algo esté implementado salvo donde dice «Hecho».

## 1. Rendimiento y UX a escala

| Práctica | Estado | Dónde / siguiente paso |
|---|---|---|
| Stale-while-revalidate (caché local + revalidación) | Hecho | `src/lib/swr-cache.ts`, `use-cached-json.ts`; módulos Launchpad y Generador. Extender a Calendario, Contactos y Conversaciones. |
| Precarga al pasar el mouse/tocar | Hecho | `src/lib/route-data.ts` (`ROUTE_DATA`) |
| Actualizaciones optimistas | Parcial | Launchpad (marcar paso) y Generador (eliminar). Falta Kanban/pipeline de contactos. |
| Densidad de interfaz | Hecho | `DensityToggle`, `src/lib/density.ts`, `data-density` |
| Esqueletos de carga unificados | Hecho | `Skeleton.tsx` (+ `fx-shimmer`) |
| Animaciones cortas (150–250 ms, curvas ease-out) | Hecho | entradas 220 ms, press 100 ms, anillo de clic 500 ms (única excepción, informativa) |
| Atajos de teclado | Parcial | Ctrl/Cmd+K (paleta), Ctrl/Cmd+B (menú). Falta: `N` nuevo contacto/campaña, `Esc` unificado en paneles. |
| Debounce de búsqueda | N/A hoy | el filtro de grillas es local; aplicar 300 ms cuando haya búsqueda contra la API. |
| Virtualización de tablas | Backlog | solo cuando una lista supere ~500 filas (contactos). Evaluar `@tanstack/react-virtual`. |
| Paginación por cursor | Backlog | `/api/contacts` y conversaciones al crecer el volumen. |
| Suscripciones realtime acotadas | Backlog | cancelar al cambiar de módulo; decidir realtime vs. polling con SWR. |
| Web Workers para cálculo pesado | Backlog | solo si aparecen reportes pesados en cliente. |

## 2. Arquitectura defensiva

| Práctica | Estado | Dónde / siguiente paso |
|---|---|---|
| RLS por tabla | Planificado | `docs/planning/PLAN-RLS.md`. Bloqueado: `DATABASE_URL` usa superusuario; requiere Plan Mode con Reiner. |
| Esquemas staging vs. public | Hecho | staging modo B (schema `staging` + rol `crm_staging`), `docs/SPEC-entorno-staging.md` |
| Bloqueo optimista (versión por fila) | Backlog | añadir `version`/`updatedAt` comparado en PATCH de contactos, campañas y marca; UI de conflicto. |
| Colas/eventos para tareas masivas | Backlog | importaciones CSV y envíos masivos fuera del request (n8n o funciones edge). |
| Filtro de respuestas salientes (variables, caracteres) | Backlog | capa común antes de WhatsApp/correo. |
| Audit trail inmutable | Backlog | tabla `AuditLog` (usuario, workspace, acción, antes/después, IP, fecha); empezar por claves, planes y borrados. |
| Simular red lenta en desarrollo | Práctica | DevTools → Network → «Slow 4G»; validar esqueletos y estados de error. |

## 3. Cumplimiento legal y privacidad (no es asesoría legal)

Reiner debe validar esto con un abogado de datos/privacidad antes del despliegue comercial. Puntos a cubrir, por orden de impacto: consentimiento (Opt-In/Opt-Out) en formularios de captación; derecho al olvido y exportación JSON/CSV por contacto; contrato de procesamiento (agencia = procesador, cliente = responsable); identificación explícita de agentes de IA ante el usuario final; contratos/configuración sin retención de datos para los proveedores de IA; cifrado de claves BYOK en reposo (ya existe cifrado por workspace: auditar algoritmo) y TLS; protocolo de notificación de brechas (72 h, GDPR); ToS con limitación de responsabilidad, SLA e indemnidad por mal uso (spam).

Siguiente paso concreto sugerido: redactar plantillas de consentimiento y política de retención por módulo (borrador para revisión legal).

## 4. Orden propuesto de las próximas fases

1. Atajos `N`/`Esc` + SWR en Calendario y Contactos (rendimiento percibido).
2. Bloqueo optimista + `AuditLog` (integridad antes de abrir registro a más usuarios).
3. RLS (requiere decisión de Reiner sobre rol de base de datos) y cursor/virtualización cuando haya volumen real.
4. Paquete legal (consentimientos, derecho al olvido, ToS/SLA) con revisión de abogado.
