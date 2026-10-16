import { describe, expect, it } from 'vitest';
import { CRM_TOUR, findModuleTour, tourSeenKey } from '../tours';

describe('findModuleTour', () => {
  it('resuelve rutas de módulo, con o sin barra final', () => {
    expect(findModuleTour('/contactos')?.id).toBe('contactos');
    expect(findModuleTour('/contactos/')?.id).toBe('contactos');
    expect(findModuleTour('/launchpad')?.id).toBe('launchpad');
  });

  it('prefiere la ruta más específica', () => {
    expect(findModuleTour('/campaign/new')?.id).toBe('campaign-new');
  });

  it('no registra rutas con recorrido propio ni desconocidas', () => {
    expect(findModuleTour('/')).toBeNull();
    expect(findModuleTour('/automatizacion')).toBeNull();
    expect(findModuleTour('/no-existe')).toBeNull();
  });
});

describe('estructura de los recorridos', () => {
  const paths = [
    '/launchpad', '/contactos', '/conversaciones', '/clientes-potenciales', '/calendarios', '/agentes-ia',
    '/generador-imagenes', '/campaign/new', '/pasajeros', '/reservas', '/pagos', '/marketing', '/sitios',
    '/contenido-multimedia', '/reputacion', '/informes', '/marketplace', '/facturacion', '/keys', '/settings',
  ];

  it('cada módulo tiene guía, ids únicos y un cierre', () => {
    const ids = new Set<string>();
    for (const p of paths) {
      const tour = findModuleTour(p);
      expect(tour, p).not.toBeNull();
      expect(ids.has(tour!.id), `id repetido ${tour!.id}`).toBe(false);
      ids.add(tour!.id);
      const stepIds = tour!.steps.map((s) => s.id);
      expect(new Set(stepIds).size).toBe(stepIds.length);
      expect(stepIds[0]).toBe('welcome');
      expect(stepIds[stepIds.length - 1]).toBe('done');
    }
  });

  it('los pasos con objetivo opcional no son el primero ni el último', () => {
    for (const tour of [CRM_TOUR, ...paths.map((p) => findModuleTour(p)!)]) {
      expect(tour.steps[0].optional).toBeFalsy();
      expect(tour.steps[tour.steps.length - 1].optional).toBeFalsy();
    }
  });

  it('la clave de «ya visto» es estable', () => {
    expect(tourSeenKey('contactos')).toBe('rai-tour-mod-contactos-v1');
  });
});
