import { describe, expect, it } from 'vitest';
import {
  addPreset, buildEmbedCode, defaultCountdown, escapeHtml, normalizeCountdown, parsePresets, remainingParts,
  sanitizeHex, serializePresets, MAX_PRESETS,
} from '../marketing-countdown';

const base = defaultCountdown(Date.UTC(2026, 9, 16, 12, 0, 0));

describe('marketing-countdown', () => {
  it('calcula el tiempo restante', () => {
    const now = Date.UTC(2026, 0, 1);
    expect(remainingParts(now + (2 * 86400 + 3 * 3600 + 4 * 60 + 5) * 1000, now)).toEqual({ days: 2, hours: 3, minutes: 4, seconds: 5, done: false });
    expect(remainingParts(now - 1, now).done).toBe(true);
    expect(remainingParts(Number.NaN, now).done).toBe(true);
  });
  it('valida colores y escapa HTML', () => {
    expect(sanitizeHex('#abc', '#000000')).toBe('#ABC');
    expect(sanitizeHex('rojo', '#000000')).toBe('#000000');
    expect(escapeHtml('<a href="x">&</a>')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;');
  });
  it('el valor por defecto es a 7 días', () => {
    expect(new Date(base.targetIso).getTime() - Date.UTC(2026, 9, 16, 12, 0, 0)).toBe(7 * 86400_000);
  });
  it('normaliza configuraciones dañadas', () => {
    expect(normalizeCountdown(null, base)).toBe(base);
    const c = normalizeCountdown({ targetIso: 'x', title: 'T'.repeat(200), accent: 'zzz', style: 'minimal' }, base);
    expect(c.targetIso).toBe(base.targetIso);
    expect(c.title).toHaveLength(80);
    expect(c.accent).toBe(base.accent);
    expect(c.style).toBe('minimal');
  });
  it('preajustes: ida y vuelta, tope y reemplazo por nombre', () => {
    let list = addPreset([], 'Black Friday', base, 'a');
    list = addPreset(list, 'black friday', { ...base, title: 'Nuevo' }, 'b');
    expect(list).toHaveLength(1);
    expect(list[0].config.title).toBe('Nuevo');
    expect(parsePresets(serializePresets(list), base)).toHaveLength(1);
    expect(parsePresets('{{no json', base)).toEqual([]);
    expect(parsePresets(null, base)).toEqual([]);
    expect(parsePresets('[{"id":1}]', base)).toEqual([]);
    let many = list;
    for (let i = 0; i < 20; i++) many = addPreset(many, `p${i}`, base, `i${i}`);
    expect(many).toHaveLength(MAX_PRESETS);
    expect(addPreset(list, '  ', base, 'z')).toBe(list);
  });
  it('el código incrustable escapa el título y no deja cerrar el script', () => {
    const code = buildEmbedCode({ ...base, title: '<img src=x onerror=alert(1)>', endMessage: '</script><b>fin' }, 'ab-12');
    expect(code).not.toContain('<img src=x');
    expect(code).toContain('&lt;img');
    expect(code).not.toContain('</script><b>');
    expect(code).toContain('id="rai-cd-ab12"');
    expect(code.match(/<\/script>/g)).toHaveLength(1);
  });
});
