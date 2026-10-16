import {
  LayoutDashboard,
  PlusCircle,
  Key,
  Settings,
  Megaphone,
  Receipt,
  MessageSquare,
  Rocket,
  Calendar,
  Zap,
  Images,
  Bot,
  Users,
  Target,
  UserCheck,
  BedDouble,
  CreditCard,
  Globe,
  FolderOpen,
  Star,
  BarChart3,
  Store,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Palabras extra para la búsqueda (sinónimos). */
  keywords?: string;
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

/**
 * Navegación agrupada por tarea y frecuencia (no por modelo de datos):
 * lo más usado arriba, lo ocasional bajo etiquetas discretas y la cuenta al final.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'principal',
    label: 'Principal',
    items: [
      { href: '/', label: 'Dashboard', icon: LayoutDashboard, keywords: 'inicio resumen campañas' },
      { href: '/launchpad', label: 'Guía de Inicio', icon: Rocket, keywords: 'empezar configurar pasos' },
    ],
  },
  {
    id: 'contenido',
    label: 'Contenido y marketing',
    items: [
      { href: '/campaign/new', label: 'Nueva Campaña', icon: PlusCircle, keywords: 'crear planificar plan maestro' },
      { href: '/generador-imagenes', label: 'Generador Imágenes', icon: Images, keywords: 'fotos ia dalle gemini' },
      { href: '/automatizacion', label: 'Automatización', icon: Zap, keywords: 'flujos instagram publicar programar' },
      { href: '/marketing', label: 'Marketing', icon: Megaphone, keywords: 'anuncios correo' },
      { href: '/contenido-multimedia', label: 'Contenido multimedia', icon: FolderOpen, keywords: 'archivos videos biblioteca' },
      { href: '/sitios', label: 'Sitios', icon: Globe, keywords: 'web paginas' },
    ],
  },
  {
    id: 'clientes',
    label: 'Clientes',
    items: [
      { href: '/conversaciones', label: 'Conversaciones', icon: MessageSquare, keywords: 'chat mensajes whatsapp' },
      { href: '/contactos', label: 'Contactos', icon: Users, keywords: 'personas clientes' },
      { href: '/clientes-potenciales', label: 'Clientes Potenciales', icon: Target, keywords: 'leads prospectos oportunidades' },
      { href: '/calendarios', label: 'Calendarios', icon: Calendar, keywords: 'citas agenda reservas' },
      { href: '/agentes-ia', label: 'Agentes de IA', icon: Bot, keywords: 'bots asistentes' },
    ],
  },
  {
    id: 'operacion',
    label: 'Operación',
    items: [
      { href: '/pasajeros', label: 'Pasajeros', icon: UserCheck, keywords: 'huespedes' },
      { href: '/reservas', label: 'Reservas', icon: BedDouble, keywords: 'habitaciones hotel' },
      { href: '/pagos', label: 'Pagos', icon: CreditCard, keywords: 'cobros transacciones' },
      { href: '/facturacion', label: 'Facturación', icon: Receipt, keywords: 'facturas plan suscripcion' },
    ],
  },
  {
    id: 'crecimiento',
    label: 'Crecimiento',
    items: [
      { href: '/reputacion', label: 'Reputación', icon: Star, keywords: 'reseñas opiniones' },
      { href: '/informes', label: 'Informes', icon: BarChart3, keywords: 'reportes metricas estadisticas' },
      { href: '/marketplace', label: 'Aplicaciones del mercado', icon: Store, keywords: 'integraciones apps' },
    ],
  },
  {
    id: 'cuenta',
    label: 'Cuenta',
    items: [
      { href: '/keys', label: 'Claves de IA', icon: Key, keywords: 'api tokens openai' },
      { href: '/settings', label: 'Configuración', icon: Settings, keywords: 'ajustes perfil equipo zona horaria' },
    ],
  },
];

/** Todos los destinos en orden plano. */
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

/** Destino que corresponde a una ruta (prefijo más largo; «/» solo coincide exacto). */
export function findNavItem(pathname: string): NavItem | null {
  let best: NavItem | null = null;
  for (const item of NAV_ITEMS) {
    const match = item.href === '/' ? pathname === '/' : pathname === item.href || pathname.startsWith(`${item.href}/`);
    if (match && (!best || item.href.length > best.href.length)) best = item;
  }
  return best;
}
