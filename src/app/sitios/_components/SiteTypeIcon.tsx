import React from 'react';
import { BedDouble, Briefcase, Building2, Landmark, UtensilsCrossed, type LucideIcon } from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  hotel: BedDouble,
  restaurant: UtensilsCrossed,
  office: Briefcase,
  venue: Landmark,
  other: Building2,
};

export function SiteTypeIcon({ type, size = 18 }: { type: string; size?: number }) {
  const Icon = ICONS[type] ?? Building2;
  return <Icon size={size} aria-hidden="true" />;
}
