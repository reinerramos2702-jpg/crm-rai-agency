import { defineConfig, devices } from '@playwright/test';

/**
 * E2E (Bloque 1, sección 3 del master prompt): foco ineludible en login,
 * aislamiento por tenant, creación de lead y publicación de contenido.
 * Corre contra `npm run dev` en localhost:3000 — el runner lo levanta solo.
 *
 * Paridad móvil (Bloque 3, lección ya documentada de la sesión de rediseño
 * web): los proyectos 'mobile-*' fuerzan `hover: none` + `pointer: coarse`.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'], hasTouch: true, isMobile: true },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
