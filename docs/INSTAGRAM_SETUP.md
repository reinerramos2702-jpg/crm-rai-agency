# Activación del módulo Instagram — guía 100% desde el teléfono

> Todo este proceso se hace desde el navegador del teléfono (Chrome/Safari).
> Tiempo estimado: 30–45 min la primera vez. Orden estricto: no saltes pasos.

---

## PASO 0 — Lo que ya debes tener

- Cuenta de Instagram **profesional** (Business) de @raiagency__
- Una **Página de Facebook** vinculada a esa cuenta de Instagram
  (Instagram app → Perfil → Editar página → Conectar página de Facebook, si no está)
- Acceso al dashboard de Vercel y de Supabase desde el navegador del teléfono

---

## PASO 1 — Crear la app en Meta Developers (teléfono, modo escritorio)

1. Abre `developers.facebook.com` en Chrome del teléfono.
2. Menú ⋮ de Chrome → marca **"Sitio de escritorio"** (la consola de Meta funciona mejor así).
3. Inicia sesión con el Facebook dueño de la Página de RAI Agency.
4. **My Apps → Create App**.
5. Caso de uso: elige **"Other"** → tipo **"Business"** → Next.
6. Nombre: `RAI Content Engine` → tu email → Create App.
7. En el dashboard de la app, busca la tarjeta **Instagram** → **Set up** (esto agrega Instagram Graph API).
8. Anota (Settings → Basic):
   - **App ID**
   - **App Secret** (botón Show) → este valor va en la variable `META_APP_SECRET`

## PASO 2 — Generar el token de acceso (Graph API Explorer)

1. Mismo navegador: abre `developers.facebook.com/tools/explorer`.
2. Arriba a la derecha selecciona **tu app** (RAI Content Engine).
3. Botón **"Generate Access Token"** / **"Get User Access Token"** — al abrir el popup de permisos, agrega estos permisos (Add permissions):
   - `instagram_basic`
   - `instagram_content_publish`
   - `instagram_manage_comments`
   - `instagram_manage_messages`
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_manage_metadata`
4. Acepta el popup de Facebook (elige la Página de RAI y la cuenta IG cuando pregunte).
5. Ya tienes un token corto (1 hora). Ahora conviértelo en **token largo (60 días)**:
   - Abre esta URL en otra pestaña, rellenando lo tuyo:
     ```
     https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=TU_APP_ID&client_secret=TU_APP_SECRET&fb_exchange_token=TU_TOKEN_CORTO
     ```
   - La respuesta trae `"access_token": "EAAG…"` → **ese es el token largo**.
6. Consigue el **token de Página** (el que usa el sistema): abre
   ```
   https://graph.facebook.com/v21.0/me/accounts?access_token=TU_TOKEN_LARGO
   ```
   - En la respuesta busca tu Página → copia su `access_token` (token de página de larga duración) y su `id`.
   - `id` de la Página → variable `FACEBOOK_PAGE_ID`
   - `access_token` de la Página → variable `INSTAGRAM_ACCESS_TOKEN`
7. Consigue el **Instagram Business ID**: abre
   ```
   https://graph.facebook.com/v21.0/TU_PAGE_ID?fields=instagram_business_account&access_token=TOKEN_DE_PAGINA
   ```
   - La respuesta trae `"instagram_business_account": {"id": "17841…"}` → variable `INSTAGRAM_BUSINESS_ID`

## PASO 3 — Variables en Vercel (teléfono)

1. Abre `vercel.com` → tu proyecto → **Settings → Environment Variables**.
2. Agrega (Production + Preview):
   - `INSTAGRAM_ACCESS_TOKEN` = token de Página (paso 2.6)
   - `INSTAGRAM_BUSINESS_ID` = 17841… (paso 2.7)
   - `FACEBOOK_PAGE_ID` = id de la Página (paso 2.6)
   - `META_APP_SECRET` = App Secret (paso 1.8)
   - `META_WEBHOOK_VERIFY_TOKEN` = inventa una frase, ej. `rai-verifica-2026`
   - `CRON_SECRET` = inventa otra distinta, ej. una larga sin espacios
3. **Deployments → ⋮ del último deploy → Redeploy** (para que tome las variables).

## PASO 4 — Crear las tablas en la base de datos (una sola vez)

Opción A (recomendada): abre el CRM → módulo **Instagram** → tab **Cuenta** → sección
"Preparar base de datos" → pega el `CRON_SECRET` → botón **Crear tablas**.

Opción B: en el navegador abre directamente
`https://TU-APP.vercel.app/api/admin/setup-instagram?secret=TU_CRON_SECRET`
(un GET basta; responde `{"ok":true,...}`).

Opción C (manual): Supabase → SQL Editor → pegar el contenido de
`prisma/migrations/20260707000000_add_instagram_module/migration.sql` → Run.

## PASO 5 — Conectar la cuenta en el CRM

1. CRM → **Instagram** → tab **Cuenta**.
2. Pega: token de Página, Instagram Business ID, Facebook Page ID.
3. Botón **Conectar** → debe decir "Conectado como @raiagency__".
   (Si prefieres no usar la UI, con las variables de entorno del Paso 3 ya funciona igual.)

## PASO 6 — Scheduler con n8n (publicación automática cada 5 min)

Vercel plan Hobby solo permite cron 1 vez/día (ya está configurado como respaldo a las 11:00 UTC).
El scheduler real es n8n:

1. Abre `raiagency.app.n8n.cloud` en el teléfono.
2. **New workflow** → nombre: `IG Publisher Tick`.
3. Nodo 1: **Schedule Trigger** → Interval → Every 5 minutes.
4. Nodo 2: **HTTP Request** →
   - Method: `GET`
   - URL: `https://TU-APP.vercel.app/api/cron/instagram?secret=TU_CRON_SECRET`
5. Conecta los nodos → **Activate** (toggle arriba a la derecha).
6. Prueba manual: **Execute workflow** → debe responder `{"ok":true,"processed":0,...}`.

## PASO 7 — Webhook de comentarios (para los DMs por palabra clave)

1. `developers.facebook.com` → tu app → **Webhooks** (menú izquierdo) → selecciona **Instagram** en el dropdown.
2. **Subscribe to this object**:
   - Callback URL: `https://TU-APP.vercel.app/api/webhooks/instagram`
   - Verify Token: el mismo valor de `META_WEBHOOK_VERIFY_TOKEN`
   - Verify and Save (el sistema responde el challenge automáticamente).
3. En la lista de campos, **Subscribe** al campo **`comments`** (y `messages` si quieres ampliar luego).
4. En **Instagram → API setup / configuración de la app**, asegúrate de que la cuenta IG esté agregada como tester/conectada.

## PASO 8 — App Review de Meta (para que los DMs funcionen con cualquier persona)

Mientras la app está en **modo desarrollo**, todo funciona solo con los usuarios/testers de la app
(tú mismo puedes probar comentando desde tu cuenta). Para que funcione con el público:

1. App → **App Review → Permissions and Features**.
2. Pide **Advanced Access** para: `instagram_manage_messages`, `instagram_manage_comments`,
   `instagram_content_publish`, `instagram_basic`.
3. Meta pedirá: video screencast mostrando el flujo (puedes grabarlo con la grabadora de pantalla del
   teléfono usando el CRM), política de privacidad (usa la URL de tu web), y descripción de uso:
   > "El sistema publica contenido programado en la cuenta Instagram propia del negocio y responde
   > comentarios de sus seguidores enviándoles por mensaje directo un recurso gratuito que ellos
   > solicitan explícitamente comentando una palabra clave."
4. Aprobación típica: 2–7 días. **Mientras tanto**: la publicación automática de posts/carruseles/stories
   funciona ya (en modo desarrollo funciona para tu propia cuenta conectada), y las reglas de DM quedan
   guardadas con su interruptor — se disparan solas en cuanto Meta apruebe.

## PASO 9 — Probar de punta a punta

1. **Post de prueba**: CRM → Instagram → Nueva publicación → tipo Imagen → pega la URL pública de
   una imagen JPG (ej. de tu R2/Supabase/Canva) → caption "Prueba del sistema 🚀" → **Publicar ahora**.
   Debe aparecer en el feed de @raiagency__ y en la tab Publicaciones con estado "Publicado" + enlace.
2. **Programación**: crea otro post con fecha/hora dentro de 10 min → verifica que n8n lo publique solo.
3. **Story de prueba**: tipo Story + URL de imagen → Publicar ahora.
4. **Keyword**: tab Palabras clave → nueva regla `PRUEBA` con DM "funciona ✅" → comenta "PRUEBA" en
   tu último post desde tu cuenta → revisa la tab Actividad (reply público sale ya; DM sale si el
   permiso está activo o eres tester de la app).

---

## Errores comunes

| Síntoma | Causa | Arreglo |
|---|---|---|
| `Invalid OAuth access token` | Token vencido (60 días) o mal copiado | Repetir Paso 2 y reconectar |
| `(#10) Application does not have permission` | Falta permiso en el token o falta App Review | Revisa permisos del Paso 2.3 / Paso 8 |
| `Media posted before business account conversion` | La cuenta IG no es Business | Convertir a profesional en la app de IG |
| `Only photo or video can be accepted as media type` | URL no es imagen/video directo | La URL debe terminar en el archivo (jpg/mp4), no ser una página |
| Post queda "Programado" para siempre | n8n workflow inactivo | Paso 6.5 (Activate) |
| Webhook no verifica | `META_WEBHOOK_VERIFY_TOKEN` distinto en Vercel vs Meta | Igualar y redeployar |
