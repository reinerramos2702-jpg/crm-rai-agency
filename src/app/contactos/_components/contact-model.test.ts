import { describe, expect, it } from 'vitest';
import {
  activeFilterCount, collectSources, collectTags, contactsToCsv, filterContacts, parseContacts, sortContacts,
  sourceLabel, withTag, type Contact,
} from './contact-model';
import { MAX_IMPORT_ROWS, planImport, validateImportFile } from './import-model';

function contact(over: Partial<Contact> & { id: string }): Contact {
  return {
    name: 'Ana', email: null, phone: null, source: null, tags: [],
    createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z', lastActivityAt: '2026-10-01T00:00:00Z',
    ...over,
  };
}

const LIST: Contact[] = [
  contact({ id: '1', name: 'María Pérez', email: 'maria@x.com', tags: ['vip'], source: 'whatsapp', createdAt: '2026-10-03T00:00:00Z', updatedAt: '2026-10-05T00:00:00Z', lastActivityAt: '2026-10-04T00:00:00Z' }),
  contact({ id: '2', name: 'Luis Gómez', phone: '+58 412 1234567', tags: ['lead', 'vip'], source: 'web', createdAt: '2026-10-02T00:00:00Z', updatedAt: '2026-10-02T00:00:00Z', lastActivityAt: '2026-10-09T00:00:00Z' }),
  contact({ id: '3', name: 'Ángel Díaz', source: 'whatsapp', createdAt: '2026-10-09T00:00:00Z', updatedAt: '2026-10-06T00:00:00Z', lastActivityAt: '2026-10-06T00:00:00Z' }),
];

describe('parseContacts', () => {
  it('descarta formas inesperadas y calcula la última actividad', () => {
    const parsed = parseContacts({
      contacts: [
        { id: 'a', name: 'Ana', email: '', tags: ['x', 3, ''], createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-02T00:00:00Z',
          conversations: [{ lastMessageAt: '2026-10-05T00:00:00Z', messages: [] }, { lastMessageAt: null, messages: [{ createdAt: '2026-10-07T00:00:00Z' }] }] },
        { id: 'b' },
        'basura',
        { id: 'c', name: 'Sin fechas' },
      ],
    });
    expect(parsed.map((c) => c.id)).toEqual(['a', 'c']);
    expect(parsed[0]?.email).toBeNull();
    expect(parsed[0]?.tags).toEqual(['x']);
    expect(parsed[0]?.lastActivityAt).toBe('2026-10-07T00:00:00Z');
    expect(parsed[1]?.lastActivityAt).toBe('');
  });
  it('tolera cargas vacías', () => {
    expect(parseContacts(null)).toEqual([]);
    expect(parseContacts({ contacts: 'x' })).toEqual([]);
  });
});

describe('filtros y orden', () => {
  it('busca sin tildes en nombre, correo, teléfono y etiquetas', () => {
    const f = { q: '', source: '', tag: '' };
    expect(filterContacts(LIST, { ...f, q: 'maria' }).map((c) => c.id)).toEqual(['1']);
    expect(filterContacts(LIST, { ...f, q: 'angel' }).map((c) => c.id)).toEqual(['3']);
    expect(filterContacts(LIST, { ...f, q: '1234567' }).map((c) => c.id)).toEqual(['2']);
    expect(filterContacts(LIST, { ...f, q: 'LEAD' }).map((c) => c.id)).toEqual(['2']);
  });
  it('combina fuente y etiqueta', () => {
    expect(filterContacts(LIST, { q: '', source: 'whatsapp', tag: 'vip' }).map((c) => c.id)).toEqual(['1']);
    expect(activeFilterCount({ q: 'x', source: 'web', tag: '' })).toBe(1);
  });
  it('ordena por cada criterio sin mutar la entrada', () => {
    const copy = [...LIST];
    expect(sortContacts(LIST, 'name').map((c) => c.id)).toEqual(['3', '2', '1']);
    expect(sortContacts(LIST, 'created').map((c) => c.id)).toEqual(['3', '1', '2']);
    expect(sortContacts(LIST, 'activity').map((c) => c.id)).toEqual(['2', '3', '1']);
    expect(sortContacts(LIST, 'recent').map((c) => c.id)).toEqual(['3', '1', '2']);
    expect(LIST).toEqual(copy);
  });
  it('recopila etiquetas y fuentes únicas', () => {
    expect(collectTags(LIST)).toEqual(['lead', 'vip']);
    expect(collectSources(LIST)).toEqual(['web', 'whatsapp']);
    expect(sourceLabel(null)).toBe('Sin fuente');
    expect(sourceLabel('otra')).toBe('otra');
  });
  it('withTag evita duplicados y recorta', () => {
    expect(withTag(['VIP'], ' vip ')).toEqual(['VIP']);
    expect(withTag(['a'], 'b')).toEqual(['a', 'b']);
    expect(withTag(['a'], '   ')).toEqual(['a']);
  });
});

describe('exportación', () => {
  it('genera CSV con cabecera y neutraliza fórmulas', () => {
    const csv = contactsToCsv([contact({ id: '9', name: '=HYPERLINK("x")', phone: '+58 412' })]);
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('Nombre,Teléfono,Correo,Fuente,Etiquetas,Creado,Última actividad');
    expect(lines[1]?.startsWith("\"'=HYPERLINK(\"\"x\"\")\",+58 412")).toBe(true);
  });
});

describe('importación', () => {
  it('rechaza archivos que no son CSV o son demasiado grandes', () => {
    expect(validateImportFile({ name: 'a.xlsx', size: 10, type: '' })).toMatch(/csv/i);
    expect(validateImportFile({ name: 'a.csv', size: 10, type: 'application/x-msdownload' })).toMatch(/csv/i);
    expect(validateImportFile({ name: 'a.csv', size: 0, type: 'text/csv' })).toMatch(/vacío/);
    expect(validateImportFile({ name: 'a.csv', size: 2_000_000, type: 'text/csv' })).toMatch(/1 MB/);
    expect(validateImportFile({ name: 'A.CSV', size: 100, type: '' })).toBeNull();
  });
  it('mapea columnas con alias y reporta problemas por línea', () => {
    const plan = planImport([
      ['Nombre', 'Correo electrónico', 'Teléfono'],
      ['Ana', 'ana@x.com', '+58 (412) 123-4567'],
      ['', 'sin@nombre.com', ''],
      ['Luis', 'no-es-correo', ''],
      ['Ana Dos', 'ANA@x.com', ''],
      ['Marta', '', 'tel: 0414 555'],
    ]);
    expect(plan.fatal).toBeNull();
    expect(plan.valid.map((c) => c.name)).toEqual(['Ana', 'Marta']);
    expect(plan.valid[1]?.phone).toBe('0414 555');
    expect(plan.issues.map((i) => i.line)).toEqual([3, 4, 5]);
  });
  it('exige columna de nombre y limita filas', () => {
    expect(planImport([]).fatal).toMatch(/no tiene filas/);
    expect(planImport([['correo'], ['a@b.co']]).fatal).toMatch(/Nombre/);
    const big = [['nombre'], ...Array.from({ length: MAX_IMPORT_ROWS + 1 }, (_, i) => [`n${i}`])];
    expect(planImport(big).fatal).toMatch(/Máximo/);
  });
});
