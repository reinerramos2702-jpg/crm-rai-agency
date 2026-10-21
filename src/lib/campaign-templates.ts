import { EMPTY_BRIEF, type CampaignBrief } from './campaign-brief';

/** Plantilla de arranque por tipo de negocio: precarga nombre, pipeline, brief y primer mensaje. */
export interface CampaignTemplate {
  id: string;
  label: string;
  description: string;
  nameSuggestion: string;
  pipelineType: string;
  brief: CampaignBrief;
  firstMessage: string;
}

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    id: 'restaurante',
    label: 'Restaurante',
    description: 'Platos, ambiente y reservas',
    nameSuggestion: 'Campaña del mes — Restaurante',
    pipelineType: 'ugc',
    brief: {
      objective: 'Aumentar las reservas y los pedidos por WhatsApp',
      audience: 'Comensales locales de 25 a 55 años que buscan dónde comer el fin de semana',
      tone: 'Cercano, apetitoso y con humor ligero',
      frequency: '30 días, una pieza diaria',
      pillars: 'Platos estrella\nDetrás de cocina\nTestimonios de clientes\nPromociones de la semana\nEventos y fechas especiales',
    },
    firstMessage:
      'Mi restaurante se llama … y está en …. Nuestro plato más pedido es …. Quiero llenar las mesas de fin de semana y recibir más reservas por WhatsApp.',
  },
  {
    id: 'hotel',
    label: 'Hotel o posada',
    description: 'Habitaciones, experiencias y reservas',
    nameSuggestion: 'Campaña del mes — Hotel',
    pipelineType: 'carousel',
    brief: {
      objective: 'Subir la ocupación entre semana y las reservas directas',
      audience: 'Parejas y familias que planean escapadas de fin de semana',
      tone: 'Cálido, relajado y aspiracional',
      frequency: '30 días, cuatro piezas por semana',
      pillars: 'Habitaciones y vistas\nExperiencias locales\nHuéspedes felices\nPaquetes y ofertas\nConsejos de viaje',
    },
    firstMessage:
      'Tengo un hotel llamado … en …, con … habitaciones. Quiero atraer reservas directas y reducir la dependencia de las plataformas de terceros.',
  },
  {
    id: 'tienda',
    label: 'Tienda o comercio',
    description: 'Productos, ofertas y ventas',
    nameSuggestion: 'Campaña del mes — Tienda',
    pipelineType: 'static_ads',
    brief: {
      objective: 'Vender más productos y captar nuevos clientes por mensaje directo',
      audience: 'Compradores de 20 a 45 años que descubren productos en Instagram',
      tone: 'Directo, entusiasta y claro con los precios',
      frequency: '30 días, una pieza diaria',
      pillars: 'Novedades\nMás vendidos\nCómo usar el producto\nOfertas por tiempo limitado\nReseñas de clientes',
    },
    firstMessage:
      'Vendo … en …. Mi producto principal es … y mi cliente ideal es …. Quiero convertir seguidores en compradores.',
  },
  {
    id: 'servicios',
    label: 'Servicios profesionales',
    description: 'Consultoría, legal, contable, técnico',
    nameSuggestion: 'Campaña del mes — Servicios',
    pipelineType: 'carousel',
    brief: {
      objective: 'Generar consultas calificadas y posicionarme como referente',
      audience: 'Dueños de negocio y profesionales que necesitan resolver un problema concreto',
      tone: 'Experto, claro y confiable',
      frequency: '30 días, tres piezas por semana',
      pillars: 'Errores comunes\nGuías paso a paso\nCasos de éxito\nPreguntas frecuentes\nDetrás del servicio',
    },
    firstMessage:
      'Ofrezco servicios de … para …. Mi mayor diferencial es …. Quiero que más personas me contacten con consultas serias.',
  },
  {
    id: 'belleza',
    label: 'Belleza y bienestar',
    description: 'Estética, salud y cuidado personal',
    nameSuggestion: 'Campaña del mes — Belleza',
    pipelineType: 'ugc',
    brief: {
      objective: 'Llenar la agenda de citas de la semana',
      audience: 'Mujeres y hombres de 22 a 50 años que cuidan su imagen y su salud',
      tone: 'Amigable, inspirador y profesional',
      frequency: '30 días, una pieza diaria',
      pillars: 'Antes y después\nTratamientos explicados\nConsejos de cuidado\nTestimonios\nPromociones de temporada',
    },
    firstMessage:
      'Tengo un negocio de … en …. Mis servicios más solicitados son …. Quiero llenar la agenda de citas.',
  },
  {
    id: 'inmobiliaria',
    label: 'Inmobiliaria',
    description: 'Propiedades, asesoría y contactos',
    nameSuggestion: 'Campaña del mes — Inmobiliaria',
    pipelineType: 'static_ads',
    brief: {
      objective: 'Captar contactos interesados en comprar o alquilar',
      audience: 'Familias e inversionistas que buscan propiedad en la zona',
      tone: 'Confiable, claro y orientado a resultados',
      frequency: '30 días, cuatro piezas por semana',
      pillars: 'Propiedades destacadas\nConsejos para comprar\nProceso paso a paso\nZonas y barrios\nClientes satisfechos',
    },
    firstMessage:
      'Trabajo con propiedades en … Mi cartera incluye …. Quiero atraer personas listas para visitar una propiedad.',
  },
  {
    id: 'agencia',
    label: 'Agencia o marketing',
    description: 'Servicios para otros negocios',
    nameSuggestion: 'Campaña del mes — Agencia',
    pipelineType: 'avatar_reel',
    brief: {
      objective: 'Conseguir reuniones con negocios que necesitan crecer en digital',
      audience: 'Dueños de pymes que quieren vender más con redes sociales y automatización',
      tone: 'Estratégico, directo y con datos',
      frequency: '30 días, cinco piezas por semana',
      pillars: 'Noticias del sector explicadas\nCasos y resultados\nTácticas accionables\nAutomatización\nDetrás de la agencia',
    },
    firstMessage:
      'Soy una agencia que ofrece … a …. Quiero publicar contenido que demuestre resultados y atraiga reuniones.',
  },
  {
    id: 'educacion',
    label: 'Educación y cursos',
    description: 'Clases, talleres y programas',
    nameSuggestion: 'Campaña del mes — Educación',
    pipelineType: 'carousel',
    brief: {
      objective: 'Aumentar las inscripciones al próximo programa',
      audience: 'Personas que quieren aprender una habilidad para mejorar su trabajo o sus ingresos',
      tone: 'Motivador, claro y didáctico',
      frequency: '30 días, cuatro piezas por semana',
      pillars: 'Mini clases gratuitas\nHistorias de estudiantes\nContenido del programa\nPreguntas frecuentes\nCuenta regresiva de inscripciones',
    },
    firstMessage:
      'Imparto … para …. El próximo programa empieza el …. Quiero llenar los cupos con estudiantes comprometidos.',
  },
];

export function findTemplate(id: string): CampaignTemplate | undefined {
  return CAMPAIGN_TEMPLATES.find((t) => t.id === id);
}

export interface TemplateApplication {
  /** Solo se propone un nombre si la persona todavía no escribió uno. */
  name: string;
  pipelineType: string;
  brief: CampaignBrief;
  firstMessage: string;
}

/** Calcula qué cambia al aplicar una plantilla sin pisar el nombre ya escrito ni los campos del brief con contenido. */
export function applyTemplate(
  template: CampaignTemplate,
  current: { name: string; brief: CampaignBrief },
): TemplateApplication {
  const brief = { ...EMPTY_BRIEF };
  (Object.keys(brief) as Array<keyof CampaignBrief>).forEach((k) => {
    brief[k] = current.brief[k].trim() ? current.brief[k] : template.brief[k];
  });
  return {
    name: current.name.trim() ? current.name : template.nameSuggestion,
    pipelineType: template.pipelineType,
    brief,
    firstMessage: template.firstMessage,
  };
}
