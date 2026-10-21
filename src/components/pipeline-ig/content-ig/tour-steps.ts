import type { TourStep } from '../ProductTour';

/** Recorrido guiado de Contenido IG. Los marcadores `data-tour` viven en los componentes de esta carpeta. */
export const IG_TOUR_STEPS: TourStep[] = [
  { id: 'welcome', view: 'campaigns', title: 'Bienvenido a tu Contenido de Instagram', body: 'En 2 minutos verás cómo dejar tu marca lista y programar tus publicaciones. Puedes salir cuando quieras y volver desde «Ver recorrido».' },
  { id: 'subnav', view: 'campaigns', target: '[data-tour="subnav"]', placement: 'bottom', title: 'Tus 4 espacios de trabajo', body: 'Mis campañas, Planear contenido, Calendario y Marca y cuenta. Empieza por Marca y cuenta: es lo que hace que la IA hable como tu negocio.' },
  { id: 'progress', view: 'config', target: '[data-tour="cfg-progress"]', placement: 'left', title: 'Tu avance', body: 'Este anillo muestra cuántas secciones esenciales llevas. Se completa solo a medida que llenas tus datos.' },
  { id: 'nav', view: 'config', target: '[data-tour="cfg-nav"]', placement: 'right', title: 'Salta entre secciones', body: 'Toca una sección para ir directo. El check verde significa que está lista. Reglas y Notas son opcionales.' },
  { id: 'negocio', view: 'config', target: '#cfg-negocio .rai-cfg-title', placement: 'bottom', title: 'Datos del negocio', body: 'Nombre, tipo, ubicación y servicios. Todo esto se envía a la IA para que escriba contenido preciso sobre ti.' },
  { id: 'instagram', view: 'config', target: '#cfg-instagram', placement: 'top', title: 'Tu cuenta y tu horario', body: 'Escribe tu @usuario, la hora a la que quieres publicar cada día y tu zona horaria. El estado de conexión aparece arriba a la derecha de esta tarjeta.' },
  { id: 'switch', view: 'config', target: '[data-tour="auto-switch"]', placement: 'top', title: 'Publicación automática', body: 'Muy pronto: al activarla, el CRM publicará cada día lo que dejes programado, sin que tengas que entrar. Requiere conectar tu Instagram Business.' },
  { id: 'save', view: 'config', target: '[data-tour="savebar"]', placement: 'top', title: 'Todo se guarda solo', body: 'Cada cambio se guarda automáticamente. Cuando termines, pulsa «Guardar y planear contenido» para pasar al planificador.' },
  { id: 'chat', view: 'planner', target: '[data-tour="chat"]', placement: 'right', title: 'Tu planificador con IA', body: 'Cuéntale a la IA sobre tu negocio y armará hasta 30 días de contenido. Puedes elegir el modelo arriba a la derecha.' },
  { id: 'plan', view: 'planner', target: '[data-tour="plan-preview"]', placement: 'left', title: 'Vista previa del plan', body: 'Aquí aparece el plan en tiempo real: cada fila es un día con su pilar, tipo de pieza y estado.' },
  { id: 'calendar', view: 'calendar', target: '[data-tour="calendar"]', placement: 'bottom', title: 'Tu calendario', body: 'Aquí revisas, apruebas y programas cada pieza. Los colores indican el estado: pendiente, generado, aprobado o publicado.' },
  { id: 'done', view: 'config', title: '¡Listo para empezar!', body: 'Completa «Marca y cuenta» y luego planea tu primer mes. Puedes repetir este recorrido cuando quieras con el botón «Ver recorrido».' },
];
