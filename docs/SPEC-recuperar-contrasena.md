# SPEC — Recuperar contraseña (email o SMS) v1.0

> Pedido de Reiner (11 oct 2026): botón «¿Olvidaste tu contraseña?» con dos vías, correo y teléfono. Implementado en local (sin push).

## Flujo
1. `/login` → enlace `/recuperar`. El usuario elige **Correo** o **Teléfono** (formato internacional, ej. `+58 412 1234567`).
2. `POST /api/auth/forgot-password { identifier }` → respuesta **siempre genérica** (no revela si la cuenta existe).
3. Se envía un enlace `/restablecer?token=…` de **un solo uso**, vigencia **30 min**.
4. `POST /api/auth/reset-password { token, password }` → cambia la contraseña y consume todos los tokens del usuario.

## Seguridad
- Token de 256 bits; en DB solo `sha256`; un token nuevo invalida los anteriores.
- Rate limit: 3 por identificador y 10 por IP cada 15 min (reset: 10 por IP). En memoria (por instancia) = deuda.
- Teléfono asociado a 2+ cuentas → no se envía (ambiguo). Teléfono sin verificar (lo declara el usuario en el registro).
- El enlace usa `NEXT_PUBLIC_APP_URL`, nunca la cabecera `Host`.
- En producción sin proveedor configurado NO se envía ni se imprime el enlace.
- **Deuda:** las sesiones JWT ya abiertas no se revocan al cambiar la contraseña (sin revocación en servidor).

## Datos (migración local, NO aplicada)
`prisma/migrations/20261011180000_add_password_reset_and_phone/migration.sql`: `User.phone` (opcional) + tabla `PasswordResetToken`. Se aplica con aprobación de Reiner (staging primero).

## Envío real
- **Email: Resend (plan gratuito)** — decisión de Reiner («el que sea gratis», 12 oct). Plan gratuito ≈ 3.000 correos/mes (dato de fuente de terceros; confirmar en resend.com/pricing). Requiere: cuenta Resend, dominio `raiagency.net` verificado (DNS) y las variables `RESEND_API_KEY` y `EMAIL_FROM` (solo las pone Reiner; sin clave el código no envía).
- **SMS: PENDIENTE.** No hay opción gratuita: la prueba de Twilio solo envía a 5 números verificados y con plantillas propias. Opciones de pago (SMS o WhatsApp) por decidir; hasta entonces la vía Teléfono funciona solo en desarrollo (enlace por consola).
- Sin proveedor: desarrollo/staging imprime el enlace en la terminal; producción no envía (`src/lib/notify.ts`).

## Tests
`src/lib/__tests__/auth-forgot-reset.test.ts` (11) + 1 de teléfono en `auth-register.test.ts`. Suite del área: 203/203.
