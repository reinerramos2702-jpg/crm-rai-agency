import toast from 'react-hot-toast';

/** Aviso uniforme para funciones aún no disponibles (nunca finge que algo se guardó). */
export function notifySoon(feature?: string): void {
  toast(feature ? `${feature}: próximamente` : 'Próximamente');
}
