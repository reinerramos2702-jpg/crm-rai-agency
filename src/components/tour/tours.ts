import type { TourStep, TourTarget } from './ProductTour';

export interface ModuleTour {
  /** Identificador estable; define la clave de «ya visto» en localStorage. */
  id: string;
  label: string;
  steps: TourStep[];
}

export const TOUR_SEEN_PREFIX = 'rai-tour-mod-';
export const TOUR_SEEN_SUFFIX = '-v1';
export const TOUR_AUTO_OFF_KEY = 'rai-tour-auto-off-v1';

export const tourSeenKey = (id: string) => `${TOUR_SEEN_PREFIX}${id}${TOUR_SEEN_SUFFIX}`;

/* ---------- Resolvedores de elementos (no dependen de atributos en cada página) ---------- */

const $ = (sel: string): HTMLElement | null => document.querySelector<HTMLElement>(sel);
const visible = (el: HTMLElement | null): HTMLElement | null => (el && el.getClientRects().length > 0 ? el : null);

/** Cabecera de la página: la fila que contiene el h1 (y normalmente las acciones). */
const pageHead: TourTarget = () => {
  const h1 = $('.app-main h1');
  if (!h1) return null;
  return (h1.closest('.row-between, .rai-page-head, .top-bar, header') as HTMLElement | null) ?? h1.parentElement;
};

/** Primer botón de acción principal visible dentro del contenido. */
const primaryAction: TourTarget = () => {
  const all = Array.from(document.querySelectorAll<HTMLElement>('.app-main button.primary'));
  return all.find((b) => visible(b)) ?? null;
};

const searchBox: TourTarget = () => visible($('.app-main input[type="search"], .app-main input[placeholder*="uscar" i]'));

/** Contenido principal: tabla, rejilla o primera tarjeta. */
const mainContent: TourTarget = () =>
  visible($('.app-main table')) ?? visible($('.app-main [class*="grid"]')) ?? visible($('.app-main .card'));

const navLink = (href: string): TourTarget => () => visible($(`.app-sidebar a[href="${href}"]`));

/* ---------- Constructor de recorridos estándar de módulo ---------- */

interface ModuleSpec {
  id: string;
  label: string;
  intro: string;
  headTip?: string;
  primaryTip?: string;
  searchTip?: string;
  mainTitle?: string;
  mainTip?: string;
  mainTarget?: TourTarget;
  doneTip?: string;
}

function buildModuleTour(spec: ModuleSpec): ModuleTour {
  const steps: TourStep[] = [
    {
      id: 'welcome',
      kicker: spec.label,
      title: `Bienvenido a ${spec.label}`,
      body: spec.intro,
    },
    {
      id: 'head',
      target: pageHead,
      placement: 'bottom',
      optional: true,
      title: 'Tu centro de control',
      body:
        spec.headTip ??
        'Arriba tienes el título del módulo y sus accesos principales. Cada cosa que crees queda guardada en tu espacio de trabajo.',
      hints: [
        { target: primaryAction, label: spec.primaryTip ?? 'Acción principal: crea o añade un elemento nuevo.' },
        { target: searchBox, label: spec.searchTip ?? 'Buscador: encuentra cualquier registro en segundos.' },
      ],
    },
    {
      id: 'main',
      target: spec.mainTarget ?? mainContent,
      placement: 'top',
      optional: true,
      title: spec.mainTitle ?? 'Tu información',
      body: spec.mainTip ?? 'Aquí aparece todo lo que vayas registrando. Se actualiza solo cuando haces cambios.',
    },
    {
      id: 'done',
      title: 'Todo listo',
      body:
        spec.doneTip ??
        'Ya conoces lo esencial. Puedes repetir esta guía cuando quieras desde el botón ? de la esquina inferior derecha.',
    },
  ];
  return { id: spec.id, label: spec.label, steps };
}

/* ---------- Recorrido general del CRM (menú lateral) ---------- */

const dataTourSel = (name: string): string => `[data-tour="${name}"]`;

export const CRM_TOUR: ModuleTour = {
  id: 'crm',
  label: 'el CRM',
  steps: [
    {
      id: 'welcome',
      kicker: 'RAI Agency CRM',
      title: 'Bienvenido a tu CRM',
      body: 'En menos de un minuto verás dónde está cada cosa. Usa las flechas del teclado o los botones para avanzar.',
    },
    {
      id: 'menu',
      desktopOnly: true,
      target: () => visible($('.app-sidebar nav')),
      placement: 'right',
      title: 'Tu menú de navegación',
      body: 'Todos los módulos viven en este menú. El que estás usando se marca en dorado.',
      hints: [
        { target: navLink('/'), label: 'Dashboard: tus campañas y su estado.' },
        { target: navLink('/launchpad'), label: 'Guía de Inicio: lo que debes configurar primero.' },
        { target: navLink('/automatizacion'), label: 'Automatización: flujos y contenido de Instagram.' },
        { target: dataTourSel('sidebar-toggle'), label: 'Este botón reduce el menú a iconos para ganar espacio (atajo: Ctrl+B).' },
      ],
    },
    {
      id: 'launchpad',
      desktopOnly: true,
      optional: true,
      target: navLink('/launchpad'),
      placement: 'right',
      title: 'Empieza por la Guía de Inicio',
      body: 'Es una lista de pasos con porcentaje de avance. Complétala y tu plataforma queda lista para trabajar.',
    },
    {
      id: 'automation',
      desktopOnly: true,
      optional: true,
      target: navLink('/automatizacion'),
      placement: 'right',
      title: 'Automatiza tu contenido',
      body: 'Genera el calendario de publicaciones, prográmalo y deja que el CRM publique por ti.',
    },
    {
      id: 'help',
      kicker: 'Ayuda siempre a mano',
      title: 'Cada módulo tiene su guía',
      body: 'El botón ? de la esquina inferior derecha abre la guía del módulo en el que estás y este recorrido general.',
    },
  ],
};

/* ---------- Guías por módulo ---------- */

const LAUNCHPAD: ModuleTour = {
  id: 'launchpad',
  label: 'Guía de Inicio',
  steps: [
    {
      id: 'welcome',
      kicker: 'Guía de Inicio',
      title: 'Tu lista de arranque',
      body: 'Aquí tienes los pasos para dejar tu plataforma lista. Se marcan solos según tu actividad, o a mano cuando corresponde.',
    },
    {
      id: 'progress',
      target: () => visible($('.app-main .card')),
      placement: 'bottom',
      optional: true,
      title: 'Tu progreso general',
      body: 'La barra muestra cuántos pasos llevas completados del total de la plataforma.',
    },
    {
      id: 'cats',
      target: () => visible($('.lp-cats')),
      placement: 'right',
      optional: true,
      title: 'Categorías',
      body: 'Los pasos están agrupados por tema. Cada pastilla indica el avance de su categoría.',
    },
    {
      id: 'items',
      target: () => visible($('.lp-main > .card:last-child')),
      placement: 'top',
      optional: true,
      title: 'Cada paso, con su tutorial',
      body: 'Abre un paso para ver cómo se hace. Fíjate en estas tres marcas:',
      hints: [
        { target: () => visible($('.lp-main .lp-ring')), label: 'Círculo: se llena al completar el paso.' },
        { target: () => visible($('.lp-main .lp-item-end .lp-pct')), label: 'Porcentaje de avance del paso.' },
        { target: () => visible($('.lp-main .lp-item-end button')), label: 'Flecha: despliega el tutorial.' },
      ],
    },
    {
      id: 'done',
      title: 'A tu ritmo',
      body: 'Puedes volver a esta guía cuando quieras. Empieza por el primer paso de «Configuración de base».',
    },
  ],
};

const SPECS: Array<{ path: string; spec: ModuleSpec }> = [
  {
    path: '/contactos',
    spec: {
      id: 'contactos',
      label: 'Contactos',
      intro: 'Tu base de clientes y prospectos en un solo lugar. Verás cómo agregar, buscar y revisar contactos.',
      primaryTip: 'Agregar contacto: crea un contacto nuevo.',
      searchTip: 'Buscador: localiza un contacto por nombre u otros datos.',
      mainTitle: 'Tu lista de contactos',
      mainTip: 'Cada fila es un contacto con sus datos principales.',
    },
  },
  {
    path: '/conversaciones',
    spec: {
      id: 'conversaciones',
      label: 'Conversaciones',
      intro: 'Tu bandeja de mensajes con clientes. Aquí sigues cada conversación sin perder el hilo.',
      primaryTip: 'Nuevo contacto: inicia una conversación con alguien nuevo.',
      searchTip: 'Buscador: encuentra una conversación rápido.',
      mainTitle: 'Tus conversaciones',
      mainTip: 'Elige una conversación para leerla y responder.',
    },
  },
  {
    path: '/clientes-potenciales',
    spec: {
      id: 'clientes-potenciales',
      label: 'Clientes Potenciales',
      intro: 'Sigue cada oportunidad de venta desde el primer contacto hasta el cierre.',
      primaryTip: 'Añadir oportunidad: registra un cliente potencial nuevo.',
      searchTip: 'Buscador: filtra tus oportunidades.',
      mainTitle: 'Tus oportunidades',
      mainTip: 'Cada tarjeta es una oportunidad. Revísalas y mantenlas al día.',
    },
  },
  {
    path: '/calendarios',
    spec: {
      id: 'calendarios',
      label: 'Calendarios',
      intro: 'Organiza tu agenda y tus calendarios de citas en un solo sitio.',
      primaryTip: 'Nuevo: crea un calendario.',
      mainTitle: 'Tus calendarios',
      mainTip: 'Aquí aparecen los calendarios que ya creaste.',
    },
  },
  {
    path: '/agentes-ia',
    spec: {
      id: 'agentes-ia',
      label: 'Agentes de IA',
      intro: 'Crea asistentes de inteligencia artificial que trabajan por ti.',
      primaryTip: 'Nuevo agente: configura un asistente nuevo.',
      mainTitle: 'Tus agentes',
      mainTip: 'Cada agente aparece aquí cuando lo creas.',
    },
  },
  {
    path: '/generador-imagenes',
    spec: {
      id: 'generador-imagenes',
      label: 'Generador de Imágenes',
      intro: 'Crea imágenes con IA para tus campañas y publicaciones.',
      mainTitle: 'Tu espacio de creación',
      mainTip: 'Describe lo que quieres y genera tus imágenes desde aquí.',
    },
  },
  {
    path: '/pasajeros',
    spec: {
      id: 'pasajeros',
      label: 'Pasajeros',
      intro: 'Registro de pasajeros y huéspedes para tu operación.',
      mainTitle: 'Tu registro',
      mainTip: 'Aquí ves los pasajeros ya registrados.',
    },
  },
  {
    path: '/reservas',
    spec: {
      id: 'reservas',
      label: 'Reservas',
      intro: 'Gestiona las reservas de tu negocio y su estado.',
      mainTitle: 'Tus reservas',
      mainTip: 'Cada registro es una reserva con su información principal.',
    },
  },
  {
    path: '/pagos',
    spec: {
      id: 'pagos',
      label: 'Pagos',
      intro: 'Controla los pagos y cobros de tu operación.',
      mainTitle: 'Tus pagos',
      mainTip: 'Revisa aquí los pagos registrados y su estado.',
    },
  },
  {
    path: '/marketing',
    spec: {
      id: 'marketing',
      label: 'Marketing',
      intro: 'Herramientas para promocionar tu negocio y captar clientes.',
      mainTitle: 'Tus herramientas de marketing',
      mainTip: 'Elige la herramienta con la que quieres trabajar.',
    },
  },
  {
    path: '/sitios',
    spec: {
      id: 'sitios',
      label: 'Sitios',
      intro: 'Administra tus páginas web y embudos.',
      mainTitle: 'Tus sitios',
      mainTip: 'Aquí aparecen tus sitios y sus accesos.',
    },
  },
  {
    path: '/contenido-multimedia',
    spec: {
      id: 'contenido-multimedia',
      label: 'Contenido multimedia',
      intro: 'Tu biblioteca de imágenes y archivos.',
      mainTitle: 'Tu biblioteca',
      mainTip: 'Guarda y reutiliza aquí los archivos de tus campañas.',
    },
  },
  {
    path: '/reputacion',
    spec: {
      id: 'reputacion',
      label: 'Reputación',
      intro: 'Sigue las opiniones de tus clientes y cuida tu imagen.',
      mainTitle: 'Tus opiniones',
      mainTip: 'Revisa aquí las reseñas y su evolución.',
    },
  },
  {
    path: '/informes',
    spec: {
      id: 'informes',
      label: 'Informes',
      intro: 'Resultados y métricas de tu negocio en un solo vistazo.',
      mainTitle: 'Tus métricas',
      mainTip: 'Los datos se actualizan con tu actividad.',
    },
  },
  {
    path: '/marketplace',
    spec: {
      id: 'marketplace',
      label: 'Aplicaciones del mercado',
      intro: 'Conecta aplicaciones para ampliar lo que tu CRM puede hacer.',
      mainTitle: 'Aplicaciones disponibles',
      mainTip: 'Explora y conecta las que necesites.',
    },
  },
  {
    path: '/facturacion',
    spec: {
      id: 'facturacion',
      label: 'Facturación',
      intro: 'Tu plan, tus facturas y tus datos de cobro.',
      mainTitle: 'Tu facturación',
      mainTip: 'Revisa aquí tu plan actual y el historial.',
    },
  },
  {
    path: '/keys',
    spec: {
      id: 'keys',
      label: 'Claves de IA',
      intro: 'Conecta tus claves de proveedores de IA para activar las funciones inteligentes.',
      mainTitle: 'Tus claves',
      mainTip: 'Guárdalas aquí; nunca las compartas con nadie.',
    },
  },
  {
    path: '/settings',
    spec: {
      id: 'settings',
      label: 'Configuración',
      intro: 'Ajustes de tu cuenta, tu equipo y tu espacio de trabajo.',
      mainTitle: 'Tus ajustes',
      mainTip: 'Cambia aquí tus datos y preferencias.',
    },
  },
];

/* ---------- Nueva Campaña: recorrido propio con pistas en cascada ---------- */

const dataTour = (name: string): string => `[data-tour="${name}"]`;

export const CAMPAIGN_NEW: ModuleTour = {
  id: 'campaign-new',
  label: 'Nueva Campaña',
  steps: [
    {
      id: 'welcome',
      kicker: 'Nueva Campaña',
      title: 'Planifica tu campaña con IA',
      body: 'Son tres pasos: configuras la campaña, conversas con la IA sobre tu marca y generas el Plan Maestro de hasta 31 días.',
    },
    {
      id: 'progress',
      target: dataTour('cn-steps'),
      placement: 'bottom',
      optional: true,
      title: 'Tu progreso',
      body: 'Esta barra se completa sola: el paso 1 al nombrar la campaña y el paso 2 cuando ya conversaste con la IA.',
    },
    {
      id: 'basics',
      target: dataTour('cn-name'),
      placement: 'right',
      optional: true,
      title: 'Define lo básico',
      body: 'Empieza por un nombre que te ayude a reconocer la campaña. Luego elige el formato y las herramientas de IA.',
      hints: [
        { target: dataTour('cn-pipeline'), label: 'Tipo de pipeline: UGC, Avatar Reel, anuncios estáticos o carruseles.' },
        { target: dataTour('cn-model'), label: 'Modelo de planificación: la IA que conversa contigo y arma el plan.' },
        { target: dataTour('cn-image'), label: 'Generación de imágenes: el proveedor que creará las imágenes.' },
      ],
    },
    {
      id: 'material',
      target: dataTour('cn-folder'),
      placement: 'right',
      optional: true,
      title: 'Aporta tu material',
      body: 'Todo esto es opcional, pero mientras más contexto des, mejor sale el plan.',
      hints: [
        { target: dataTour('cn-brand'), label: 'Manual de marca: tono, audiencia, productos y temas prohibidos.' },
        { target: dataTour('cn-competitor'), label: 'Competencia: analiza webs o anuncios de Meta para inspirarte.' },
        { target: dataTour('cn-tip'), label: 'Atajo: automatiza el seguimiento de los contactos que lleguen.' },
      ],
    },
    {
      id: 'chat',
      target: dataTour('cn-chat-head'),
      placement: 'bottom',
      optional: true,
      title: 'Conversa con la IA',
      body: 'Cuéntale sobre tu marca, tu audiencia y tus objetivos. Ella te hace las preguntas que faltan.',
      hints: [
        { target: dataTour('cn-chat-log'), label: 'La conversación aparece aquí. También puedes arrastrar archivos.' },
        { target: dataTour('cn-chat-input'), label: 'Escribe y pulsa Enter, o adjunta archivos con el icono de carpeta.' },
      ],
    },
    {
      id: 'generate',
      target: () => visible($('.cn-chat-head .btn-primary')),
      placement: 'bottom',
      optional: true,
      title: 'Genera el Plan Maestro',
      body: 'Cuando la conversación esté lista, este botón convierte todo en un plan día por día.',
    },
    {
      id: 'done',
      title: 'Todo listo',
      body: 'Ya sabes cómo se arma una campaña. Puedes repetir esta guía cuando quieras desde el botón ? de la esquina inferior derecha.',
    },
  ],
};

const REGISTRY: Array<{ path: string; tour: ModuleTour }> = [
  { path: '/launchpad', tour: LAUNCHPAD },
  { path: '/campaign/new', tour: CAMPAIGN_NEW },
  ...SPECS.map(({ path, spec }) => ({ path, tour: buildModuleTour(spec) })),
];

/** Guía del módulo según la ruta. «/» y «/automatizacion» tienen su propio recorrido en la página. */
export function findModuleTour(pathname: string): ModuleTour | null {
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  let best: { path: string; tour: ModuleTour } | null = null;
  for (const entry of REGISTRY) {
    if (clean === entry.path || clean.startsWith(`${entry.path}/`)) {
      if (!best || entry.path.length > best.path.length) best = entry;
    }
  }
  return best?.tour ?? null;
}
