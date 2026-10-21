import { describe, expect, it } from 'vitest';
import { EMPTY_BRIEF } from '../campaign-brief';
import {
  MAX_PRESETS,
  MAX_PRESET_NAME,
  isPreset,
  makePreset,
  parsePresets,
  removePreset,
  serializePresets,
  upsertPreset,
} from '../campaign-presets';

const config = {
  pipelineType: 'carousel',
  provider: 'anthropic',
  modelId: 'claude-sonnet-4-5',
  imageProvider: 'openai',
  brandInput: 'Marca X',
  brief: EMPTY_BRIEF,
};

describe('preajustes', () => {
  it('crea un preajuste válido con nombre recortado', () => {
    const p = makePreset('  ' + 'n'.repeat(80), config, 1_000);
    expect(isPreset(p)).toBe(true);
    expect(p.name.length).toBe(MAX_PRESET_NAME);
    expect(p.savedAt).toBe(1_000);
  });

  it('ida y vuelta por el almacenamiento', () => {
    const list = [makePreset('Hotel', config, 1), makePreset('Tienda', config, 2)];
    expect(parsePresets(serializePresets(list)).map((p) => p.name)).toEqual(['Hotel', 'Tienda']);
  });

  it('ignora datos corruptos o con selecciones que ya no existen', () => {
    expect(parsePresets(null)).toEqual([]);
    expect(parsePresets('{no es json')).toEqual([]);
    expect(parsePresets('{"a":1}')).toEqual([]);
    const bad = { ...makePreset('Viejo', config, 1), modelId: 'modelo-fantasma' };
    const good = makePreset('Bueno', config, 2);
    expect(parsePresets(JSON.stringify([bad, good, 7, null])).map((p) => p.name)).toEqual(['Bueno']);
  });

  it('reemplaza por nombre sin distinguir mayúsculas y respeta el tope', () => {
    let list = [makePreset('Hotel', config, 1)];
    list = upsertPreset(list, makePreset('hotel ', { ...config, brandInput: 'Nueva' }, 2));
    expect(list).toHaveLength(1);
    expect(list[0].brandInput).toBe('Nueva');
    for (let i = 0; i < MAX_PRESETS + 3; i++) list = upsertPreset(list, makePreset(`P${i}`, config, 10 + i));
    expect(list).toHaveLength(MAX_PRESETS);
    expect(list[0].name).toBe(`P${MAX_PRESETS + 2}`);
  });

  it('elimina por id', () => {
    const a = makePreset('A', config, 1);
    const b = makePreset('B', config, 2);
    expect(removePreset([a, b], a.id)).toEqual([b]);
  });
});
