import { test, expect } from '@playwright/test';

/**
 * ─────────────────────────────────────────────────────────────────────────
 * AUTENTICACIÓN — modo DEV_BYPASS_AUTH (no un form de login real)
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Este repo NO implementa un login de UI clásico (no hay form de
 * email/password, no hay NextAuth). La autenticación real de producción
 * es JWT propio vía header `Authorization: Bearer <token>`, emitido por un
 * CRM externo que actúa como SSO (ver `src/lib/auth.ts` → `getAuth` /
 * `verifyJwt`). No existe ninguna página en `src/app/` que renderice un
 * formulario de login (se verificó con `grep -ri "login" src/app` — los
 * únicos resultados son usos del ícono `LogIn` de lucide-react en el
 * módulo de Reservas para check-in/check-out de huéspedes, no auth).
 *
 * En el entorno de desarrollo local, `getAuth` respeta la variable de
 * entorno `DEV_BYPASS_AUTH=true` (ver `.env.example`): si está activa,
 * se omite por completo la verificación de JWT y se devuelve un usuario
 * dummy fijo (`dev-user-001` / `dev@rai.local`). Ese usuario es además
 * dueño (owner) del workspace que `getOrCreateWorkspace` le crea/asigna
 * automáticamente, por lo que `getRole` (`src/lib/roles.ts`) le asigna
 * el rol `admin` — acceso total, incluidas rutas restringidas como
 * `/keys` y `/settings` (ver `MODULE_ACCESS` en `src/lib/roles-shared.ts`).
 *
 * Por lo tanto, en este entorno el "flujo de login" observable es: no hay
 * pantalla de login que superar — cualquier página protegida carga directo
 * porque el bypass ya autentica al usuario dummy como admin del workspace.
 * Estos tests verifican exactamente eso: que la raíz y una ruta restringida
 * por rol cargan sin redirigir a un login inexistente.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Cómo se testearía un login JWT real (fuera del alcance de este archivo)
 * ─────────────────────────────────────────────────────────────────────────
 * 1. Generar un JWT firmado con el mismo `JWT_SECRET` del entorno de test,
 *    usando un helper de test (ej. `jose`'s `SignJWT`) con `sub` (userId),
 *    `email` y, opcionalmente, `name` — los mismos campos que `verifyJwt`
 *    espera en `src/lib/auth.ts`.
 * 2. Crear un contexto de Playwright con ese token ya adjunto:
 *      const context = await browser.newContext({
 *        extraHTTPHeaders: { Authorization: `Bearer ${signedJwt}` },
 *      });
 *    (o usar `request.newContext({ extraHTTPHeaders: {...} })` para
 *    pruebas de API puras contra las rutas bajo `src/app/api/`).
 * 3. Correr esos tests con `DEV_BYPASS_AUTH=false` para forzar la
 *    verificación real del JWT y confirmar que un token inválido/ausente
 *    responde 401 (`requireAuth`) y uno válido resuelve el `AuthContext`
 *    esperado.
 * 4. Como no existe UI de login, este flujo se probaría a nivel de API
 *    (`request.get('/api/...', { headers: { Authorization }})`) y no
 *    navegando una página con Playwright's `page`.
 */

test.describe('Autenticación (dev bypass)', () => {
  test('la página raíz (/) carga sin redirigir a un login inexistente', async ({ page }) => {
    const response = await page.goto('/');

    expect(response?.status()).toBe(200);
    // No debe haber sido redirigida a una ruta de login (no existe ninguna).
    expect(page.url()).not.toMatch(/\/login/i);

    // Contenido visible del dashboard (TopBar se renderiza en todas las
    // páginas autenticadas; su presencia confirma que no quedamos
    // bloqueados en una pantalla en blanco o de error de auth).
    await expect(page.locator('body')).toBeVisible();
  });

  test('una ruta protegida por rol (/keys) carga en dev bypass como admin', async ({ page }) => {
    // /keys está restringida a ['admin', 'gerente'] en MODULE_ACCESS
    // (src/lib/roles-shared.ts). El usuario dummy de DEV_BYPASS_AUTH es
    // owner del workspace ⇒ rol 'admin' ⇒ debe poder acceder sin problema.
    const response = await page.goto('/keys');

    expect(response?.status()).toBe(200);
    expect(page.url()).not.toMatch(/\/login/i);
    await expect(page.locator('body')).toBeVisible();
  });

  test('otra ruta protegida por rol (/settings) también carga en dev bypass', async ({ page }) => {
    // /settings también está restringida a ['admin', 'gerente'].
    const response = await page.goto('/settings');

    expect(response?.status()).toBe(200);
    expect(page.url()).not.toMatch(/\/login/i);
    await expect(page.locator('body')).toBeVisible();
  });
});
