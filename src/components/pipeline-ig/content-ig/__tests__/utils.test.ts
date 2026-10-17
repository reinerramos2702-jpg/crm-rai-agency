import { describe, expect, it } from 'vitest';
import { EMPTY_CONFIG } from '@/lib/content-planner-config';
import type { ScheduledPostView } from '../../useScheduledPosts';
import type { Campaign, ContentDay } from '../types';
import {
  applyServerStatus,
  buildBatch,
  buildBrandContext,
  buildConfigProgress,
  composeCaption,
  dayIsoDate,
  fmtShortDate,
  isCampaign,
  isChatMessage,
  nextPendingPost,
} from '../utils';

function day(over: Partial<ContentDay> = {}): ContentDay {
  return { day: 1, date: '2026-10-12', type: 'post', pillar: 'P1', hook: 'Gancho', caption: 'Texto', cta: 'Escríbenos por WhatsApp', hashtags: '#hotel', status: 'approved', ...over };
}

function campaign(days: ContentDay[]): Campaign {
  return { id: 'c1', name: 'Octubre', folderName: 'hotel_2026', status: 'planning', startDate: '2026-10-12', endDate: '2026-11-10', totalPieces: days.length, published: 0, model: 'gemini', days, createdAt: '2026-10-01T00:00:00Z' };
}

function post(over: Partial<ScheduledPostView> = {}): ScheduledPostView {
  return {
    id: 'p1', campaignRef: 'c1', dayNumber: 1, caption: 'x', mediaUrls: [], mediaType: 'image', scheduledAt: '2026-10-12T12:00:00Z', timezone: 'America/Caracas',
    status: 'scheduled', attempts: 0, lastError: null, igMediaId: null, permalink: null, simulated: false, publishedAt: null, ...over,
  };
}

describe('dayIsoDate', () => {
  it('usa la fecha del día si es válida', () => {
    expect(dayIsoDate('2026-10-01', day({ date: '2026-10-12' }))).toBe('2026-10-12');
  });
  it('calcula la fecha desde el inicio de la campaña si la del día no es válida', () => {
    expect(dayIsoDate('2026-10-30', day({ date: 'mañana', day: 3 }))).toBe('2026-11-01');
  });
  it('devuelve null si no hay ninguna fecha válida', () => {
    expect(dayIsoDate('pronto', day({ date: '' }))).toBeNull();
  });
});

describe('composeCaption', () => {
  it('une texto, llamada a la acción y etiquetas', () => {
    expect(composeCaption(day())).toBe('Texto\n\nEscríbenos por WhatsApp\n\n#hotel');
  });
  it('no duplica lo que el texto ya incluye', () => {
    expect(composeCaption(day({ caption: 'Reserva ya #hotel', hashtags: '#hotel', cta: '' }))).toBe('Reserva ya #hotel');
  });
  it('queda vacío si no hay nada', () => {
    expect(composeCaption(day({ caption: '', cta: '', hashtags: '' }))).toBe('');
  });
});

describe('fmtShortDate', () => {
  it('abrevia una fecha ISO y deja intacto lo demás', () => {
    expect(fmtShortDate('2026-10-12')).toMatch(/12/);
    expect(fmtShortDate('sin fecha')).toBe('sin fecha');
  });
});

describe('buildBatch', () => {
  it('separa días válidos, inválidos y omite los ya publicados', () => {
    const c = campaign([
      day({ day: 1 }),
      day({ day: 2, caption: '', cta: '', hashtags: '' }),
      day({ day: 3, date: 'x' }),
      day({ day: 4, type: 'carousel' }),
    ]);
    const byDay = new Map<number, ScheduledPostView>([[1, post({ dayNumber: 1, status: 'published' })]]);
    const r = buildBatch(c, byDay);
    expect(r.valid.map((d) => d.day)).toEqual([3, 4]);
    expect(r.valid.find((d) => d.day === 4)?.mediaType).toBe('carousel');
    expect(r.invalid).toEqual([{ day: 2, reason: 'sin texto' }]);
  });
  it('sin campaña no hay nada que programar', () => {
    expect(buildBatch(null, new Map())).toEqual({ valid: [], invalid: [] });
  });
});

describe('applyServerStatus', () => {
  it('refleja publicados y fallidos, y recalcula el conteo', () => {
    const c = campaign([day({ day: 1 }), day({ day: 2 }), day({ day: 3, status: 'pending' })]);
    const byDay = new Map<number, ScheduledPostView>([
      [1, post({ dayNumber: 1, status: 'published' })],
      [2, post({ dayNumber: 2, status: 'failed' })],
      [3, post({ dayNumber: 3, status: 'failed' })],
    ]);
    const r = applyServerStatus(c, byDay);
    expect(r?.days.map((d) => d.status)).toEqual(['published', 'failed', 'pending']);
    expect(r?.published).toBe(1);
  });
  it('devuelve null si no cambia nada', () => {
    expect(applyServerStatus(campaign([day()]), new Map())).toBeNull();
  });
});

describe('nextPendingPost', () => {
  it('elige la programada más próxima', () => {
    const posts = [
      post({ id: 'b', scheduledAt: '2026-10-14T10:00:00Z' }),
      post({ id: 'a', scheduledAt: '2026-10-13T10:00:00Z' }),
      post({ id: 'c', scheduledAt: '2026-10-12T10:00:00Z', status: 'published' }),
    ];
    expect(nextPendingPost(posts)?.id).toBe('a');
    expect(nextPendingPost([])).toBeUndefined();
  });
});

describe('buildBrandContext', () => {
  it('solo incluye campos con contenido', () => {
    const ctx = buildBrandContext({ ...EMPTY_CONFIG, businessName: 'Hotel Mar', brandRules: [{ forbidden: 'barato', replacement: 'accesible', reason: 'calidad' }] }, ['a.jpg', 'b.jpg']);
    expect(ctx?.businessName).toBe('Hotel Mar');
    expect(ctx?.availablePhotos).toBe('a.jpg, b.jpg');
    expect(ctx?.brandRules).toBe('"barato" → "accesible" (calidad)');
    expect(ctx?.services).toBeUndefined();
  });
  it('recorta el manual de marca a 30 000 caracteres', () => {
    const ctx = buildBrandContext({ ...EMPTY_CONFIG, brandDocContent: 'x'.repeat(40000) }, []);
    expect(ctx?.brandDocument).toHaveLength(30000);
  });
});

describe('buildConfigProgress', () => {
  it('cuenta solo las secciones esenciales', () => {
    const empty = buildConfigProgress({ ...EMPTY_CONFIG, igHandle: '' }, []);
    expect(empty.required).toHaveLength(4);
    expect(empty.complete).toBe(false);
    const full = buildConfigProgress(
      { ...EMPTY_CONFIG, businessName: 'A', businessType: 'B', brandColors: 'azul', igHandle: '@a' },
      ['foto.jpg']
    );
    expect(full.complete).toBe(true);
    expect(full.pct).toBe(100);
  });
});

describe('guardas de almacenamiento', () => {
  it('validan campañas y mensajes guardados', () => {
    expect(isCampaign({ id: 'x', days: [] })).toBe(true);
    expect(isCampaign({ id: 1, days: [] })).toBe(false);
    expect(isCampaign(null)).toBe(false);
    expect(isChatMessage({ role: 'user', content: 'hola' })).toBe(true);
    expect(isChatMessage({ role: 'otro', content: 'hola' })).toBe(false);
  });
});
