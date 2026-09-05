import { test, expect } from '@playwright/test';

/**
 * ─────────────────────────────────────────────────────────────────────────
 * FLUJOS PRINCIPALES (sección 3 del master prompt): creación de lead/contacto
 * y publicación de contenido.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Test 1 — UI real de creación de "lead": se investigaron las dos páginas
 * candidatas indicadas en la tarea:
 *   - `src/app/contactos/page.tsx` ("Agregar Contacto"): el botón dispara
 *     únicamente `toast('Próximamente')` — no abre ningún form/modal. No hay
 *     UI real que probar ahí todavía.
 *   - `src/app/clientes-potenciales/page.tsx` ("Añadir oportunidad"): SÍ abre
 *     un modal real (`AddOpportunityModal`) con un formulario completo
 *     (nombre del contacto, email, teléfono, nombre del cliente potencial,
 *     etapa, valor, etc.) — esta es la UI real de creación de lead en este
 *     repo (terminología GHL: "oportunidad" = lead dentro de un pipeline).
 *   Por eso este test usa `/clientes-potenciales`, con selectores por texto
 *   visible (placeholders/labels reales del form), no IDs adivinados.
 *
 *   Aviso importante: al momento de escribir este test, el botón "Crear" del
 *   modal (línea ~250 de `clientes-potenciales/page.tsx`) es un placeholder
 *   de Fase 1 (ver CLAUDE.md §1: "Sin lógica, sin DB, sin APIs nuevas...
 *   Forms renderizan pero no envían") — su `onClick` solo hace
 *   `toast.success('Oportunidad creada (placeholder)')` y cierra el modal,
 *   SIN ningún `fetch()` a una API ni escritura en DB. El pipeline debajo
 *   sigue hardcodeado a "0 clientes potenciales" / "Sin oportunidades"
 *   (empty state estático). Por lo tanto, la aserción final de este test
 *   (que el lead recién creado aparezca en el pipeline) fallará HOY de forma
 *   determinística — no por falta de DB/infra en el sandbox, sino porque la
 *   UI todavía no está conectada a ningún backend. El test está escrito para
 *   distinguir claramente ese caso (mensaje de error explícito) de un fallo
 *   de selector/UI genuino, y debería empezar a pasar sin cambios en cuanto
 *   "Crear" llame a una API real que persista la oportunidad.
 *
 * Test 2 — publicación de contenido: se prueba a nivel de API (no UI) contra
 * `POST /api/publish/instagram` (`src/app/api/publish/instagram/route.ts`),
 * migrado en el Bloque 1 a `WorkspaceMetaConnection` scoped por workspace.
 * Sin credenciales reales de Meta configuradas, publicar de verdad no es
 * viable en este entorno (documentado como fuera de alcance del PR del
 * Bloque 1) — lo que SÍ se puede y se debe probar es que el sistema maneja
 * el caso "workspace sin Instagram conectado" devolviendo un error claro y
 * seguro (422) en vez de un 500 o una publicación corrupta, o un 401 limpio
 * si además no hay autenticación en el entorno de test. Ambos son resultados
 * válidos y esperados: la regla de manejo estándar de errores del master
 * prompt no exige lograr una publicación real, exige que el fallo sea claro.
 */

test.describe('Flujo: creación de lead/contacto', () => {
  test('crear una oportunidad (lead) desde /clientes-potenciales y verificar que aparece en el pipeline', async ({
    page,
  }) => {
    const response = await page.goto('/clientes-potenciales');
    expect(response?.status()).toBe(200);

    await expect(page.getByRole('heading', { name: 'Clientes Potenciales' })).toBeVisible();

    // Abre el modal real de creación ("Añadir oportunidad" en el toolbar
    // superior del tab "Clientes Potenciales", que es el tab por defecto).
    await page.getByRole('button', { name: /añadir oportunidad/i }).first().click();

    const modal = page.locator('.modal', { hasText: 'Añadir una nueva oportunidad' });
    await expect(modal).toBeVisible();

    // Datos claramente marcados como test, con timestamp para evitar
    // colisiones entre corridas.
    const leadName = `TEST E2E Lead ${Date.now()}`;
    const leadEmail = 'test-e2e-lead@example.test';
    const leadPhone = '+1 555 000 1234';

    // Selectores por placeholder visible real del formulario (ver
    // `AddOpportunityModal` en clientes-potenciales/page.tsx), no IDs.
    await modal.getByPlaceholder('Introducir correo electrónico').fill(leadEmail);
    await modal.getByPlaceholder('Introduce el número de teléfono').fill(leadPhone);
    await modal.getByPlaceholder('Introducir el nombre del cliente potencial').fill(leadName);

    await modal.getByRole('button', { name: 'Crear' }).click();

    // El modal debe cerrarse tras "Crear" — esto confirma que el form real
    // responde al submit (aunque hoy sea un placeholder de UI).
    await expect(modal).toBeHidden();

    // Aserción que realmente importa: ¿el lead creado aparece en la lista/
    // pipeline? Se envuelve para reportar con claridad si el fallo es de
    // infraestructura/UI vs. de feature-aún-no-conectada-a-backend.
    try {
      await expect(page.getByText(leadName)).toBeVisible({ timeout: 5_000 });
    } catch {
      throw new Error(
        'La oportunidad de prueba NO aparece en el pipeline tras crearla. ' +
          'Esto NO es un fallo de selector/UI (el modal se abrió, se llenó y se ' +
          'cerró correctamente) ni necesariamente un problema de DB no conectada ' +
          'en este sandbox: el botón "Crear" de AddOpportunityModal ' +
          '(src/app/clientes-potenciales/page.tsx, ~línea 250) es todavía un ' +
          'placeholder de Fase 1 — solo ejecuta ' +
          "toast.success('Oportunidad creada (placeholder)') y cierra el modal, " +
          'sin llamar ninguna API ni persistir nada (no hay fetch() en su onClick). ' +
          'El tablero sigue hardcodeado con "0 clientes potenciales" / "Sin ' +
          'oportunidades" (empty state estático), así que ningún lead creado desde ' +
          'este form puede aparecer todavía. Cuando "Crear" se conecte a un endpoint ' +
          'real que persista la oportunidad (p. ej. análogo a POST /api/contacts), ' +
          'este test debería pasar sin modificaciones.'
      );
    }
  });
});

test.describe('Flujo: publicación de contenido', () => {
  test('POST /api/publish/instagram sin conexión Meta devuelve un error claro (401 o 422)', async ({
    request,
  }) => {
    const body = {
      taskId: 'test-e2e-task-sin-meta-conectado',
      assetUrl: 'https://example.test/assets/test-e2e-asset.jpg',
      caption: 'TEST E2E — caption de prueba, no se publica de verdad.',
      assetType: 'IMAGE',
    };

    const response = await request.post('/api/publish/instagram', { data: body });
    const status = response.status();
    const payload = await response.json().catch(() => null);

    // No se puede probar una publicación real sin credenciales de Meta
    // (fuera de alcance, documentado en el PR del Bloque 1). Lo que SÍ debe
    // cumplirse siempre: el sistema nunca intenta publicar sin una conexión
    // válida, y responde con un error claro en vez de un 500 genérico o un
    // "success" falso.
    //
    //  - 401: no hay autenticación en este entorno de test (DEV_BYPASS_AUTH
    //    no está activo aquí) — `requirePermission` corta antes de llegar a
    //    revisar la conexión de Meta. Resultado válido y esperado.
    //  - 422: sí hay autenticación (dev bypass u otra), pero el workspace no
    //    tiene `WorkspaceMetaConnection` configurada — exactamente el caso
    //    que este test quiere confirmar que se maneja de forma segura.
    expect(
      [401, 422].includes(status),
      `Se esperaba 401 (sin auth) o 422 (workspace sin Instagram conectado), ` +
        `pero la respuesta fue ${status}. Body: ${JSON.stringify(payload)}. ` +
        `Un 500 aquí indicaría que la ruta intentó llamar a la Graph API de Meta ` +
        `sin validar la conexión primero, o que revienta antes del guard de auth/ ` +
        `conexión — ambos serían regresiones del manejo de errores esperado.`
    ).toBe(true);

    if (status === 401) {
      expect(payload?.error).toMatch(/unauthorized/i);
    } else if (status === 422) {
      expect(payload?.error).toMatch(/instagram conectado/i);
    }
  });
});
