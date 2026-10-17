import { describe, expect, it } from 'vitest';
import {
  MEDIA_TAKE,
  buildMediaPayload,
  extensionOf,
  fromBrandDoc,
  fromCampaignAssets,
  fromGridAssets,
  fromPlannedPosts,
  kindFromAssetKind,
  mergeMedia,
  safeHttpUrl,
  truncateText,
} from '../media-build';

const grid = (id: string, url: string, at = '2026-10-10T10:00:00Z') => ({
  id,
  themeIndex: 0,
  slideNumber: 2,
  kind: 'image',
  prompt: 'Una   mesa de\nmadera',
  publicUrl: url,
  createdAt: at,
  grid: { id: 'g1', name: 'Grilla 1' },
});

const camp = (id: string, kind: string, url: string, at = '2026-10-11T10:00:00Z') => ({
  id,
  kind,
  publicUrl: url,
  createdAt: at,
  task: { index: 2, execution: { campaign: { id: 'c1', name: 'Campaña A' } } },
});

describe('safeHttpUrl', () => {
  it('acepta http(s) y rechaza otros esquemas', () => {
    expect(safeHttpUrl(' https://cdn.test/a.png ')).toBe('https://cdn.test/a.png');
    expect(safeHttpUrl('http://cdn.test/a.png')).toBe('http://cdn.test/a.png');
    expect(safeHttpUrl('javascript:alert(1)')).toBeNull();
    expect(safeHttpUrl('data:image/png;base64,AAAA')).toBeNull();
    expect(safeHttpUrl('no es una url')).toBeNull();
    expect(safeHttpUrl(42)).toBeNull();
    expect(safeHttpUrl('https://x.test/' + 'a'.repeat(3000))).toBeNull();
  });
});

describe('extensionOf y tipos', () => {
  it('lee la extensión de la ruta e ignora la consulta', () => {
    expect(extensionOf('https://cdn.test/a/b/Foto.PNG?v=2#x')).toBe('png');
    expect(extensionOf('https://cdn.test/sin-extension')).toBe('');
    expect(extensionOf('https://cdn.test/.oculto')).toBe('');
    expect(extensionOf('https://cdn.test/a.demasiadolargo')).toBe('');
  });

  it('clasifica los tipos de Asset de campaña', () => {
    expect(kindFromAssetKind('image', 'png')).toBe('image');
    expect(kindFromAssetKind('video', '')).toBe('video');
    expect(kindFromAssetKind('voice', 'mp3')).toBe('audio');
    expect(kindFromAssetKind('music', '')).toBe('audio');
    expect(kindFromAssetKind('script', '')).toBe('document');
    expect(kindFromAssetKind('final', '')).toBe('video');
    expect(kindFromAssetKind('final', 'png')).toBe('image');
    expect(kindFromAssetKind('raro', '')).toBeNull();
    expect(kindFromAssetKind('raro', 'pdf')).toBe('document');
  });
});

describe('fuentes', () => {
  it('imágenes del Generador: título, contexto, enlace al origen y prompt de búsqueda', () => {
    const [item] = fromGridAssets([grid('a1', 'https://cdn.test/a.png')]);
    expect(item).toMatchObject({
      id: 'generator:a1',
      kind: 'image',
      origin: 'generator',
      title: 'Tema 1 · Slide 2',
      detail: 'Grilla 1',
      note: 'Una mesa de madera',
      sourceHref: '/generador-imagenes/g1',
      date: '2026-10-10T10:00:00.000Z',
    });
  });

  it('descarta URLs inseguras o vacías', () => {
    expect(fromGridAssets([grid('a1', 'javascript:alert(1)'), grid('a2', '')])).toEqual([]);
    expect(fromCampaignAssets([camp('x', 'image', 'ftp://x/a.png')])).toEqual([]);
  });

  it('campañas: imagen, video, audio y descarta tipos desconocidos', () => {
    const items = fromCampaignAssets([
      camp('1', 'image', 'https://cdn.test/i.png'),
      camp('2', 'video', 'https://cdn.test/v.mp4'),
      camp('3', 'voice', 'https://cdn.test/a.mp3'),
      camp('4', 'raro', 'https://cdn.test/zzz'),
    ]);
    expect(items.map((i) => i.kind)).toEqual(['image', 'video', 'audio']);
    expect(items[1]).toMatchObject({ title: 'Video · tarea 3', detail: 'Campaña A', sourceHref: '/campaign/c1' });
  });

  it('programación: un activo por medio, video por extensión y detalle del texto', () => {
    const items = fromPlannedPosts([
      {
        id: 'p1',
        dayNumber: 3,
        caption: 'Hola   mundo',
        mediaUrls: ['https://cdn.test/1.jpg', 'https://cdn.test/2.mp4', 'nope'],
        scheduledAt: new Date('2026-10-12T09:00:00Z'),
        status: 'scheduled',
      },
    ]);
    expect(items.map((i) => [i.id, i.kind])).toEqual([
      ['planner:p1:0', 'image'],
      ['planner:p1:1', 'video'],
    ]);
    expect(items[0].title).toBe('Publicación del día 3');
    expect(items[0].detail).toBe('Hola mundo');
  });

  it('documento de marca: solo si hay nombre y sin archivo descargable', () => {
    expect(fromBrandDoc(null)).toEqual([]);
    expect(fromBrandDoc({ brandDocName: '  ', brandDocUpdatedAt: null })).toEqual([]);
    const [doc] = fromBrandDoc({ brandDocName: 'Sistema.docx', brandDocUpdatedAt: '2026-10-01T00:00:00Z' });
    expect(doc).toMatchObject({ id: 'brand:doc', kind: 'document', origin: 'brand', url: null, ext: 'docx' });
  });
});

describe('mergeMedia y buildMediaPayload', () => {
  it('quita duplicados por URL respetando la prioridad y ordena por fecha desc', () => {
    const a = fromGridAssets([grid('a1', 'https://cdn.test/a.png', '2026-10-01T00:00:00Z')]);
    const b = fromPlannedPosts([
      { id: 'p', dayNumber: 1, caption: 'x', mediaUrls: ['https://cdn.test/a.png', 'https://cdn.test/b.png'], scheduledAt: '2026-10-05T00:00:00Z', status: 's' },
    ]);
    const merged = mergeMedia([a, b]);
    expect(merged.map((i) => i.id)).toEqual(['planner:p:1', 'generator:a1']);
  });

  it('marca truncado solo si alguna fuente llegó a su tope', () => {
    const empty = { grid: [], campaign: [], planned: [], brand: null };
    expect(buildMediaPayload(empty).truncated).toBe(false);
    const many = Array.from({ length: MEDIA_TAKE.grid }, (_, i) => grid(`g${i}`, `https://cdn.test/${i}.png`));
    const payload = buildMediaPayload({ ...empty, grid: many }, new Date('2026-10-16T00:00:00Z'));
    expect(payload.truncated).toBe(true);
    expect(payload.items).toHaveLength(MEDIA_TAKE.grid);
    expect(payload.generatedAt).toBe('2026-10-16T00:00:00.000Z');
  });

  it('truncateText colapsa espacios y corta con puntos suspensivos', () => {
    expect(truncateText('a  b\n c', 10)).toBe('a b c');
    expect(truncateText('abcdefghij', 5)).toBe('abcd…');
  });
});
