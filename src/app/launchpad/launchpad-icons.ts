import {
  Settings, Megaphone, MessageCircle, ShoppingCart, UserPlus, Users, Filter, MessageSquare, Mail, CalendarCheck,
  Building2, Share2, Target, Inbox, Package, CreditCard, Link2, FileText, Zap, ShieldCheck, Bell, Rocket,
  type LucideIcon,
} from 'lucide-react';

/** Iconos por paso y por categoría (los datos puros viven en src/lib/launchpad-steps.ts). */
export const STEP_ICONS: Record<string, LucideIcon> = {
  'crear-contacto': UserPlus,
  'importar-contactos': Users,
  'embudo-captacion': Filter,
  'comunicacion-multicanal': MessageSquare,
  'primera-campana': Mail,
  'seguimiento-automatizado': Target,
  'programacion-citas': CalendarCheck,
  'pipeline-ventas': Building2,
  'redes-sociales': Share2,
  'anuncios-meta': Share2,
  'campana-sms': MessageSquare,
  'conversaciones-ventas': Inbox,
  'chat-en-vivo': MessageCircle,
  messenger: Share2,
  'lanzar-producto': Package,
  'conectar-pagos': CreditCard,
  'enlace-pago': Link2,
  facturas: FileText,
  'primera-automatizacion': Zap,
  'notificaciones-multicanal': Bell,
  'disparadores-eventos': Target,
  'roles-equipo': ShieldCheck,
};

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  base: Settings,
  marketing: Megaphone,
  ventas: MessageCircle,
  ecommerce: ShoppingCart,
  automatizacion: Zap,
};

export const stepIcon = (id: string): LucideIcon => STEP_ICONS[id] ?? Rocket;
export const categoryIcon = (id: string): LucideIcon => CATEGORY_ICONS[id] ?? Rocket;
