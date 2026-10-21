/**
 * ÚNICO punto de entrada del CSS de la aplicación (además de `globals.css`, que importa el layout antes).
 *
 * Por qué: si cada módulo importa su CSS desde su página, Next lo descarga DESPUÉS del clic en el menú e inserta
 * el `<link>` en el mismo instante en que confirma el contenido, sin esperar a que cargue. Resultado: ~0,2–0,5 s de
 * HTML sin los estilos del módulo. Cargándolo todo desde el layout raíz, el CSS ya está en el navegador al navegar.
 *
 * Reglas:
 *  - NO importes `.css` desde páginas, layouts ni componentes: añádelo aquí (el test `css-imports` lo exige).
 *  - El orden importa (cascada): primero lo compartido, luego los módulos; dentro de cada módulo se conserva el
 *    orden en que sus archivos se importaban antes.
 */

// Compartidos (antes los importaba el layout o los componentes)
import './effects.css';
import './select.css';
import '../components/tour/tour.css';
import '../components/module-kit/module-kit.css';

// Dashboard y Guía de Inicio
import '../app/_dashboard/dashboard.css';
import '../app/launchpad/launchpad.css';

// Contenido y marketing
import '../app/campaign/new/campaign-new.css';
import '../app/generador-imagenes/generador.css';
import '../app/generador-imagenes/wizard.css';
import '../app/automatizacion/activity.css';
import '../app/automatizacion/automation.css';
import '../app/automatizacion/flows.css';
import '../app/automatizacion/settings.css';
import '../app/automatizacion/templates.css';
import '../components/pipeline-ig/content-ig/content-ig.css';
import '../app/automatizacion/[id]/builder.css';
import '../app/marketing/marketing.css';
import '../app/marketing/marketing-ui.css';
import '../app/marketing/marketing-tools.css';
import '../app/marketing/marketing-planner.css';
import '../app/contenido-multimedia/media.css';
import '../app/contenido-multimedia/media-grid.css';
import '../app/contenido-multimedia/media-batch.css';
import '../app/contenido-multimedia/media-overlays.css';
import '../app/sitios/sitios.css';

// Clientes
import '../app/conversaciones/conversaciones.css'; // incluye cv-*.css vía @import
import '../app/contactos/_shared/crm-base.css';
import '../app/contactos/_shared/crm-table.css';
import '../app/contactos/_shared/crm-overlay.css';
import '../app/clientes-potenciales/clientes-potenciales.css';
import '../app/calendarios/calendarios.css';
import '../app/agentes-ia/agentes.css';
import '../app/agentes-ia/voz/voz.css';

// Operación y crecimiento
import '../app/pagos/pagos.css';
import '../app/facturacion/_components/facturacion.css';
import '../app/informes/_components/informes.css';
