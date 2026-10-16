import {
  PlusCircle, Instagram, CalendarDays, MessageSquare, Users, Target, CreditCard, Bot, ImageIcon, Rocket,
  type LucideIcon,
} from 'lucide-react';
import type { QuickActionIcon } from '@/lib/dashboard-pins';

export const QUICK_ACTION_ICONS: Record<QuickActionIcon, LucideIcon> = {
  plus: PlusCircle,
  instagram: Instagram,
  calendar: CalendarDays,
  chat: MessageSquare,
  contacts: Users,
  leads: Target,
  payments: CreditCard,
  agents: Bot,
  images: ImageIcon,
  rocket: Rocket,
};
