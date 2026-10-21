# SPEC — Middleware de protección de páginas

Estado: **v1.0 (11 oct 2026) — decisión de Reiner: B (proteger páginas en el servidor).**
Rama prevista: se decide al ejecutar (no mezclar con staging ni con login/registro UI). Nada se envía a OpenCode hasta que Reiner lo autorice.

## 1. Objetivo
Hoy no existe `src/middleware.ts`: páginas como `/contactos` responden 200 sin sesión (verificado el 11 oct contra staging local) y la protección vive solo en las APIs y en el wrapper `apiFetch` del cliente (que redirige a `/login` ante 401). Se quiere que una petición de **página** sin sesión válida sea redirigida a `/login` desde el servidor, antes de renderizar.

## 2. Alcance
Un único archivo nuevo `src/middleware.ts` + tests. Sin cambios de esquema, sin dependencias nuevas (`jose` ya está en el proyecto y funciona en Edge).

**Fuera de alcance:** cambiar la lógica de autenticación de las APIs (`getAuth`), roles/permisos por workspace, RLS, rediseño de `/login`.

## 3. Comportamiento
1. Matcher: todo EXCEPTO `_next/static`, `_next/image`, `favicon.ico`, archivos de `public/` (por extensión de imagen/fuente) y las rutas `/api/*` (las APIs siguen protegiéndose con `getAuth`; el middleware NO las toca).
2. Rutas **públicas** de página (sin sesión): `/login`, `/registro`, `/go/*`, `/book/*`. **Paso de mapeo obligatorio antes de codificar:** el agente confirma en el código si hay otras páginas públicas (landing en `/`, páginas legales, etc.) y las lista en el PR; ante duda, NO las deja públicas y lo reporta a Reiner.
3. Ruta protegida sin cookie `rai_session` o con JWT inválido/vencido → redirección 307 a `/login?next=<ruta original>` (solo rutas relativas internas; ignorar `next` externo para evitar open redirect).
4. Usuario CON sesión válida que entra a `/login` o `/registro` → redirección a `/` (o a `next` si es interno).
5. Verificación del JWT: `jwtVerify` (HS256) con `JWT_SECRET`, reutilizando la lógica de `verifyJwt` en `src/lib/auth.ts` si es compatible con Edge (esa función no importa Prisma; si el módulo sí arrastra `prisma`, extraer SOLO la verificación a un archivo sin dependencias de Node y reusarlo en ambos sitios — no duplicar lógica).
6. Si `JWT_SECRET` no está configurado → tratar como sin sesión (redirige a login) y log de error claro; nunca dejar pasar.
7. `DEV_BYPASS_AUTH`: respeta `isDevBypassActive()` (solo fuera de producción) para no romper el desarrollo local; en producción/staging con `NODE_ENV=production` se ignora, igual que hoy.
8. Peticiones de prefetch/RSC siguen la misma regla (sin excepciones).

## 4. Criterios de aceptación (verificables)
- Sin cookie: `GET /contactos` → 307 con `Location` a `/login?next=%2Fcontactos`.
- Cookie válida: `GET /contactos` → 200.
- Cookie manipulada o vencida: → 307 a `/login`.
- `GET /login` y `GET /registro` sin cookie → 200. Con cookie válida → 307 a `/`.
- `next=https://evil.com` o `next=//evil.com` → se ignora (redirige a `/`).
- `GET /go/<slug>` y `GET /book/<slug>` sin cookie → 200 (públicas).
- `/api/*` sin cambios de comportamiento (las suites existentes siguen verdes).
- Tests unitarios del middleware (todas las ramas anteriores) + `node scripts/gate.mjs --fast` verde; build completo al cerrar.
- Prueba real contra staging local (`npm run dev` con `.env.staging`): evidencia con `curl -i` de los casos de arriba.

## 5. Restricciones
- No inventar rutas públicas; ante duda, protegida y reportada.
- Sin secretos en código/logs. Sin push/merge/deploy sin autorización de Reiner.
- Registrar el avance en `docs/ESTADO-SESION.md` y actualizar el panel de control (`data-*`) cuando se ejecute.

## 6. Riesgos
- **Bloquearse a sí mismo:** un matcher mal hecho puede redirigir `/login` en bucle → test explícito de no-bucle.
- **Páginas públicas olvidadas** (landing de captación, `/go`, `/book`) → mitigado por el paso de mapeo del §3.2.
- **Cookie de sesión `SameSite`/`Secure` en staging** (HTTP local vs HTTPS Vercel) → comprobar en ambos.
