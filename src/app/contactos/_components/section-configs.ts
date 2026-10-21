export interface SectionColumn {
  label: string;
  /** Añade la zona horaria legible («UTC−4») junto a la etiqueta. */
  zone?: boolean;
}

export interface SectionConfig {
  id: 'lote' | 'tareas' | 'empresas';
  title: string;
  description?: string;
  noun: { one: string; many: string };
  /** Etiquetas de los botones de la cabecera (vacío = sin botón). */
  importLabel?: string;
  addLabel?: string;
  subTabs: readonly string[];
  addListLabel?: string;
  /** Botones de filtro de la barra (todos «próximamente»). */
  filterButtons: readonly string[];
  /** Filtros de fecha/estado propios de Acciones en lote. */
  inlineFilters?: boolean;
  selectable: boolean;
  columns: readonly SectionColumn[];
  empty: { title: string; text: string };
}

export const SECTION_CONFIGS: Record<SectionConfig['id'], SectionConfig> = {
  lote: {
    id: 'lote',
    title: 'Acciones en bloque',
    description: 'Haz un seguimiento del progreso y los resultados de las acciones en lote.',
    noun: { one: 'acción', many: 'acciones' },
    subTabs: [],
    filterButtons: [],
    inlineFilters: true,
    selectable: false,
    columns: [
      { label: 'Etiqueta de acción' }, { label: 'Operación' }, { label: 'Estado' }, { label: 'Usuario' },
      { label: 'Creado', zone: true }, { label: 'Completado', zone: true }, { label: 'Estadísticas' }, { label: 'Acciones' },
    ],
    empty: {
      title: 'No se han encontrado acciones en lote',
      text: 'Cuando etiquetes, elimines o muevas contactos en masa, aquí verás el progreso y el resultado de cada operación.',
    },
  },
  tareas: {
    id: 'tareas',
    title: 'Tareas',
    noun: { one: 'tarea', many: 'tareas' },
    addLabel: 'Agregar tarea',
    subTabs: ['Todo', 'Vence hoy', 'Atrasado', 'Próximos'],
    addListLabel: 'Lista',
    filterButtons: ['Responsable: cualquiera', 'Estado: todo', 'Fecha de vencimiento: cualquiera', 'Filtros avanzados', 'Ordenar'],
    selectable: true,
    columns: [
      { label: 'Estado' }, { label: 'Título' }, { label: 'Descripción' }, { label: 'Contactos asociados' },
      { label: 'Responsable' }, { label: 'Vencimiento', zone: true }, { label: 'Acciones' },
    ],
    empty: {
      title: 'No tienes tareas todavía',
      text: 'Crea tu primera tarea para hacer seguimiento de los pendientes asociados a tus contactos.',
    },
  },
  empresas: {
    id: 'empresas',
    title: 'Empresas',
    noun: { one: 'empresa', many: 'empresas' },
    importLabel: 'Importar',
    addLabel: 'Agregar empresa',
    subTabs: ['Todo'],
    addListLabel: 'Lista',
    filterButtons: ['Filtros avanzados', 'Ordenar', 'Administrar campos'],
    selectable: true,
    columns: [
      { label: 'Nombre' }, { label: 'Teléfono' }, { label: 'Correo' }, { label: 'Sitio web' }, { label: 'Dirección' },
      { label: 'Región' }, { label: 'Ciudad' }, { label: 'País' }, { label: 'Creado', zone: true }, { label: 'Actualizado' },
      { label: 'Creado por' }, { label: 'Acciones' },
    ],
    empty: {
      title: 'Aún no tienes empresas',
      text: 'Agrega tu primera empresa para vincular contactos, oportunidades y facturación.',
    },
  },
};
