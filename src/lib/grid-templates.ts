/**
 * Plantillas de grilla semanal: precargan los 7 temas (uno por día) para
 * arrancar el wizard en el Nodo 2. Son punto de partida genérico: el asistente
 * y el documento de marca las adaptan al negocio.
 */

export interface TemplateTheme {
  title: string;
  category: string;
  segment: string;
}

export interface GridTemplate {
  id: 'educativa' | 'venta' | 'comunidad' | 'lanzamiento';
  name: string;
  description: string;
  themes: TemplateTheme[];
}

export const GRID_TEMPLATES: readonly GridTemplate[] = [
  {
    id: 'educativa',
    name: 'Semana educativa',
    description: 'Enseña, resuelve dudas y construye autoridad sin vender de frente.',
    themes: [
      { title: 'El error más común de tu sector', category: 'Educativo', segment: 'Quien empieza' },
      { title: 'Guía rápida en 5 pasos', category: 'Educativo', segment: 'Quien busca resultados' },
      { title: 'Mito frente a realidad', category: 'Autoridad', segment: 'Quien duda' },
      { title: 'Herramientas que usamos', category: 'Recursos', segment: 'Quien quiere ahorrar tiempo' },
      { title: 'Caso real explicado', category: 'Prueba social', segment: 'Quien compara opciones' },
      { title: 'Preguntas frecuentes respondidas', category: 'Educativo', segment: 'Quien está por decidir' },
      { title: 'Resumen de la semana y próximo paso', category: 'Cierre', segment: 'Toda la audiencia' },
    ],
  },
  {
    id: 'venta',
    name: 'Semana de venta',
    description: 'Lleva a la audiencia de la necesidad a la oferta, con urgencia honesta.',
    themes: [
      { title: 'El problema que cuesta dinero', category: 'Dolor', segment: 'Cliente con el problema activo' },
      { title: 'Cómo lo resolvemos', category: 'Solución', segment: 'Quien busca una salida' },
      { title: 'Resultados de clientes', category: 'Prueba social', segment: 'Quien necesita confianza' },
      { title: 'La oferta de la semana', category: 'Oferta', segment: 'Quien está listo para comprar' },
      { title: 'Objeciones resueltas', category: 'Objeciones', segment: 'Quien duda del precio' },
      { title: 'Últimas plazas o última oportunidad', category: 'Urgencia', segment: 'Quien posterga la decisión' },
      { title: 'Cierre con llamada a la acción', category: 'Cierre', segment: 'Toda la audiencia' },
    ],
  },
  {
    id: 'comunidad',
    name: 'Semana de comunidad',
    description: 'Cercanía, historias y participación para fortalecer la relación.',
    themes: [
      { title: 'Quiénes somos y por qué lo hacemos', category: 'Marca', segment: 'Seguidores nuevos' },
      { title: 'Detrás de cámaras del equipo', category: 'Cercanía', segment: 'Seguidores actuales' },
      { title: 'Historia de un cliente', category: 'Prueba social', segment: 'Clientes y prospectos' },
      { title: 'Pregunta para la comunidad', category: 'Interacción', segment: 'Seguidores activos' },
      { title: 'Consejo útil de la semana', category: 'Educativo', segment: 'Toda la audiencia' },
      { title: 'Reconocimiento a quien nos apoya', category: 'Gratitud', segment: 'Clientes fieles' },
      { title: 'Adelanto de lo que viene', category: 'Anticipación', segment: 'Toda la audiencia' },
    ],
  },
  {
    id: 'lanzamiento',
    name: 'Lanzamiento',
    description: 'Siete días de intriga, demostración y apertura para un producto o servicio nuevo.',
    themes: [
      { title: 'Algo nuevo viene', category: 'Intriga', segment: 'Toda la audiencia' },
      { title: 'El problema que resolvemos', category: 'Dolor', segment: 'Cliente ideal' },
      { title: 'Primer vistazo al producto', category: 'Demostración', segment: 'Seguidores atentos' },
      { title: 'Beneficios clave explicados', category: 'Beneficios', segment: 'Quien compara opciones' },
      { title: 'Voces de quienes ya lo probaron', category: 'Prueba social', segment: 'Quien necesita confianza' },
      { title: 'Apertura oficial y oferta de lanzamiento', category: 'Oferta', segment: 'Quien está listo para comprar' },
      { title: 'Últimas horas y preguntas finales', category: 'Urgencia', segment: 'Quien posterga la decisión' },
    ],
  },
];

export function templateById(id: string): GridTemplate | undefined {
  return GRID_TEMPLATES.find((t) => t.id === id);
}

/** Copia de los temas de una plantilla (nunca devuelve las referencias originales). */
export function buildTemplateThemes(id: string): TemplateTheme[] {
  const template = templateById(id);
  return template ? template.themes.map((t) => ({ ...t })) : [];
}
