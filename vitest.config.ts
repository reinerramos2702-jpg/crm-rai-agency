import { defineConfig } from 'vitest/config';
import path from 'node:path';

/**
 * Pruebas unitarias (Bloque 1, sección 3 del master prompt — testing obligatorio
 * de la lógica de negocio crítica: RBAC, permisos). Los flujos end-to-end
 * (login, aislamiento por tenant, creación de lead, publicación de contenido)
 * viven en Playwright (`playwright.config.ts`), no aquí.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
