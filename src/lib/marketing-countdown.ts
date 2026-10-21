/** Generador de Cuenta Atrás: cálculo, configuración, preajustes y código incrustable. Lógica pura. */

export interface CountdownConfig {
  /** Instante final en ISO (UTC). */
  targetIso: string;
  title: string;
  endMessage: string;
  accent: string;
  background: string;
  textColor: string;
  style: 'blocks' | 'minimal';
}

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  done: boolean;
}

export function remainingParts(targetMs: number, nowMs: number): CountdownParts {
  const diff = Math.floor((targetMs - nowMs) / 1000);
  if (!Number.isFinite(diff) || diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true };
  return {
    days: Math.floor(diff / 86400),
    hours: Math.floor((diff % 86400) / 3600),
    minutes: Math.floor((diff % 3600) / 60),
    seconds: diff % 60,
    done: false,
  };
}

export const two = (n: number) => String(n).padStart(2, '0');

export function sanitizeHex(v: string, fallback: string): string {
  const t = v.trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(t) ? t.toUpperCase() : fallback;
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export const DEFAULT_PALETTE = { accent: '#C9A84C', background: '#12121A', textColor: '#F5F5F5' } as const;

export function defaultCountdown(nowMs: number): CountdownConfig {
  const t = new Date(nowMs + 7 * 86400_000);
  t.setUTCSeconds(0, 0);
  return {
    targetIso: t.toISOString(),
    title: 'La oferta termina en',
    endMessage: 'La oferta ha terminado',
    ...DEFAULT_PALETTE,
    style: 'blocks',
  };
}

/** Valor para <input type="datetime-local"> en hora local del navegador. */
export function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}T${two(d.getHours())}:${two(d.getMinutes())}`;
}

/** Interpreta el valor de datetime-local como hora local del navegador; '' si no es válido. */
export function localInputToIso(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

export function normalizeCountdown(raw: unknown, fallback: CountdownConfig): CountdownConfig {
  if (!raw || typeof raw !== 'object') return fallback;
  const r = raw as Record<string, unknown>;
  const s = (k: string, max: number, d: string) => (typeof r[k] === 'string' ? (r[k] as string).slice(0, max) : d);
  const iso = typeof r.targetIso === 'string' && !Number.isNaN(new Date(r.targetIso).getTime()) ? (r.targetIso as string) : fallback.targetIso;
  return {
    targetIso: iso,
    title: s('title', 80, fallback.title),
    endMessage: s('endMessage', 80, fallback.endMessage),
    accent: sanitizeHex(s('accent', 9, ''), fallback.accent),
    background: sanitizeHex(s('background', 9, ''), fallback.background),
    textColor: sanitizeHex(s('textColor', 9, ''), fallback.textColor),
    style: r.style === 'minimal' ? 'minimal' : 'blocks',
  };
}

// ---------- Preajustes (localStorage) ----------

export interface CountdownPreset {
  id: string;
  name: string;
  config: CountdownConfig;
}

export const COUNTDOWN_PRESETS_KEY = 'rai-mkt-countdown-presets-v1';
export const MAX_PRESETS = 12;

export function parsePresets(raw: string | null, fallback: CountdownConfig): CountdownPreset[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    const out: CountdownPreset[] = [];
    for (const item of data) {
      if (!item || typeof item !== 'object') continue;
      const it = item as Record<string, unknown>;
      if (typeof it.id !== 'string' || typeof it.name !== 'string' || !it.name.trim()) continue;
      out.push({ id: it.id.slice(0, 40), name: it.name.trim().slice(0, 40), config: normalizeCountdown(it.config, fallback) });
      if (out.length >= MAX_PRESETS) break;
    }
    return out;
  } catch {
    return [];
  }
}

export function serializePresets(list: CountdownPreset[]): string {
  return JSON.stringify(list.slice(0, MAX_PRESETS));
}

export function addPreset(list: CountdownPreset[], name: string, config: CountdownConfig, id: string): CountdownPreset[] {
  const clean = name.trim().slice(0, 40);
  if (!clean) return list;
  const without = list.filter((p) => p.name.toLowerCase() !== clean.toLowerCase());
  return [{ id, name: clean, config }, ...without].slice(0, MAX_PRESETS);
}

// ---------- Código incrustable ----------

/** HTML autosuficiente (estilos + script) para pegar en una página web. No funciona en correos (se bloquea JavaScript). */
export function buildEmbedCode(c: CountdownConfig, uid: string): string {
  const id = `rai-cd-${uid.replace(/[^a-z0-9]/gi, '').slice(0, 10) || 'x'}`;
  const accent = sanitizeHex(c.accent, DEFAULT_PALETTE.accent);
  const bg = sanitizeHex(c.background, DEFAULT_PALETTE.background);
  const fg = sanitizeHex(c.textColor, DEFAULT_PALETTE.textColor);
  const blocks = c.style === 'blocks';
  const data = JSON.stringify({ t: c.targetIso, end: c.endMessage }).replace(/</g, '\\u003c');
  const cell = blocks
    ? `background:${accent}22;border:1px solid ${accent}66;border-radius:10px;padding:10px 12px;min-width:56px;`
    : 'padding:4px 8px;min-width:44px;';
  return `<div id="${id}" style="font-family:system-ui,sans-serif;background:${bg};color:${fg};border-radius:14px;padding:20px;text-align:center;max-width:100%;box-sizing:border-box">
  <p style="margin:0 0 12px;font-size:15px;opacity:.85">${escapeHtml(c.title)}</p>
  <div data-body style="display:flex;justify-content:center;flex-wrap:wrap;gap:8px"></div>
</div>
<script>
(function(){
  var cfg=${data},root=document.getElementById("${id}"),body=root.querySelector("[data-body]"),t=new Date(cfg.t).getTime();
  var L=["días","horas","min","seg"];
  function two(n){return n<10?"0"+n:""+n}
  function tick(){
    var d=Math.floor((t-Date.now())/1000);
    if(!(d>0)){body.textContent=cfg.end;clearInterval(h);return}
    var v=[Math.floor(d/86400),Math.floor(d%86400/3600),Math.floor(d%3600/60),d%60];
    body.innerHTML=v.map(function(n,i){return '<div style="${cell}"><div style="font-size:26px;font-weight:700;color:${accent};font-variant-numeric:tabular-nums">'+two(n)+'</div><div style="font-size:11px;opacity:.7">'+L[i]+'</div></div>'}).join("");
  }
  var h=setInterval(tick,1000);tick();
})();
</script>`;
}
