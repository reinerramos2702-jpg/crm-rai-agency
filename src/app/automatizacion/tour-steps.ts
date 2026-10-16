import type { TourStep } from '@/components/pipeline-ig/ProductTour';

export const PAGE_TOUR_KEY = 'rai-tour-auto-v1';

export const PAGE_TOUR_STEPS: TourStep[] = [
  { id: 'welcome', view: 'flujos', title: 'Bienvenido a Automatización', body: 'En 1 minuto ves cómo el CRM trabaja por ti: flujos que reaccionan solos, plantillas listas, historial de lo ocurrido y el motor de contenido para Instagram.' },
  { id: 'stats', view: 'flujos', target: '[data-tour="auto-stats"]', placement: 'bottom', title: 'Tu resumen', body: 'Cuántos flujos están activos y cuántas veces se han ejecutado. Si algo no corre, empiezas a mirar aquí.' },
  { id: 'tabs', view: 'flujos', target: '[data-tour="auto-tabs"]', placement: 'bottom', title: 'Cinco áreas', body: 'Flujos, Plantillas, Contenido IG, Actividad y Configuración. Puedes saltar entre ellas sin perder nada.' },
  { id: 'folders', view: 'flujos', target: '[data-tour="flows-folders"]', placement: 'right', title: 'Carpetas', body: 'Ordena tus flujos por área (servicios, retail, mayoreo…). "Todos los flujos" muestra todo.' },
  { id: 'flows', view: 'flujos', target: '[data-tour="flows-list"]', placement: 'left', title: 'Tus flujos', body: 'Cada flujo es una regla: "cuando pasa X, haz Y". Aquí los creas con "Nuevo flujo", los activas, pausas, duplicas o eliminas.' },
  { id: 'tpl-filters', view: 'plantillas', target: '[data-tour="tpl-filters"]', placement: 'bottom', title: 'Plantillas por tipo de negocio', body: 'Busca por palabra o filtra por servicios, retail o mayoreo. Es la forma más rápida de empezar: no partes de cero.' },
  { id: 'tpl-grid', view: 'plantillas', target: '[data-tour="tpl-grid"]', placement: 'top', title: 'Usa una plantilla', body: 'Abre una tarjeta para ver sus pasos. "Usar plantilla" crea tu flujo listo para ajustar.' },
  { id: 'activity', view: 'actividad', target: '[data-tour="activity"]', placement: 'top', title: 'Qué pasó y cuándo', body: 'Historial de ejecuciones con filtros por flujo y estado. Si algo falló, aquí ves el porqué.' },
  { id: 'settings', view: 'configuracion', target: '[data-tour="settings"]', placement: 'right', title: 'Interruptor general', body: 'Pausa toda la automatización de golpe, y define a qué correo llegan las alertas internas.' },
  { id: 'ig', view: 'configuracion', target: '[data-tour="tab-contenido-ig"]', placement: 'bottom', title: 'Contenido IG', body: 'Planea 30 días de Instagram con IA y deja que el CRM publique solo. Tiene su propio recorrido guiado al abrirlo.' },
  { id: 'done', view: 'flujos', title: '¡Listo!', body: 'Puedes repetir este recorrido cuando quieras con el botón "Ver recorrido" de arriba.' },
];
