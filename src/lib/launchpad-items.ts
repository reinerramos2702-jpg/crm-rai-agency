// src/lib/launchpad-items.ts
// Ids de los ítems del checklist de /launchpad que NO tienen una condición
// verificable en la base de datos hoy y siguen siendo un toggle manual
// (persistido en Workspace.launchpadManual). Compartido entre la API
// (src/app/api/launchpad/route.ts) y la UI (src/app/launchpad/page.tsx)
// para que ambas coincidan siempre en qué ítems son "clicables".

export const MANUAL_LAUNCHPAD_ITEM_IDS = [
  'embudo-captacion',
  'pipeline-ventas',
  'redes-sociales',
  'anuncios-meta',
  'campana-sms',
  'chat-en-vivo',
  'lanzar-producto',
  'conectar-pagos',
  'enlace-pago',
] as const;

export type ManualLaunchpadItemId = (typeof MANUAL_LAUNCHPAD_ITEM_IDS)[number];

export function isManualLaunchpadItemId(id: string): id is ManualLaunchpadItemId {
  return (MANUAL_LAUNCHPAD_ITEM_IDS as readonly string[]).includes(id);
}
