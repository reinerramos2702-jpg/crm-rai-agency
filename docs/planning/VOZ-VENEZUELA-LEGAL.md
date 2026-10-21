# Voz en Venezuela — número, aspectos legales y piloto

Fecha de la investigación: 16 oct 2026. **No es asesoría legal: todo lo marcado «requiere revisión de abogado» debe validarlo un abogado venezolano antes de operar con clientes reales.** Las cifras de costo son estimadas; lo no confirmado está dicho como tal.

## A. Cómo conseguir y atender un número para Venezuela (+58)

### Qué se confirmó en fuentes oficiales

| Hecho | Fuente |
|---|---|
| Los números gestionados por Retell se compran solo para **EE. UU. y Canadá** (2 USD/mes); Retell no menciona Venezuela en precios ni en la lista de países de llamadas. | docs.retellai.com/deploy/purchase-number, /deploy/international-call, retellai.com/pricing |
| Retell admite **traer tu propio número** por troncal SIP (`POST /import-phone-number`, E.164 sin restricción de país; la validación E.164 se omite por defecto). Con troncal propia **Retell no cobra telefonía**. | docs.retellai.com/api-references/import-phone-number, /deploy/custom-telephony, retellai.com/pricing |
| Guía oficial Retell + Telnyx: troncal SIP «FQDN» apuntando a `sip.retellai.com` (SRV), códecs G722/G711U/G711A, transporte TCP, credenciales y luego importar el número en Retell. | docs.retellai.com/deploy/telnyx |
| **Telnyx vende números locales y gratuitos (800) de Venezuela**; el local parte de **12 USD/mes**; portabilidad «FastPort» para números venezolanos existentes. | telnyx.com/phone-numbers/venezuela, support.telnyx.com/en/articles/3734973 |
| Requisitos Telnyx para número **local** de Venezuela: cédula/pasaporte venezolano (persona) o **registro mercantil venezolano** (empresa), **dirección en Venezuela** con comprobante de menos de 3 meses y descripción del uso; activación en ~**72 horas**. El **gratuito** acepta dirección de cualquier país. | support.telnyx.com/en/articles/3734973 |
| Twilio lista requisitos para números **locales y gratuitos (+58800)** de Venezuela (local: identidad y comprobante de dirección local; gratuito: carta de autorización, dirección en cualquier país). Sus guías de voz indican entrante doméstico e internacional: sí. | twilio.com/en-us/guidelines/ve/regulatory, /venezuela--voice-guidelines---twilio |
| Twilio, tarifa **saliente** a Venezuela: fijo 0,0682 USD/min, móvil 0,1739 USD/min. Entrante por SIP/BYOC: 0,0040 USD/min. | twilio.com/en-us/voice/pricing/ve |

### No confirmado (decirlo antes de prometer nada)

- Si Twilio **vende hoy** números de Venezuela (la página de requisitos no dice «disponible»; el precio de número no aparece para Venezuela): hay que mirar la consola.
- La tarifa **entrante por minuto** de Telnyx para un DID de Venezuela (la página no la mostró).
- Si un desvío de línea fija o celular venezolano (CANTV, Movistar, Digitel, Movilnet) hacia un número de EE. UU. está habilitado, cuánto cuesta y si el operador lo permite hacia el exterior. **No se encontró fuente.**
- Si es posible portar a un proveedor extranjero una línea venezolana existente (Telnyx publica «FastPort» pero no condiciones para Venezuela).
- Regulación de Conatel para terminar tráfico VoIP en números venezolanos. **Requiere revisión de abogado.**
- Calidad y latencia reales del audio desde Venezuela hacia Retell (medir en la prueba).

### Rutas evaluadas

| Ruta | Cómo funciona | Costo estimado | Viabilidad | Veredicto |
|---|---|---|---|---|
| **1. DID venezolano en Telnyx + SIP a Retell** | El llamante marca un número local venezolano normal; Telnyx lo entrega por SIP a Retell. | Número ≥12 USD/mes + entrante por minuto (sin confirmar, se supone ≤0,02) + Retell ~0,1185/min | Exige que el **negocio piloto** aporte registro mercantil/RIF y comprobante de dirección en Venezuela; ~72 h de validación | **Recomendada para el piloto** si el negocio puede aportar los documentos |
| **2. Número gratuito (+58 800) en Telnyx o Twilio** | Igual, pero con dirección de cualquier país | Sin confirmar | Documentación más ligera; los 800 venezolanos pueden no marcarse desde celulares o desde fuera (sin confirmar) | Alternativa si la ruta 1 se atasca |
| **3. Número de EE. UU. (Retell 2 USD/mes o Twilio 1,15) + desvío del número del negocio** | El negocio desvía su línea habitual al número de EE. UU. | 1,15–2 USD/mes + costo del desvío internacional (sin confirmar) | Rápida para **probar el agente** (minutos), frágil para operar: depende del operador | **Solo para la prueba técnica** mientras se tramita la ruta 1 |
| **4. Número de EE. UU. sin desvío** | El cliente llama a un +1 | Barata | Llamar a EE. UU. desde Venezuela es caro y poco natural para el cliente | Descartada |
| **5. Reventa VoIP de Venezuela (Didww, Voxbone, etc.)** | DID venezolano con reenvío SIP | Sin investigar | No se verificó ningún proveedor | Pendiente si Telnyx falla |

### Recomendación (ruta más barata y viable para el piloto)

1. **Hoy:** probar el agente con un número de EE. UU. (ruta 3, sin desvío; llamar tú mismo) para validar voz, base de conocimiento, webhook y costos por 1,15–2 USD.
2. **En paralelo, empezar ya el trámite de la ruta 1** (Telnyx, DID local Venezuela) con los documentos del negocio piloto; son ~72 h de validación y varios requisitos dependen de terceros.
3. Si el negocio no puede aportar documentos: ruta 2 (800) o buscar un proveedor de la ruta 5.
4. Pasos técnicos de la ruta 1: troncal SIP en Telnyx (FQDN → `sip.retellai.com`, TCP, G722/G711), comprar el DID, importarlo en Retell con el agente en `inbound_agents`, activar el agente en `/agentes-ia/voz`.
5. Antes de elegir, **pedir a Telnyx por escrito** la tarifa entrante por minuto para Venezuela y confirmar si cubre el tipo de línea deseado.

## B. Checklist legal — requiere revisión de abogado

Marco que se encontró (resumen, sin valor de dictamen):
- Constitución, art. 48 (inviolabilidad de las comunicaciones privadas), art. 60 (honor, vida privada) y art. 28 (acceso, rectificación y supresión de los propios datos).
- **Ley sobre Protección a la Privacidad de las Comunicaciones** (Gaceta Oficial N.º 34.863, 16-dic-1991): su art. 2 castiga con prisión de 3 a 5 años a quien «arbitraria, clandestina o fraudulentamente» grabe o se imponga de una comunicación **entre otras personas** y a quien la revele. El texto leído **no regula expresamente** el consentimiento de un participante; un resumen de terceros la clasifica como «consentimiento de una parte», pero eso no es una norma citada. Aquí hay un tercero (el proveedor de voz) y la grabación la hace una IA: **tratar el consentimiento como obligatorio**.
- Ley Especial contra los Delitos Informáticos (2001) y Código Penal (interceptación): citadas por fuentes secundarias; revisar.
- **No existe una ley integral de protección de datos ni autoridad reguladora** (DLA Piper, revisión de dic. 2022); aplican principios desarrollados por el TSJ (consentimiento, finalidad, seguridad) y una regla de no transferir a países sin protección equivalente. Los datos viajan a un proveedor en EE. UU.: **el abogado debe opinar sobre la transferencia**.

| # | Requisito | Cómo lo cubre el sistema hoy | Pendiente |
|---|---|---|---|
| 1 | Aviso de IA al inicio de la llamada | `aiDisclosure` activo por defecto; el saludo añade «Soy un asistente de inteligencia artificial» y el prompt prohíbe fingir ser persona | Revisar el texto exacto con el abogado |
| 2 | Aviso de grabación y consentimiento | Si `recording` está activo, el saludo añade «Esta llamada puede ser grabada…» y el agente ofrece una persona si el llamante no quiere | Definir qué hacer si se niega (ahora: ofrecer persona) |
| 3 | Grabación apagada por defecto | `recording=false` → `data_storage_setting = basic_attributes_only` (sin audio ni transcripción en el proveedor) | Encender solo tras revisión legal |
| 4 | Privacidad de las comunicaciones (Ley 1991) | Solo se graba la llamada propia del negocio, con aviso | Confirmar que el aviso basta |
| 5 | Datos personales del llamante | Teléfono y transcripción en el CRM; ver solo roles que gestionan agentes; todo acotado por workspace | Política de privacidad del negocio piloto; derecho de acceso/supresión (art. 28) |
| 6 | Retención | No hay borrado automático (deuda) | Fijar plazo (propuesta: transcripciones 90 días, audio 30) y script de borrado |
| 7 | Datos sensibles por voz (salud, pagos, cédula) | El prompt no los pide; no hay enmascarado | En el piloto **no tomar datos de pago ni de salud** por voz; evaluar el add-on de eliminación de PII de Retell (0,01 USD/min) |
| 8 | Transferencia internacional de datos | Proveedor en EE. UU. | Cláusula y aviso; revisar el acuerdo de tratamiento de datos de Retell y Telnyx |
| 9 | Llamadas de emergencia | La telefonía de Twilio no ofrece llamadas de emergencia (911/933); el agente no es canal de emergencias | Decir en el saludo/prompt que no atiende emergencias (palabra «emergencia» ya escala) |
| 10 | Contrato con el negocio piloto | — | Anexo que liste el tratamiento de datos, responsables, retención y quién avisa a sus clientes |
| 11 | Regulación de telecomunicaciones (Conatel) del DID/VoIP | — | Consulta específica |
| 12 | Llamadas salientes/mercadeo | **No existen** en esta fase | Revisar antes de habilitarlas |

## C. Tope de gasto recomendado para el piloto (2 semanas, 1 negocio)

Supuestos (ESTIMADOS): costo variable **0,14 USD/min** = 0,1185 (voz 0,07 + modelo 0,04 + telefonía 0,0085) más 0,02 de margen por el tramo venezolano aún sin confirmar; número 12 USD (un mes de Telnyx); 40 min de pruebas propias (5,60 USD). Sin transferencias a celular (cada minuto de esa pierna sumaría ~0,17 USD).

| Escenario | Llamadas/día × min | Minutos (14 días) | Voz | Número + pruebas | Total |
|---|---|---|---|---|---|
| Bajo | 8 × 2 | 224 | 31,36 | 17,60 | **≈ 49** |
| Base | 15 × 2,5 | 525 | 73,50 | 17,60 | **≈ 91** |
| Alto | 30 × 3 | 1.260 | 176,40 | 17,60 | **≈ 194** |

**Tope recomendado: 100 USD para las dos semanas** (cubre el escenario base con ~10 % de margen y equivale a ~628 min de llamadas después del número). Aviso al 80 % (80 USD). Cómo aplicarlo:
- `VOICE_MONTHLY_CAP_USD=100` y en Ajustes de voz el mismo valor. Como el corte automático por API es deuda, **el corte duro es cargar en Retell solo ese crédito** (los 10 USD de bienvenida cuentan): sin saldo, Retell desconecta con `credit_exhausted`.
- Si al día 7 el gasto supera 70 USD, revisar duración promedio y transcripciones antes de seguir; si el escenario alto se confirma, subir el tope solo con decisión de Reiner.
- Sin documentos para el DID: el piloto con número de EE. UU. costaría ~12 USD menos, pero no es operable para clientes reales.

### Plan de piloto (2 semanas, un negocio)

| Días | Qué | Salida |
|---|---|---|
| 1–2 | Elegir negocio (con horarios, precios y FAQs claros); cargar su base de conocimiento; ruta 3 de prueba; iniciar trámite del DID | Agente que responde bien 10 preguntas del negocio |
| 3–5 | DID activo y SIP en Retell; avisos de IA y (si el abogado lo aprueba) de grabación; solo horario laboral; transferencia desactivada | Primeras llamadas reales con revisión diaria de transcripciones |
| 6–10 | Ajustar prompt y base con las preguntas sin respuesta; activar toma de mensajes fuera de horario | ≥80 % de llamadas «resueltas» o con mensaje tomado |
| 11–14 | Medir: llamadas, minutos, costo real vs. estimado, resultado, quejas; decidir si se sigue | Informe de una página y decisión: seguir, ajustar o parar |

Criterios de éxito: costo real por minuto ≤ 0,16 USD; ≥70 % de llamadas sin necesidad de humano; 0 respuestas inventadas graves; el negocio pide continuar. Criterios de parada: una queja legal o de privacidad, gasto > 80 USD antes del día 10 sin valor visible, o fallos de audio recurrentes.

## Fuentes

- Retell: docs.retellai.com (webhook, secure-webhook, custom-function, create/update LLM y agente, list/get call, web call, import-phone-number, purchase-number, international-call, telnyx) y retellai.com/pricing, leídas el 16 oct 2026.
- Telnyx: telnyx.com/phone-numbers/venezuela; support.telnyx.com/en/articles/3734973-venezuela-did-requirements; telnyx.com/pricing/elastic-sip/inbound (sin tarifa de Venezuela).
- Twilio: twilio.com/en-us/guidelines/ve/regulatory; twilio.com/en-us/guidelines/ve/venezuela--voice-guidelines---twilio; twilio.com/en-us/voice/pricing/ve.
- Ley sobre Protección a la Privacidad de las Comunicaciones (texto en knobbe.com); recordinglaw.com (resumen de terceros); DLA Piper, Data Protection in Venezuela (dlapiperdataprotection.com).
