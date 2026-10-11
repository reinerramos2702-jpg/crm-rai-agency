# SPEC — Modelo freemium y planes de pago (v0.1, BORRADOR)

> Estado: **borrador abierto**. Decidido por Reiner el 11 oct 2026 (chat). Todo lo marcado "POR DECIDIR" NO está cerrado: no implementar ni enviar a OpenCode hasta cerrarlo.

## 1. Decisión de negocio (cerrada por Reiner)

- El CRM es **vendible y escalable**: cualquiera se registra y lo usa **gratis** (registro abierto; ya implementado en `d387b05`).
- Funciones **muy básicas = gratis** (captar tráfico).
- Funciones **intermedias y complejas = de pago**. Ejemplo explícito: **publicación automática en Instagram**.
- Planes de pago: **34 USD, 49 USD y 67 USD** (de menor a mayor).

## 2. POR DECIDIR (no inventar)

| # | Pregunta | Estado |
|---|----------|--------|
| P1 | Qué funciones van en Gratis / 34 / 49 / 67 | abierto (Reiner) |
| P2 | Periodo del precio (¿mensual?, ¿anual con descuento?) y moneda de cobro | abierto |
| P3 | Proveedor de cobro (el panel menciona Stripe; Binance y pago móvil también existen) | abierto |
| P4 | Límites por plan (publicaciones/mes, workspaces, miembros, generación de imágenes, créditos) | abierto |
| P5 | ¿Prueba gratis de los planes de pago? ¿Cuántos días? | abierto |
| P6 | Qué pasa al bajar de plan o dejar de pagar (solo lectura, degradar, borrar) | abierto |
| P7 | Meta: la app es de RAI (`shared_app`); la revisión de Meta y el volumen limitan cuántos clientes pueden publicar | verificar con Meta |

## 3. Diseño técnico propuesto (para validar, no implementado)

- `Workspace.plan` (`free` | `starter_34` | `pro_49` | `scale_67`; nombres provisionales) + `planStatus` + `planRenewsAt`.
- Registro de funciones (`src/lib/plans.ts`): mapa `feature → plan mínimo`; función única `canUse(workspace, feature)`.
- Gating en **servidor** (rutas API y server components) con `403 {error:'plan_required', feature, requiredPlan}`; la UI solo oculta/bloquea con CTA de mejora (nunca es la barrera de seguridad).
- Ruta de facturación por webhook del proveedor (verificación de firma); el proveedor es la fuente de verdad del estado de pago.
- Auditoría con `logAudit` en cada cambio de plan.
- Migración solo local/dev hasta autorización de Reiner.

## 4. Riesgos y bloqueos

- **No desplegar el registro abierto a producción sin el gating de planes**: hoy un usuario nuevo con workspace propio alcanza todas las funciones (incluida la publicación automática y el consumo de claves/IA de pago).
- Sin verificación de email (diferida en spec v4 §7) → riesgo de cuentas basura; mitigado por rate limit + honeypot.
- Rate limit en memoria (por instancia): insuficiente en serverless a escala.
- Textos legales: `/terminos` y `/privacidad` son placeholders; los define Reiner (idealmente con asesoría legal) antes del lanzamiento.
- Cobros reales, claves de Stripe/Binance y webhooks: solo los configura Reiner; el agente nunca los escribe en formularios.

## 5. Criterios de aceptación (cuando se cierre P1–P6)

1. `canUse` cubierto por tests para cada función × plan.
2. Cada ruta de pago devuelve 403 `plan_required` en plan insuficiente (test por ruta).
3. Webhook con firma inválida → 400 (test).
4. Panel de control actualizado con evidencia; sin push/merge/deploy sin autorización.
