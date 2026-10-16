# Catálogo GHL — diagnóstico y funciones a adoptar (16 oct 2026)

> Documento de producto, no es una especificación de construcción ni asesoría legal. Redactado el 16 oct 2026 a partir de fuentes internas del repo y del proyecto de claude.ai, y de 41 páginas del centro de ayuda de HighLevel (GHL) más 6 fuentes complementarias. Lo que no tiene evidencia se marca «sin evidencia» o «sin verificar». No se construyó ni se tocó código de `src/`.

## 0. Resumen ejecutivo

- **Ya tenemos la «carcasa» de casi todo, pero casi nada conectado a canales reales.** Existen modelos y pantallas de conversaciones, agentes de IA, base de conocimiento, automatizaciones, calendarios, pagos y reservas. Lo que falta es lo que convierte una pantalla en producto: mensajes entrantes reales (WhatsApp), recuperación semántica (RAG), llamadas telefónicas, envío nativo de SMS/email/WhatsApp y pasarela de cobro.
- **El agente de voz ya tiene interfaz de configuración, pero no contesta llamadas.** `AIAgent.kind = 'voice'`, asistente de creación y simulador de texto existen (sin commit, en el árbol de trabajo). La propia pantalla lista lo que falta: número/SIP, transcripciones, resumen post-llamada, transferencia a humano y métricas.
- **Recomendación para voz:** proveedor gestionado (Retell o Vapi) sobre un número de Twilio, con nuestras propias «herramientas» (base de conocimiento, citas, contactos) expuestas por API. No construir el audio en tiempo real desde cero. Detalle en la sección 4.
- **Orden recomendado:** Ola 0 (bloqueadores de seguridad) → Ola 1 (canal WhatsApp + RAG + bot de texto + traspaso a humano + acciones nativas) → Ola 2 (voz entrante, calendarios, formularios, pagos, reputación) → Ola 3 (voz saliente, copiloto, firma, informes white-label, modo SaaS).
- **Diferenciador transversal:** un solo «cerebro» (prompt + base de conocimiento + acciones) que atiende chat y voz; español latino y WhatsApp primero; pagos locales con comprobante; costos de IA transparentes y con tope por workspace (ya existe `HARD_CAP_USD_PER_EXECUTION` y claves BYOK cifradas).
- **Hallazgo de verificación:** el panel y los Pendientes dicen que Retargeting Fase 1 está «construido, con PR abierto». En este clon no hay modelos `SmartList`/`Ad*`, ni ramas, ni commits con ese nombre: **sin evidencia local**. Hay que reconciliarlo (ver sección 2, fila 26).

## 1. Método, alcance y límites

**Fuentes internas leídas:** `claude/Catálogo de Funcionalidades GHL (soporte).md` (8 fichas, 5 sep), `claude/Plan Maestro — Auditoría CRM y Reingeniería GHL.md`, `claude/Contexto Maestro del Proyecto — CRM RAI Agency.md`; en el repo: `docs/planning/BRAINSTORM-FUNCIONALIDADES-NUEVAS.md`, `docs/ROADMAP_AUTOMATIZACION.md`, `docs/SPEC-planes-monetizacion.md`, `docs/planning/ROADMAP-ESCALABILIDAD.md`, `docs/ESTADO-SESION.md`, `docs/planning/panel-control.html`, `src/components/layout/nav-config.ts`, `src/app/*`, `prisma/schema.prisma`, `src/lib/automations/*`, `src/app/agentes-ia/*`; bóveda de Obsidian (notas «Pendientes Abiertos», «Plan de Fases - Go-Live», «Catalogo de Funcionalidades GHL»).

**Fuentes externas:** 41 páginas de `help.gohighlevel.com` leídas con éxito, más precios y guías de Twilio, Retell, Vapi (fuente de terceros), ElevenLabs (fuente de terceros) y un resumen jurídico sobre la regla de la FCC. Lista completa en la sección 7.

**Límites que conviene conocer:**
1. Varias páginas fallaron o fueron bloqueadas por el entorno y **no se esquivaron** (no se usó curl ni Python): la carpeta de Comunidades, el artículo «Mobile Apps Overview» (bloqueado por `robots`), el aviso de grabación del widget de voz (error de descarga) y las páginas oficiales de precios de Vapi, Retell, ElevenLabs y Twilio (permiso no respondido). Para precios se usó lo accesible: la página oficial de Twilio por otra URL, el blog oficial de Retell y artículos de terceros (marcados como tales).
2. El índice `/support/solutions` muestra hoy 35 categorías de primer nivel y **no incluye «AI Employee» como categoría propia**, aunque sus artículos existen y se alcanzan por búsqueda. El catálogo interno del 5 sep hablaba de «más de 60 categorías». Sin explicación verificada; no afecta las conclusiones, pero conviene no asumir la numeración anterior.
3. Los precios de GHL son del artículo «AI Product Pricing» (última modificación 13 oct 2026, que advierte que pueden cambiar). Los de terceros son orientativos.
4. Nada de este documento es asesoría legal. Las secciones de riesgo legal listan temas a revisar con abogado; ya existe el ítem «Paquete legal» en el panel.

## 2. Mapa: módulos GHL × nuestro CRM

Leyenda de estado: **Hecho** · **Parcial** · **Elegido-pendiente** (decidido por Reiner o aprobado en el panel/catálogo, sin construir) · **No elegido** (descartado o sin decisión de construir) · **Nuevo propuesto** (no estaba en nuestros documentos; lo propone este diagnóstico).

| # | Módulo GHL | Estado | Evidencia en nuestro CRM | Origen de la decisión |
|---|---|---|---|---|
| 1 | Conversaciones (bandeja) | Parcial | `/conversaciones` (1086 líneas); modelos `Conversation`, `Message`; canales `whatsapp/instagram/email/sms` solo como etiqueta; sin ruta de entrada de WhatsApp/Meta en `src/app/api` | Elegido: Bloque 3 del panel; «WhatsApp sobre Meta Cloud API» (Contexto Maestro §6) |
| 2 | Conversation AI (bots de texto) | Parcial | `AIAgent` (modos `active/suggested/disabled`, `isPrimary`, prompt en 4 campos), `/agentes-ia`, chat de prueba `/api/ai-agents/[id]/test` con `streamText`; `Conversation.agentId` existe, sin uso en `src/app/api/conversations` | Ficha #2: ADOPTAR, máxima prioridad |
| 3 | Human Handover | Elegido-pendiente | Sin código | Ficha #1: ADOPTAR, bloqueada por el bot real |
| 4 | Voice AI (agente de voz) | Parcial (solo interfaz) | `AIAgent.kind='voice'`; `src/lib/agent-wizard.ts`, `agentes-ia/_components/VoiceWizard.tsx` y `VoiceComingSoon.tsx` (árbol de trabajo, sin commit, de otra sesión); configuración de voz solo en `localStorage` | Ficha #3: ADOPTAR después de #2 |
| 5 | Knowledge Base (RAG) | Parcial | `KnowledgeBase`, `KnowledgeBaseItem` (faq/text/table/file/url), `/agentes-ia/base-conocimiento`; sin embeddings ni pgvector (búsqueda en `src` y `prisma` sin resultados); sin rastreador, probador ni refresco | Ficha #7: ADOPTAR el núcleo |
| 6 | Agent Studio / Managed Agents | Elegido-pendiente (versión reducida, sin canvas) | Sin código | Ficha #5 |
| 7 | Ask AI (copiloto del operador) | Elegido-pendiente (selectivo) | Solo la paleta Ctrl+K de navegación (`command-search.ts`) | Ficha #6 |
| 8 | Workflows | Hecho (base) / Parcial | `src/lib/automations` (motor, acciones, condiciones), 12 disparadores, 6 acciones, retrasos, `WorkflowRun`, 15 plantillas, `/automatizacion`, `run-due`; `vercel.json` con `crons: []`; el envío de mensajes es `send_webhook` hacia n8n; sin If/Else con ramas, Goal Event ni Workflow AI | `docs/ROADMAP_AUTOMATIZACION.md` |
| 9 | Oportunidades y pipelines | Parcial / Elegido-pendiente | `/clientes-potenciales` (882 líneas, varios botones «Próximamente»); sin modelo `Opportunity`/`Pipeline` en `schema.prisma`; bug de persistencia de «Crear» (Pendientes A.9) | Panel: B8 kanban (asesores); catálogo GHL sin ficha propia |
| 10 | Contactos y Smart Lists | Parcial | `/contactos` (538 líneas), `Contact.tags`; varios «Próximamente»; Smart Lists solo en la rama de Retargeting (no presente) | D14 segmentación aprobada |
| 11 | Calendarios y reservas | Parcial | `/calendarios` (1435 líneas), `CalendarGroup`, `CalendarResource`, `Appointment`, `/book/[slug]`, `/api/public/booking`, `Booking`/`Room`; calendarios externos «próximamente»; sin evidencia de round robin, colectivos ni servicios | Roadmap de Automatización; Contexto Maestro |
| 12 | Reputación | Elegido-pendiente | `/reputacion` es `ModulePlaceholder` (25 líneas); figura en el plan de 49 USD | `docs/SPEC-planes-monetizacion.md` §2b |
| 13 | Formularios, encuestas, cuestionarios | Nuevo propuesto | Sin modelo `Form` (la Ficha #4 ya lo notó); B5 (formulario de asesores con scoring) aprobado solo como caso particular | Este diagnóstico |
| 14 | Funnels y sitios web | No elegido (motor propio) | `/sitios` gestiona propiedades (`Site`: hotel, restaurante…), no páginas; Ficha #8: DESCARTAR clon de AI Studio; ruta pragmática: Claude Code | Ficha #8 |
| 15 | Email marketing | Parcial | Solo Resend para recuperar contraseña (`src/lib/notify.ts`); `/marketing` son tarjetas estáticas; sin envío masivo; D15 (A/B) aprobado | Panel D13–D16 |
| 16 | SMS y WhatsApp (salida) | Elegido-pendiente | SMS: «proveedor pendiente» (`notify.ts`); WhatsApp solo vía `send_webhook` → n8n | Contexto Maestro §6; D16 |
| 17 | Pagos | Parcial | `/pagos` (`Payment`, `PaymentEvent`, comprobante `proofUrl`, aprobación), `/facturacion`; sin pasarela (P3 abierto en `SPEC-planes-monetizacion.md`); sin facturas, presupuestos ni enlaces de pago | Spec de planes |
| 18 | Facturas recurrentes y recordatorios de cobro | Elegido-pendiente | Sin código | E17 aprobado |
| 19 | Membresías y cursos | No elegido | Sin código | Ficha #6: DESCARTAR por ahora (E18, biblioteca de capacitación, es distinta y está aprobada) |
| 20 | Comunidades | Elegido-pendiente (acotado) | Sin código; idea «comunidad escalable» de asesores | `BRAINSTORM-FUNCIONALIDADES-NUEVAS.md` §1.1; N5 leaderboard |
| 21 | Social Planner | Parcial | `ScheduledPost`, `/api/content-planner`, `ContentIGTab`, `publish-runner`, `instagram-publisher`; Corte B local con Meta simulado (sin push); publicación real pendiente | Panel: programación IG; Bloque 2B |
| 22 | Reportes y atribución | Parcial | `/informes` es placeholder; Dashboard premium hecho; sin informes programados | C10, E20, N6 aprobados |
| 23 | White-label y modo SaaS | Parcial | Multi-tenant (`Workspace`, `WorkspaceMember`, PR #6); planes 34/49/67 aprobados con P2, P3, P5, P6 abiertos; Snapshots y SaaS Plans: «decisión de producto aparte, no tomada» | Spec de planes; Fichas #5–#8 |
| 24 | App móvil | Parcial | UI responsive verificada de 320 a 1440 px; sin manifest PWA; app de Hidromáticos Oriente en diseño (`docs/INTEGRACION-HIDROMATICOS.md`) | Panel: Hidromáticos |
| 25 | Documentos y firma electrónica | Elegido-pendiente | Sin código; contrato web ya se genera con la skill `contrato-web-rai` (PDF) | N3 y B7 aprobados |
| 26 | Retargeting / Ad Manager | Sin evidencia local | Ficha #4 y panel dicen «construido, PR abierto, esperando credenciales Meta/Google»; en este clon no hay `SmartList`, `AdAudience`, `AdConversionEvent`, ramas ni commits con «retarget» | Ficha #4 (ADOPTAR Fase 1) |
| 27 | Notificaciones al equipo | Elegido-pendiente | `notify.ts` solo cubre la recuperación de contraseña | Ficha #1 (pieza más cara) |
| 28 | Roles, equipo y auditoría | Parcial | `WorkspaceMember`, `requireRole`, `AuditEvent`; RBAC 0.1–0.3 cerrado en la rama `security/fase-0`; RLS bloqueado | Panel, Fase 00 |
| 29 | Snippets, notas, tareas | Hecho | Modelos `Snippet`, `Note`, `ContactTask` | Roadmap de Automatización |
| 30 | Enlaces de seguimiento (Trigger Links) | Parcial | `/go/[slug]` + `ActivationLink` (cuenta clics y redirige); no dispara workflows | Código |
| 31 | Content AI (texto, imagen, audio) | Hecho (equivalente propio) | `/generador-imagenes`, `src/agents/copy-agent.ts`, `audio-agent.ts` (ElevenLabs y OpenAI TTS) | Código |
| 32 | Guía de inicio y recorridos | Hecho | `/launchpad`, `src/components/tour/*` | `ESTADO-SESION.md` |
| 33 | Chat interno y menciones | Elegido-pendiente | Sin código | A4 aprobado |
| 34 | Optimizador y evaluador de prompts | Nuevo propuesto | Sin código | Este diagnóstico |
| 35 | Reporte de llamadas | Nuevo propuesto | Sin código (parte del agente de voz) | Este diagnóstico |

## 3. Las 15 funciones de mayor valor a adoptar

Esfuerzo: **S** (días), **M** (1–3 semanas de una persona), **L** (más de 3 semanas o con proveedor externo). Son estimaciones relativas, no compromisos. Cada ficha cierra con la automatización que la acompaña.

### 3.1 Agente de voz IA que contesta llamadas de empresas
- **Qué hace GHL:** agentes entrantes, salientes y de widget web; prompt con transparencia de módulos; una sola base de conocimiento por agente; acciones durante la llamada (transferir, disparar workflow, SMS, actualizar contacto, reservar cita, webhook) y después de ella; horarios por agente; modo «contestar directo» o «respaldo» si nadie responde; panel de llamadas con sentimiento; «Knowledge Gaps» que agrupa lo que el agente no supo responder. Precio: motor de voz 0,045 USD/min más voz (0,015 a 0,17 USD/min según proveedor) y tokens del modelo; planes AI Employee de 50 USD/mes (100 min incluidos) y 97 USD/mes.
- **Nuestra versión mejorada:** mismo «cerebro» que el bot de texto (misma base de conocimiento y acciones), español latino, resumen post-llamada enviado por WhatsApp al llamante, reservas contra calendarios y reservas hoteleras reales, tope de gasto por llamada y por mes, y bandeja de «lagunas» con borrador de respuesta que se aprueba con un clic (GHL exige redactarla a mano). Diseño completo en la sección 4.
- **Esfuerzo:** L. **Dependencias:** proveedor de voz, número de teléfono, RAG (3.3), modelo de llamadas, nuevo disparador `call.completed`. **Riesgos legales:** aviso de IA y de grabación, consentimiento, datos sensibles en transcripciones (sección 4.7).
- **Automatización:** llamada finalizada → etiqueta de resultado → tarea al humano si pidió contacto → mensaje de WhatsApp con resumen → oportunidad en el pipeline.

### 3.2 Conversation AI en producción (bot de texto sobre conversaciones reales)
- **Qué hace GHL:** modos Apagado, Sugerido y Piloto automático; límite de 1 a 100 respuestas del bot por conversación; retardo de escritura; acciones (agendar, disparar workflow, completar campos del contacto, detener bot, seguimiento automático, pasar a otro bot); registro de acciones en el hilo; «Response Info» con las fuentes usadas. Costo por tokens (p. ej. GPT-5: 1,25 USD de entrada y 10 USD de salida por millón de tokens; Growth incluye 1.000 respuestas/mes).
- **Nuestra versión:** ya tenemos modos, bot principal, prompt y chat de prueba. Falta el puente entrada → agente → respuesta. Empezar en modo Sugerido (borrador dentro de la bandeja). Añadir «red de seguridad»: palabras de queja o de urgencia fuerzan traspaso a humano, límite de respuestas, horario, y fuentes citadas con puntaje de confianza.
- **Esfuerzo:** M–L. **Dependencias:** canal real (3.5), base de conocimiento (3.3), claves BYOK. **Riesgos legales:** políticas de WhatsApp Business (ventana de 24 h y plantillas), consentimiento previo, identificarse como asistente virtual, protección de datos.
- **Automatización:** mensaje entrante → bot (modo Sugerido) → si confianza baja o queja → handover (3.4) → métrica de «tiempo ahorrado» (ya existe `avgSecondsPerMessage`).

### 3.3 Base de conocimiento con RAG, probador de recuperación y lagunas
- **Qué hace GHL:** fuentes combinables (rastreador web, FAQ, tablas CSV, archivos, texto, Google Drive), refresco automático de URLs, probador de recuperación, panel de Knowledge Gaps. Limita el agente de voz a **una** base a la vez.
- **Nuestra versión:** pgvector sobre Supabase (verificar que la extensión esté habilitada con `list_extensions`), fragmentación por encabezados, respuestas con cita de fuente, **varias bases por agente** con disparadores en lenguaje natural, probador de recuperación, y un solo registro de lagunas compartido entre chat y voz. Las tablas permiten catálogos de precios (Hotel MPV, cafetería, libros).
- **Esfuerzo:** M–L. **Dependencias:** proveedor de embeddings (BYOK), pgvector, job BullMQ para rastreo y refresco, RLS por workspace. **Riesgos legales:** no cargar datos personales de terceros en la base; derechos de autor del contenido rastreado.
- **Automatización:** refresco diario de URLs; laguna repetida 3 veces → borrador de FAQ → notificación al dueño para aprobar.

### 3.4 Traspaso a humano y seguimiento automático
- **Qué hace GHL:** tres disparadores (pide un humano, falta de información, dos reintentos fallidos); acciones: asignar, mensaje final, pausar el bot, crear tarea (24 h por defecto) y etiqueta `human_handover`; seguimiento automático de hasta 5 mensajes con horario activo y cambio de canal.
- **Nuestra versión:** reutiliza `ContactTask`, etiquetas y el disparador existente `conversation.sla_overdue`: si el humano no responde en N minutos, se escala. Al transferir se entrega un **resumen de 3 líneas** con intención y datos capturados. Seguimiento con horario activo y respeto estricto de «no me escribas más».
- **Esfuerzo:** M. **Dependencias:** 3.2 y notificaciones al equipo (la pieza más cara según Ficha #1). **Riesgos legales:** el seguimiento automático son mensajes comerciales: requiere consentimiento y baja inmediata.
- **Automatización:** handover → tarea + etiqueta + notificación → temporizador de SLA → escalamiento.

### 3.5 Bandeja unificada con WhatsApp (Meta Cloud API)
- **Qué hace GHL:** ventana de servicio de 24 h con mensajes libres; fuera de ella, solo plantillas aprobadas; acción de flujo «verificar ventana» con ramas abierta/cerrada; 1.000 conversaciones de servicio gratis por número al mes; desde el 1 oct 2026 los mensajes de servicio y utilidad dentro de la ventana pasan a ser facturables (con 1.000 gratis por número); markup de 1x a 10x (1,05x por defecto) y 10 USD/mes por sub-cuenta.
- **Nuestra versión:** Cloud API directo (decisión ya tomada), cola BullMQ, ventana de 24 h visible en la bandeja, plantillas, estado de entrega, y **costo estimado por conversación a la vista**. Recepción de comprobantes de pago por WhatsApp con el OCR ya diseñado para Hidromáticos (`docs/INTEGRACION-HIDROMATICOS.md` §7, el OCR extrae y nunca aprueba).
- **Esfuerzo:** L. **Dependencias:** revisión de la app de Meta, webhook entrante, almacenamiento de medios (R2), una cuenta de WhatsApp Business por workspace. **Riesgos legales:** política de WhatsApp Business, opt-in explícito, retención de conversaciones.
- **Automatización:** webhook entrante → contacto (crea o actualiza) → conversación → bot o asignación.

### 3.6 Workflows con acciones nativas, ramas y «Workflow AI»
- **Qué hace GHL:** más de 60 acciones por categoría (contacto, comunicación, oportunidades, pagos, marketing, cursos, voz IVR), If/Else, Wait, Goal Event, Split; Workflow AI crea y edita flujos desde texto; acciones premium de IA a 0,01 USD por ejecución.
- **Nuestra versión:** sumar `send_sms`, `send_email` y `send_whatsapp` nativos (con `send_webhook` a n8n como respaldo), If/Else con ramas, y disparadores nuevos: formulario enviado, pago recibido, reseña recibida, llamada finalizada, cambio de etapa. «Generar flujo desde texto» con **simulación previa** («esto afectaría a 37 contactos») y registro legible. Hoy el cron de Vercel Hobby corre una vez al día: usar el worker de Render con BullMQ o un cron externo.
- **Esfuerzo:** M. **Dependencias:** canales (3.5), cron real. **Riesgos legales:** envíos masivos sin consentimiento; límites de frecuencia.
- **Automatización:** el propio motor; añadir tope de envíos por contacto y por día.

### 3.7 Oportunidades y pipelines
- **Qué hace GHL:** pipelines con etapas únicas, Ganada/Perdida automáticas, vistas Kanban y lista, colores por etapa, campos personalizados, importación CSV, al borrar una etapa se elige a dónde pasan las oportunidades.
- **Nuestra versión:** `Pipeline`/`Stage`/`Opportunity` con `workspaceId`, Kanban con actualización optimista (ya hay patrón en Launchpad), valor ponderado por probabilidad, y **plantillas de pipeline por nicho** (hotel: consulta → cotización → reserva; cafetería; salud; agencia: B8). Cambio de etapa dispara workflow.
- **Esfuerzo:** M. **Dependencias:** migración de base (requiere aprobación), RLS. **Riesgos legales:** bajos (datos personales de contactos).
- **Automatización:** etapa «Propuesta enviada» sin respuesta en 3 días → tarea y mensaje.

### 3.8 Calendarios avanzados y reservas
- **Qué hace GHL:** round robin (optimizar por disponibilidad o por distribución equitativa, prioridades alta/media/baja), colectivos, clases con cupos, servicios, citas recurrentes, ubicaciones (Zoom, Meet, Teams, teléfono, dirección), invitados adicionales, pagos al reservar.
- **Nuestra versión:** round robin y servicios sobre `CalendarResource`; reserva por voz y WhatsApp consultando disponibilidad real; anticipo por pago móvil con comprobante; sincronización con Google Calendar. La Ficha de integración de Hidromáticos ya diseña citas sin solapes e idempotencia (§5).
- **Esfuerzo:** M. **Dependencias:** OAuth de Google, `Payment`. **Riesgos legales:** datos de salud si el nicho es médico; zonas horarias (por defecto `America/Caracas`).
- **Automatización:** recordatorio 24 h, detección de no-show y seguimiento ya existen como plantillas; añadir reprogramación automática por WhatsApp.

### 3.9 Reputación y reseñas
- **Qué hace GHL:** solicitudes por SMS o email con enlace, Google y Facebook, widgets (carrusel, cuadrícula, lista), testimonios en video, reseñas manuales, Reviews AI (0,01 USD por respuesta enviada en pago por uso).
- **Nuestra versión:** solicitud automática tras cita completada o `checked_out` por WhatsApp; respuestas sugeridas en español con aprobación; widget embebible. Cuidado: **no filtrar solo a los clientes satisfechos** (las plataformas pueden prohibir ese «review gating»; sin verificar en esta sesión, revisar políticas antes).
- **Esfuerzo:** M. **Dependencias:** API de Google Business Profile (acceso con aprobación, sin verificar), Facebook Pages. **Riesgos legales:** políticas de reseñas, consentimiento para contactar.
- **Automatización:** `appointment.completed` → solicitud de reseña → reseña recibida → alerta si es de 1–2 estrellas.

### 3.10 Formularios y encuestas conectados al CRM
- **Qué hace GHL:** lógica condicional (redirigir, mensaje, descalificar, mostrar/ocultar campos), cálculos, una pregunta a la vez, cuestionarios; cada envío crea contacto y dispara workflow. Límite: sin campos de calendario en la lógica.
- **Nuestra versión:** constructor mínimo basado en un esquema JSON, página pública `/f/[slug]` e incrustable, honeypot (ya existe en el registro), campo de fecha de nacimiento con consentimiento (idea 1.3, cumpleaños), puntaje IA para el formulario de asesores (B5), estilo «una pregunta a la vez» como en WhatsApp.
- **Esfuerzo:** M. **Dependencias:** modelo `Form`/`FormSubmission`, disparador nuevo. **Riesgos legales:** aviso de privacidad (`/privacidad` existe), consentimiento, datos de menores, antispam.
- **Automatización:** envío → contacto → etiqueta → bienvenida → tarea de primer contacto en 1 h (ya es la plantilla 6).

### 3.11 Facturas, presupuestos y enlaces de pago
- **Qué hace GHL:** facturas recurrentes, planes de pago por cuotas, impuestos, descuentos, recargos por mora, pagos parciales, presupuestos; disparador «pago recibido»; Stripe, Square y NMI.
- **Nuestra versión:** factura o presupuesto en PDF con la marca del tenant y **enlace de pago público** con instrucciones de pago móvil, Zelle, Binance o Stripe y subida de comprobante (reutiliza `Payment.proofUrl` y el flujo de aprobación); recordatorios de cobro por WhatsApp; disparador `payment.paid`.
- **Esfuerzo:** M–L. **Dependencias:** P3 de la spec de planes (proveedor de cobro), decisiones fiscales. **Riesgos legales:** obligaciones fiscales y de facturación por país (sin verificar), seguridad de pagos con tarjeta (usar el proveedor, no almacenar datos), cripto.
- **Automatización:** factura vencida → recordatorio escalonado → tarea al responsable.

### 3.12 Planificador social con publicación real
- **Qué hace GHL:** 10 plataformas, programación, borradores, aprobación, recurrentes, CSV/XLSX de hasta 90 publicaciones, «mejor hora para publicar» (solo escritorio), analítica.
- **Nuestra versión:** el Corte B ya programa y simula; completar publicación real en Instagram y Facebook, aprobación del cliente (C12), lote de 15 días con copys generados por nicho y mejor hora calculada con datos propios.
- **Esfuerzo:** M. **Dependencias:** permisos de Meta (`pages_manage_posts`), imágenes públicas (R2). **Riesgos legales:** políticas de la API de Meta, derechos de imagen. Ya cubierto por el ítem «Programar y publicar automático en Instagram» del panel.
- **Automatización:** cron de publicación con reintentos; alerta si una publicación falla.

### 3.13 Informes programados, white-label y atribución
- **Qué hace GHL:** informes personalizados con portada y logo, envío programado por correo a destinatarios sin cuenta, PDF; reporte de llamadas; UTM como filtro; widgets de Meta y Google Ads. Límite: tablas de 100 registros en PDF/correo.
- **Nuestra versión:** informe mensual con la marca del tenant y comentario generado por IA (C10, N6), enlace firmado de solo lectura para el cliente final, atribución con `/go/[slug]` + UTM.
- **Esfuerzo:** M. **Dependencias:** generación de PDF, correo (Resend). **Riesgos legales:** privacidad de los datos compartidos.
- **Automatización:** día 1 de cada mes → informe → correo al cliente → registro en la ficha.

### 3.14 Documentos y firma electrónica
- **Qué hace GHL:** plantillas, campos de firma, iniciales, fecha y casillas, firma secuencial o simultánea, variables, certificado con correo, IP y fecha, cobro al firmar. Límite: sin lógica condicional.
- **Nuestra versión:** propuesta PDF automática (B7) + firma simple con certificado (hash SHA-256 del PDF, IP, marca de tiempo) + cobro del anticipo al firmar; el contrato web que hoy genera la skill pasa a salir del CRM.
- **Esfuerzo:** M. **Dependencias:** 3.11. **Riesgos legales:** validez de la firma electrónica por país (sin verificar), conservación de evidencia.
- **Automatización:** propuesta enviada → firmada → factura → pipeline «Cliente activo».

### 3.15 Modo SaaS y marca blanca
- **Qué hace GHL:** SaaS Configurator con planes por funciones, creación automática de sub-cuenta tras el pago, billetera prepago y «rebilling» con markup (solo en su plan superior), planes de IA por ubicación.
- **Nuestra versión:** ya hay multi-tenant y planes 34/49/67 aprobados. Completar: restricciones por plan (Pendientes A.33), **billetera de créditos prepago** de IA y voz en lugar de tarifas imprevisibles, marca blanca por tenant (logo y dominio) y **paquetes por nicho** (instalar «Hotel», «Cafetería» o «Salud» con workflows, base de conocimiento y agente de ejemplo).
- **Esfuerzo:** L. **Dependencias:** P2, P3, P5, P6 de la spec de planes; Fase 00 de seguridad. **Riesgos legales:** términos, cobros recurrentes, reembolsos, impuestos; el paquete legal con abogado ya está en el panel.
- **Automatización:** pago confirmado → crear workspace → aplicar paquete → correo de bienvenida → recorrido guiado.

## 4. Agente de voz IA — diseño detallado

### 4.1 Punto de partida (verificado en el repo)
- `AIAgent.kind = 'voice'` y el asistente de creación de agentes de voz existen en el árbol de trabajo (sin commit): `src/lib/agent-wizard.ts`, `VoiceWizard.tsx`, `VoiceComingSoon.tsx`. La configuración de voz (voz, idioma, ritmo, tono) se guarda solo en `localStorage`: **el modelo de datos aún no tiene esos campos**.
- La pantalla «Llamadas reales — Próximamente» ya enumera las cinco piezas que faltan: número o SIP, transcripciones, resumen post-llamada, transferencia a humano y métricas.
- Reutilizable: `src/agents/audio-agent.ts` (ElevenLabs y OpenAI TTS), `llm-providers.ts` y claves BYOK cifradas (`ApiKey`), cola BullMQ en el worker de Render, `Appointment`/`Booking` para reservas, `ContactTask` y etiquetas para el resultado de la llamada.

### 4.2 Arquitectura propuesta

```
Llamante ──► Número (Twilio u operador vía SIP)
                │
                ▼
        Proveedor de voz en tiempo real
        (detección de voz, STT → LLM → TTS, interrupciones)
                │   herramientas por HTTPS firmado (HMAC por workspace)
                ▼
   CRM (Next.js en Vercel)  ──► /api/voice/tools/*
      · search_knowledge   (RAG sobre la base del agente)
      · check_availability / book_appointment  (Calendarios, Reservas)
      · upsert_contact     (Contacto + etiquetas)
      · transfer_to_human  (número del equipo, horario, mensaje de cortesía)
      · send_whatsapp_summary
      · end_call
                │
   Webhook de fin de llamada ──► worker BullMQ (Render)
      · guarda VoiceCall + transcripción
      · resumen, intención y sentimiento (LLM)
      · etiqueta de resultado, tarea, oportunidad
      · dispara el workflow «call.completed»
      · registra lagunas de conocimiento
```

Decisiones de diseño:
1. **El audio en tiempo real no corre en Vercel ni lo escribimos nosotros** (conexiones persistentes y latencia). Lo resuelve el proveedor; nosotros ponemos el cerebro (prompt, conocimiento, acciones) y los datos.
2. **Interfaz `VoiceProvider`** con una implementación por proveedor, para no quedar atados. Prompt, base de conocimiento y acciones viven en nuestro CRM; el proveedor solo recibe una configuración y llama a nuestras herramientas.
3. **Todo con `workspaceId`** y políticas de RLS desde el primer día (las transcripciones son datos sensibles).
4. **Transferencia a humano:** dentro del horario del equipo, transferir a un número configurado con un mensaje de cortesía; fuera de horario o sin respuesta, **buzón**: el agente toma nombre, motivo y teléfono y crea una tarea con etiqueta `llamada_pendiente`.
5. **Modo de enrutamiento** como en GHL: «contestar directo» o «respaldo» (solo si el equipo no contesta tras N segundos). GHL recomienda tiempos de espera de 1 a 3 segundos para que la IA gane al buzón del operador; esa cifra es de su plataforma y debe medirse con nuestro proveedor.
6. **Límites de seguridad:** duración máxima por llamada, recordatorio por silencio, tope mensual de minutos y de gasto por workspace, limitación de llamadas por número (GHL corta llamadas a las 2 horas y bloquea cuentas con más de 5 violaciones por hora; usar valores propios).
7. **Prueba antes de producción:** llamada web (navegador) sin número, como en GHL; las llamadas de prueba se marcan y se excluyen de las métricas.

### 4.3 Modelo de datos propuesto (esbozo, sin SQL final; requiere aprobación de migración)
- `VoiceNumber`: `workspaceId`, `e164`, `provider`, `agentId`, `mode` (`direct` o `backup`), horario.
- `VoiceCall`: `workspaceId`, `agentId`, `contactId?`, `direction`, `fromE164`, `toE164`, `status`, `startedAt`, `durationSec`, `costCents`, `recordingUrl?`, `summary`, `sentiment`, `outcome`, `transferredTo?`, `providerCallId` único (idempotencia ante reintentos del webhook), `isTest`.
- `VoiceCallTurn` (o transcripción en JSON): rol, texto, marca de tiempo.
- `KnowledgeGap`: `workspaceId`, `agentId`, `question`, `cluster`, `status`, `draftAnswer?`.
- Campos de voz en el agente (hoy en `localStorage`): `voiceId`, `language`, `speed`, `tone`, `hours`, `transferNumber`, `disclosureText`, `recordingEnabled`.

### 4.4 Funciones del agente, en orden de entrega
| Hito | Contenido | Resultado visible |
|---|---|---|
| V0 | Simulador de texto (existe) | El dueño prueba el guion |
| V1 | Llamada web con proveedor, herramientas `search_knowledge` y `upsert_contact` | Primera conversación hablada sin comprar número |
| V2 | Número entrante, horario, reservas, transferencia, buzón | El negocio recibe llamadas reales |
| V3 | Transcripciones, resumen post-llamada, sentimiento, etiqueta, tarea, WhatsApp de resumen, panel de métricas | El dueño ve qué pasó sin escuchar nada |
| V4 | Lagunas con borrador de FAQ, optimizador de prompt, llamadas salientes desde workflows, widget de voz en la web | Mejora continua y captación activa |

Métricas del panel: llamadas, minutos, contestadas, transferidas, buzón, perdidas, citas creadas, sentimiento, costo por llamada, lagunas abiertas. La separación entrante/saliente y las métricas de marcado (contestada por humano, buzón, no contestada, fallida) siguen el modelo de GHL para la fase V4.

### 4.5 Opciones de proveedor y costos orientativos
Precios en USD. «Verificado» significa leído en la fuente indicada; el resto es «sin verificar».

| Opción | Cómo encaja | Costo (fuente) | Notas |
|---|---|---|---|
| **A. Retell AI** (gestionado) | Orquesta STT, LLM y TTS; tú aportas número y herramientas | 0,07 USD/min, sin cuota base (verificado: blog oficial de Retell, 6 jul 2026; **no desglosa** qué incluye) | Candidato para piloto. Confirmar con prueba si el precio incluye el modelo de lenguaje y la telefonía. |
| **B. Vapi** (gestionado) | Igual que A, con elección libre de STT, LLM y TTS | 0,05 USD/min de plataforma más cada proveedor; estimación de un tercero: 0,077 USD/min en pila económica y 0,25–0,27 USD/min en pila premium (Zeeg, actualizado 1 oct 2026; son modelos del autor, no tarifas); plan Build con 10 líneas simultáneas y 10 USD/mes por línea adicional | GHL ya tiene una integración con Vapi (acciones «crear llamada», «subir archivo», disparadores de llamada nueva), pero solo con números comprados dentro de Vapi. |
| **C. ElevenLabs Agents** | Agente conversacional con su propio TTS | Excedente de unos 0,08 USD/min (rango 0,08–0,10); LLM y telefonía aparte; gratuito con unos 15 min y 4 llamadas simultáneas (HappyRobot, 2 sep 2026, fuente de terceros) | Posible ventaja de calidad de voz en español (sin verificar). Ya usamos ElevenLabs en el agente de audio. |
| **D. Propio sobre Twilio** (Media Streams o SIP) + STT + LLM + TTS | Nosotros escribimos el pipeline de audio | Twilio verificado (página oficial): número local 1,15 USD/mes; entrante 0,0085 USD/min; saliente 0,0140 USD/min (EE. UU. y Canadá); grabación 0,0025 USD/min más almacenamiento; SIP 0,0040 USD/min por sentido. STT, LLM y TTS: **sin verificar** | Esfuerzo muy alto y operación de un servicio persistente. Solo si el volumen lo justifica; umbral a medir con datos reales. |

**Referencia de mercado (GHL, verificado):** motor de voz 0,045 USD/min; TTS de OpenAI o Cartesia 0,015 USD/min; ElevenLabs V2.5 0,035 y V3 0,170 USD/min; voz a voz con Gemini 3.1 Flash Live 0,10 USD/min y con GPT-Realtime 0,20 USD/min; más los tokens del modelo y la telefonía aparte.

**Cálculo ilustrativo (no es una cotización):** 1.000 min/mes entrantes con la opción A y un número de EE. UU. ≈ 70 USD (Retell) + 8,5 USD (Twilio entrante) + 1,15 USD (número) ≈ 80 USD/mes, sin lo que Retell no desglosa. Para vender, definir créditos de voz por plan en la tabla P4 de la spec de planes, con datos reales.

**Telefonía en Venezuela (verificado parcialmente):** la guía de Twilio indica que sus números gratuitos (toll-free) funcionan dentro de Venezuela y que se soportan llamadas entrantes y salientes, pero **no confirma que se puedan adquirir números locales o móviles venezolanos** y aclara que las llamadas a servicios de emergencia no están soportadas. Alternativas a investigar (sin verificar): número de EE. UU., Colombia o Perú con desvío, o troncal SIP de un operador local.

**Recomendación:** piloto con A o B sobre un número de Twilio; elegir con tres llamadas de prueba en español latino midiendo latencia percibida, precisión de la base de conocimiento y costo real por minuto. Mantener la interfaz `VoiceProvider` para cambiar sin reescribir.

### 4.6 Qué mejora a GHL (diferenciadores propios)
1. **Un solo cerebro** para chat y voz, con varias bases de conocimiento por agente (GHL limita la voz a una).
2. **Lagunas → borrador de respuesta aprobable con un clic**, en lugar de lista pasiva.
3. **Resumen al llamante por WhatsApp** y tarea al humano en el mismo instante.
4. **Costo visible por llamada** y tope mensual por workspace con aviso al 80 %.
5. **Reservas reales** contra Calendarios y reservas hoteleras (Hotel MPV), pagos locales con comprobante.
6. **Español latino por defecto**, con frases de cortesía y fórmulas de tratamiento configurables por nicho.
7. **Paquetes por nicho:** «Recepcionista de hotel», «Cafetería», «Consultorio», con guion, base de conocimiento y workflows de ejemplo (idea de las plantillas guiadas de GHL, ampliada con datos del tenant).

### 4.7 Riesgos legales y de cumplimiento (revisar con abogado; no es asesoría)
- **Identificación como IA y aviso de grabación:** decisión de diseño recomendada: mensaje inicial configurable, activado por defecto («Está hablando con el asistente virtual de [negocio]; la llamada puede ser grabada»). El requisito exacto en Venezuela, Colombia y Perú está **sin verificar**. El catálogo interno registra un aviso de IA configurable en llamadas salientes de GHL; el artículo de hoy sobre su «marco flexible» no lo menciona.
- **Consentimiento para grabar y para llamadas salientes:** GHL dejó de validarlo y lo traslada por completo al negocio (verificado, artículo «Flexible Outbound Calling Framework»), aunque mantiene salvaguardas de uso aceptable. Si se llama a EE. UU., la FCC declaró el 8 feb 2024 que las voces generadas por IA son «artificiales» bajo la TCPA (verificado: resumen de Akin Gump). Por eso **la voz saliente va en la Ola 3**, con registro de consentimiento por contacto, ventana horaria y límites por número.
- **Datos sensibles en transcripciones:** pueden incluir salud, pagos o ubicación. Retención configurable, borrado por contacto (ROADMAP-ESCALABILIDAD §3), enmascarado de números de tarjeta y RLS antes de producción.
- **Emergencias:** el agente debe decir que no atiende emergencias y derivar al número oficial.
- **Fraude y abuso:** límites por número y por minuto, detección de spam entrante (GHL lo hace con marcas por número en 24 h), y reCAPTCHA en el widget de voz web.

## 5. Orden recomendado de implementación en tres olas

Regla: ninguna ola avanza a datos reales de clientes mientras la Ola 0 siga abierta. Push, migraciones, producción y secretos siguen requiriendo la autorización explícita de Reiner.

### Ola 0 — Bloqueadores (ya están en el panel y en Pendientes)
Ejecutar RLS (plan listo, requiere Plan Mode), cerrar RBAC y `DEV_BYPASS_AUTH` en producción, cron real (el plan Hobby de Vercel corre una vez al día) y paquete legal con abogado. Sin esto, guardar transcripciones de llamadas o mensajes de WhatsApp de clientes es un riesgo.

### Ola 1 — Cerebro de texto y canal real
| Paso | Función | Hito de salida |
|---|---|---|
| 1 | 3.5 Bandeja con WhatsApp (Cloud API) | Mensaje real entra y sale en `/conversaciones` |
| 2 | 3.3 Base de conocimiento con RAG y probador | El probador devuelve fuentes correctas con preguntas reales del nicho |
| 3 | 3.2 Conversation AI en modo Sugerido | Un humano aprueba borradores en una conversación real |
| 4 | 3.4 Traspaso a humano y notificaciones | Una queja llega al equipo con resumen y tarea |
| 5 | 3.6 Acciones nativas, If/Else y disparadores nuevos | Un flujo envía WhatsApp sin n8n |
| 6 | 3.7 Oportunidades y pipelines | Kanban por nicho con automatización por etapa |
| Spike | Llamada web con proveedor (V1) | Medir latencia, calidad en español y costo real |

### Ola 2 — Voz y conversión
| Paso | Función | Hito de salida |
|---|---|---|
| 7 | 3.1 Agente de voz entrante (V2 y V3) | Un negocio piloto recibe llamadas reales con transcripción y resumen |
| 8 | 3.8 Calendarios avanzados | El agente de voz y el de chat reservan con disponibilidad real |
| 9 | 3.10 Formularios y encuestas | Un formulario público crea contacto y dispara flujo |
| 10 | 3.11 Facturas y enlaces de pago | Cobro con comprobante y disparador `payment.paid` |
| 11 | 3.9 Reputación | Solicitud automática de reseña tras cita |
| 12 | 3.12 Planificador social real | Publicación real de un lote en Instagram y Facebook |

### Ola 3 — Escala, reventa y refinamiento
- Voz saliente desde workflows, lagunas con borrador de FAQ, optimizador de prompt, widget de voz web (V4).
- **Copiloto del operador** con tareas programadas y conectores MCP, y **agentes por evento** en versión reducida, sin canvas (Fichas #5 y #6).
- 3.13 Informes white-label y atribución; 3.14 Firma electrónica; 3.15 Modo SaaS con billetera de créditos y paquetes por nicho.
- PWA instalable (Nuevo propuesto, esfuerzo S–M: manifest, caché sin conexión de lectura, notificaciones push) y comunidad de asesores (acotada).
- Retargeting Fase 1: primero reconciliar el estado real de la rama (sección 2, fila 26); después probar con credenciales de Meta y Google.

## 6. Funciones únicas que atraviesan las tres olas
1. **Cerebro compartido** chat + voz: misma base de conocimiento, mismas acciones, mismo registro de lagunas.
2. **Transparencia de costos:** costo estimado por conversación, llamada y generación, con tope por workspace y billetera prepago.
3. **WhatsApp primero y pagos locales con comprobante** (pago móvil, Zelle, Binance) y aprobación humana siempre.
4. **Simulación antes de ejecutar:** todo flujo y todo envío masivo muestra a quién afectaría antes de activarse.
5. **Paquetes por nicho** instalables (hotel, cafetería, salud, agencia) que traen workflows, base de conocimiento y agente.
6. **Auditoría legible:** cada acción de un agente queda en la línea de tiempo del contacto (GHL lo hace con el registro de acciones; lo extendemos a voz).

## 7. URLs consultadas

**Centro de ayuda de GHL (leídas con éxito, 41):**
- Inicio y categorías: https://help.gohighlevel.com/support/home · https://help.gohighlevel.com/support/solutions
- Carpetas: https://help.gohighlevel.com/support/solutions/folders/48000666160 (Conversaciones) · /folders/155000000510 (Oportunidades) · /folders/155000000735 (Workflows) · /folders/155000000697 (Calendarios)
- Precios y planes de IA: https://help.gohighlevel.com/support/solutions/articles/155000006652-ai-product-pricing · …/155000002166-ai-tools-in-highlevel · …/155000008362-managed-agents-conversation-ai-ask-ai-what-s-the-difference- · …/155000008315-skills-platform-for-ai-agents · …/155000008521-how-to-use-the-actions-platform-in-highlevel-agent-studio
- Voz: …/155000004107-how-to-create-voice-ai-agents · …/155000003431-inbound-call-flow-for-voice-ai-calls · …/155000007498-inbound-calls-ivr-ai-routing-call-flow-explained · …/155000008581-how-to-identify-and-resolve-voice-ai-knowledge-gaps · …/155000005266-knowledge-base-integration-for-voice-ai-agents · …/155000008039-voice-ai-flexible-outbound-calling-framework · …/155000005314-understanding-inbound-call-rate-limits · …/155000003911-ai-voice-agents-overview · …/155000007349-vapi-actions-and-triggers-in-workflows
- Conversation AI y móvil: …/155000002669-how-to-use-conversation-ai-in-the-mobile-app-highlevel-leadconnector-
- Workflows y calendarios: …/155000002294-what-are-workflow-actions-complete-list- · …/155000001484-appointment-distribution-logic-for-round-robin-calendars · …/155000001314-conditional-logic-v2-in-forms-and-surveys- · …/155000001985-step-by-step-guide-creating-pipelines
- Mensajería: …/155000003235-whatsapp-customer-service-window-check · …/155000001428-whatsapp-pricing-billing-and-rebilling-guide · …/155000006660-a-b-testing-in-email-campaigns
- Social, pagos, informes: …/155000005063-getting-started-setup-social-planner · …/155000005654-best-time-to-post-feature-in-social-planner · …/155000004042-invoices-new-revamped-ui · …/155000003965-how-to-create-custom-reports-and-schedule-reports · …/155000002705-call-reporting
- Reputación, documentos, comunidad, cursos, SaaS, sitios: …/155000005201-guided-review-setup-wizard-reputation-management- · …/155000000594-how-to-use-documents-contracts- · …/155000000280-how-to-setup-customize-and-manage-your-communities · …/155000002487-gamification-in-communities-points-badges-and-leaderboards · …/48001141015-how-to-build-courses-membership-sites · …/155000002095-rebilling-reselling-and-wallets-explained · …/155000008015-getting-started-with-the-saas-configurator · …/155000001633-websites-overview

(Los artículos llevan el prefijo `https://help.gohighlevel.com/support/solutions/articles/`.)

**Otras fuentes (6):**
- Twilio, precios de voz: https://twilio.com/en-us/voice/pricing (oficial)
- Twilio, guía de voz de Venezuela: https://www.twilio.com/en-us/guidelines/ve/venezuela--voice-guidelines---twilio (oficial)
- Retell AI, comparativa de precios: https://www.retellai.com/sv/blog/ai-voice-agent-pricing-full-cost-breakdown-platform-comparison-roi-analysis (blog del propio proveedor)
- Vapi, precios (tercero): https://zeeg.me/en/blog/post/vapi-ai-pricing
- ElevenLabs, precios (tercero): https://www.happyrobot.ai/hub/elevenlabs-pricing
- FCC y voces de IA (resumen jurídico de un tercero): https://www.akingump.com/en/insights/ai-law-and-regulation-tracker/fcc-issues-declaratory-ruling-on-ai-generated-voice-robocalls

**No accesibles (no se esquivaron):** carpeta de Comunidades (`/folders/155000000024`, permiso no respondido); `…/articles/155000001702-mobile-apps-overview` (bloqueado por `robots`); `…/articles/155000006563-chat-widget-configure-voice-ai-agent-name-call-recording-notice` (error de descarga); `vapi.ai/pricing`, `retellai.com/pricing`, `elevenlabs.io/pricing`, `twilio.com/en-us/voice/pricing/us` (permiso no respondido); una URL de carpeta construida a mano (`/support/solutions/155000000848`), que fue un error de método y se descartó.

## 8. Decisiones que necesita Reiner (en orden de impacto)
1. **¿Se aprueba el orden de las tres olas?** En especial, ¿WhatsApp antes que voz?
2. **Proveedor de voz para el piloto** (A, B o C) y **país del número** (EE. UU., Colombia, Perú, o un operador venezolano por SIP).
3. **Tope mensual de gasto en voz** durante el piloto (propuesta: definirlo con las tres llamadas de prueba).
4. **Negocio piloto** para la voz (¿Hotel MPV, Quadro Café, Hidromáticos Oriente?).
5. **Reconciliar Retargeting Fase 1:** ¿en qué máquina o rama está el código que el panel describe como construido?
6. **Revisión legal** (aviso de IA, grabación, consentimiento, firma electrónica, facturación) antes de abrir voz y pagos a terceros.
