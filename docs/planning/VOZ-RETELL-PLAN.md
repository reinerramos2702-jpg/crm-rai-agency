# Agente de voz entrante con Retell AI — plan técnico y de activación

Estado: implementado en código, **apagado por defecto** (`VOICE_MODE=simulated`, cero gasto). Fecha: 16 oct 2026. Dueño de la decisión: Reiner. Proveedor elegido: Retell AI sobre un número telefónico; el CRM es el «cerebro» (prompt, base de conocimiento, ajustes y datos). País del número: Venezuela (ver `VOZ-VENEZUELA-LEGAL.md`).

## 1. Arquitectura

```
Llamante ─► Número (DID de Venezuela, ver doc legal) ─► troncal SIP ─► Retell AI
                                                                   (voz en tiempo real: STT → LLM → TTS)
                                       herramienta buscar_conocimiento │ transferir_a_humano │ finalizar_llamada
                                                                   ▼
CRM Next.js (Vercel)  ◄── POST /api/voice/kb-search?agent=<id>   (secreto compartido)
                      ◄── POST /api/voice/webhook?agent=<id>     (firma HMAC de Retell)
                      ──► Conversation (canal 'voice') + Message + Contact
```

Decisiones:
1. El audio en tiempo real **no corre en el CRM**: lo resuelve Retell. Nosotros ponemos prompt, conocimiento, reglas y datos.
2. Interfaz `VoiceProvider` (`src/lib/voice/types.ts`) con un adaptador por proveedor (hoy `retell.ts`, solo `fetch`, sin dependencias nuevas). El CRM construye un `VoiceAgentSpec` neutral y el adaptador lo traduce.
3. Tenant: el workspace **siempre sale de la base de datos** (el `?agent=<id>` de la URL apunta a un `AIAgent` de tipo voz); nunca del cuerpo ni de un parámetro del cliente.
4. Modo simulado por defecto: sin `RETELL_API_KEY` o con `VOICE_MODE≠live`, el webhook responde 503, `/api/voice/agents` solo valida y muestra una vista previa, y no se llama a ningún proveedor.

## 2. Flujo de una llamada

1. El llamante marca el número; Retell contesta con el agente del CRM (saludo con aviso de IA y, si está activo, aviso de grabación).
2. Retell envía `call_started` al webhook del agente → se crea el contacto (por teléfono E.164) y una `Conversation` abierta.
3. Durante la llamada el agente usa `buscar_conocimiento` (nuestra API, ~8 s de límite): devuelve 1–3 fragmentos cortos de las bases vinculadas **a ese agente**; si no hay coincidencia, el agente no inventa.
4. Si corresponde, `transferir_a_humano` (transferencia en frío al número configurado) o toma de mensaje fuera de horario.
5. `call_ended`: se cierra la conversación y se guarda la transcripción; `call_analyzed`: se reescribe el resumen con resultado, sentimiento y costo.
6. El panel `/agentes-ia/voz` lista llamadas, uso del mes y costo contra el tope.

Idempotencia: ids determinísticos (`vc_<call_id>`, `vc_<call_id>_meta`, `vc_<call_id>_t<n>`) con `upsert`/`skipDuplicates`; un reintento de Retell (hasta 3, timeout de 10 s) no duplica nada. Una llamada ya guardada para otro workspace nunca se sobrescribe (409).

## 3. Variables de entorno

| Variable | Obligatoria en vivo | Para qué |
|---|---|---|
| `VOICE_MODE` | sí (`live`) | `simulated` por defecto. `live` sin llave sigue simulado. |
| `RETELL_API_KEY` | sí | API key de Retell (también verifica la firma del webhook salvo que exista `VOICE_WEBHOOK_SECRET`). |
| `VOICE_WEBHOOK_SECRET` | no | Llave con insignia de webhook, si es distinta de la API key. |
| `VOICE_KB_SECRET` | sí (≥16 caracteres) | Secreto compartido de `buscar_conocimiento` (cabecera `x-voice-kb-secret`). |
| `RETELL_VOICE_ID` | sí | `voice_id` por defecto (se elige en el panel de Retell; también puede fijarse en Ajustes de voz). |
| `VOICE_PUBLIC_URL` | sí | Dominio **https** del CRM (Retell bloquea localhost y HTTP). Si falta, se usa `NEXT_PUBLIC_APP_URL` / `VERCEL_URL`. |
| `RETELL_LLM_MODEL` | no | Por defecto `gpt-4.1-mini`. |
| `VOICE_MONTHLY_CAP_USD` | no | Tope **duro** mensual (por defecto 25). El ajuste del workspace nunca lo supera. |
| `VOICE_COST_*` | no | Supuestos de costo (ver §5). |

Nunca se registra ni se devuelve el valor de un secreto; `/api/voice/status` solo informa si existe.

## 4. Pasos MANUALES de Reiner para activar

1. Crear la cuenta en Retell (hay 10 USD de crédito inicial según su página de precios) y **cargar solo el crédito del tope** (ver `VOZ-VENEZUELA-LEGAL.md` §C): ese crédito es el corte duro real.
2. En Retell: crear una API key y marcar la insignia de webhook; elegir una voz en español y copiar su `voice_id`.
3. En Vercel (entorno de producción): `VOICE_PUBLIC_URL`, `RETELL_API_KEY`, `VOICE_KB_SECRET` (`openssl rand -hex 24`), `RETELL_VOICE_ID`, `VOICE_MONTHLY_CAP_USD`. Dejar `VOICE_MODE=simulated` hasta el paso 7.
4. En el CRM: crear el agente con `/agentes-ia/nuevo/voz`, vincular su base de conocimiento y revisar `/agentes-ia/voz` → pestaña «Ajustes de voz».
5. Conseguir el número (ruta recomendada en el doc de Venezuela), crear la troncal SIP y asignar el agente en Retell (`Import Phone Number`: el campo es `inbound_agents`, no hay `inbound_agent_id`).
6. Poner `VOICE_MODE=live`, redeploy, y en el centro de voz pulsar **Activar con Retell**: crea el LLM y el agente en Retell y registra solo el webhook de ese agente. No hace falta pegar la URL en el panel de Retell.
7. Llamada de prueba al número, revisar la transcripción y el costo en el panel. Recién entonces entregar el número al negocio piloto.

## 5. Costos (ESTIMADOS, no cotizaciones)

Constantes en `src/lib/voice/cost.ts`, ajustables con `VOICE_COST_*`:

| Concepto | Valor usado | Fuente (leída el 16 oct 2026) |
|---|---|---|
| Motor de voz + voz (TTS) | 0,07 USD/min (0,055 + 0,015) | retellai.com/pricing: ejemplo de 0,11 USD/min = LLM 0,04 + infraestructura 0,055 + TTS 0,015 |
| Modelo de lenguaje | 0,04 USD/min (conservador) | misma página; los modelos «nano/mini» listados cuestan menos, pero `gpt-4.1-mini` no figura en la tabla leída |
| Telefonía entrante | 0,0085 USD/min | Twilio, precios de EE. UU.; con troncal SIP propia Retell no cobra telefonía; Twilio BYOC/SIP entrante 0,0040 USD/min |
| Número | 1,15 USD/mes | Twilio número local; un DID de Venezuela en Telnyx parte de 12 USD/mes (telnyx.com/phone-numbers/venezuela) |
| Búsqueda de conocimiento | 0 | usamos nuestra herramienta propia, no el add-on de Retell (0,005 USD/min) |

Total por defecto ≈ **0,1185 USD/min** + número. Reglas de facturación de Retell: se cobra por segundo, el silencio y la espera se cobran, las llamadas fallidas no, y tras una transferencia Retell deja de cobrar al agente pero **la telefonía continúa**. Una transferencia a un celular venezolano cuesta aproximadamente 0,17 USD/min en la pierna saliente (Twilio, saliente a Venezuela móvil 0,1739; fijo 0,0682).

La página de precios de Retell es inconsistente en el cargo de números verificados (10 USD único vs. por número) y no menciona Venezuela. Confirmar con una factura real en la primera semana.

## 6. Tope de gasto: cómo se aplica

- `Ajustes de voz → Tope mensual` (por defecto 25 USD) y `VOICE_MONTHLY_CAP_USD` (duro). El efectivo es el menor.
- El panel avisa al 80 % y marca «tope alcanzado» al 100 %; `/api/voice/agents` rechaza activar o reactivar con el tope alcanzado (409).
- El CRM **no puede cortar llamadas entrantes** ya enrutadas por Retell. El corte duro real es el **crédito prepago de Retell** (existe el motivo de desconexión `credit_exhausted`): cargar solo el tope. Deuda: cortar por API al llegar al 100 % (desasignar el agente del número).

## 7. Riesgos

| Riesgo | Mitigación |
|---|---|
| Número venezolano no disponible o con trámites (identidad y dirección en Venezuela) | Empezar el trámite ya; mientras, probar con un número de EE. UU. (1,15–2 USD/mes). Ver doc de Venezuela. |
| Latencia o calidad de audio desde Venezuela | Medir en la prueba; el proveedor de la troncal importa. |
| Costo de la pierna de transferencia | Transferencia desactivada por defecto; si se activa, avisar el costo. |
| Respuestas inventadas | `buscar_conocimiento` obligatorio antes de datos del negocio, sin resultado = tomar mensaje; revisar transcripciones la primera semana. |
| Datos sensibles en transcripciones | Grabación apagada por defecto (`data_storage_setting = basic_attributes_only`); solo roles que gestionan agentes ven llamadas; ver doc legal. |
| Inyección desde la base de conocimiento | El prompt declara los resultados como información, nunca instrucciones. |
| Firma/replay del webhook | Verificación HMAC con ventana de 5 min y comparación en tiempo constante; rate-limit por IP. |
| Páginas de Retell inconsistentes (get-call v1/v2, precios) | El adaptador usa lo leído el 16 oct 2026; cubierto con tests de fetch simulado. Revisar al activar. |

## 8. Pruebas

`npx vitest run src/lib/voice src/app/api/voice` — 90 pruebas, con `fetch` y base de datos siempre simulados: firma válida/inválida/vencida, idempotencia (sin duplicados, aislamiento por tenant), costos, validación de ajustes, constructor de agente, ranking de la búsqueda, checklist de activación, adaptador de Retell, rutas del webhook y de `kb-search`.

Prueba manual (primer día en vivo): llamar, preguntar algo que **sí** y algo que **no** está en la base, pedir una persona, llamar fuera de horario, colgar a los 3 s, y repetir un webhook desde el panel de Retell para confirmar que no duplica.

## 9. Deuda técnica conocida

1. **Ajustes de voz en `localStorage`** (por navegador y workspace). `Settings` solo tiene un JSON (`contentPlannerConfig`) y es del planificador. Propuesta con aprobación de migración: `Settings.voiceSettings Json?` (+ `VoiceNumber`/`VoiceCall` del catálogo §4.3). Mientras, el servidor valida con zod lo que el cliente envía al activar y el tope duro del entorno manda.
2. **Metadatos de la llamada dentro de un `Message`** (`vc_<id>_meta`, texto legible + línea `[[voz:meta]]{json}`), porque no hay tabla `VoiceCall`. El hilo de Conversaciones los muestra como texto; migrar a tabla.
3. **Llamada de prueba desde el navegador**: el adaptador ya implementa `createWebCall` (`POST /v3/create-web-call`), pero unirse a la llamada necesita `retell-client-js-sdk` (dependencia nueva). Hoy se usa el simulador de texto o llamar al número.
4. **Voces del asistente** (`sofia`, `mateo`…) son de ejemplo y no se mapean a `voice_id` de Retell; se usa `RETELL_VOICE_ID` o el campo «Voz del proveedor».
5. **Grabación** controla `data_storage_setting` completo (audio + transcripción); Retell no documenta un interruptor solo de audio.
6. **Corte automático al tope** por API; **cobro por créditos prepago por workspace**; **llamadas salientes**; **lagunas de conocimiento** (preguntas sin respuesta).
7. La zona horaria predeterminada es Caracas (UTC-4 fijo); otro huso se ajusta en `hours.timezone`.
8. Páginas de Retell no verificadas: no se pudo leer ninguna bloqueada; las que respondieron están citadas arriba. Endpoints usados: `create-retell-llm`, `update-retell-llm`, `create-agent`, `update-agent`, `get-agent`, `v2/list-agents`, `v3/list-calls`, `v2/get-call`, `v3/create-web-call`.

## 10. Mapa de archivos

- `src/lib/voice/`: `types`, `config`, `cost`, `settings`, `agent-config`, `retell`, `signature`, `kb-search`, `call-meta`, `persist`, `store`, `usage`, `queries`, `status`, `index`, `__tests__/`.
- API: `src/app/api/voice/{webhook,kb-search,status,calls,agents}/route.ts`.
- UI: `src/app/agentes-ia/voz/` (centro de voz), `_components/VoiceStatusCard.tsx`, `_components/VoiceActivationPanel.tsx`, enlace «Centro de voz» en `NewAgentButtons`.
