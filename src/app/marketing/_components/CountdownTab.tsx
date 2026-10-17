'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Bookmark, Timer, Trash2 } from 'lucide-react';
import {
  COUNTDOWN_PRESETS_KEY,
  addPreset,
  buildEmbedCode,
  defaultCountdown,
  isoToLocalInput,
  localInputToIso,
  parsePresets,
  remainingParts,
  sanitizeHex,
  serializePresets,
  two,
  type CountdownConfig,
  type CountdownPreset,
} from '@/lib/marketing-countdown';
import { normalizeHex } from '@/lib/marketing-brand';
import { CopyButton, Note, useCopy, useNow } from './shared';

function Preview({ c, now }: { c: CountdownConfig; now: number | null }) {
  const parts = remainingParts(new Date(c.targetIso).getTime(), now ?? Date.now());
  const accent = sanitizeHex(c.accent, '#C9A84C');
  const minimal = c.style === 'minimal';
  const cells: Array<[number, string]> = [[parts.days, 'días'], [parts.hours, 'horas'], [parts.minutes, 'min'], [parts.seconds, 'seg']];
  return (
    <div className="mkt-cd" style={{ background: sanitizeHex(c.background, '#12121A'), color: sanitizeHex(c.textColor, '#F5F5F5') }} role="timer" aria-label="Vista previa de la cuenta atrás">
      <p className="mkt-cd-title">{c.title}</p>
      {parts.done ? (
        <div className="mkt-cd-row"><strong>{c.endMessage}</strong></div>
      ) : (
        <div className="mkt-cd-row">
          {cells.map(([n, l]) => (
            <div key={l} className={`mkt-cd-cell${minimal ? ' is-min' : ''}`} style={minimal ? undefined : { background: `${accent}22`, border: `1px solid ${accent}66` }}>
              <div className="mkt-cd-num" style={{ color: accent }}>{two(n)}</div>
              <div className="mkt-cd-lbl">{l}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CountdownTab() {
  const now = useNow(1000);
  const { copied, copy } = useCopy();
  const [cfg, setCfg] = useState<CountdownConfig | null>(null);
  const [presets, setPresets] = useState<CountdownPreset[]>([]);
  const [presetName, setPresetName] = useState('');
  const [uid, setUid] = useState('x');

  // Todo lo que depende de la hora o del navegador se resuelve tras montar (sin desajuste de hidratación).
  useEffect(() => {
    const base = defaultCountdown(Date.now());
    setCfg(base);
    setUid(Math.random().toString(36).slice(2, 8));
    try {
      setPresets(parsePresets(window.localStorage.getItem(COUNTDOWN_PRESETS_KEY), base));
    } catch {
      /* almacenamiento bloqueado: los preajustes quedan solo en memoria */
    }
  }, []);

  function persist(next: CountdownPreset[]) {
    setPresets(next);
    try {
      window.localStorage.setItem(COUNTDOWN_PRESETS_KEY, serializePresets(next));
    } catch {
      /* sin almacenamiento */
    }
  }

  const code = useMemo(() => (cfg ? buildEmbedCode(cfg, uid) : ''), [cfg, uid]);
  if (!cfg) return <div className="card mkt-skel-panel" aria-busy="true"><span className="fx-sr-only">Cargando…</span></div>;

  const set = <K extends keyof CountdownConfig>(k: K, v: CountdownConfig[K]) => setCfg((c) => (c ? { ...c, [k]: v } : c));
  const past = new Date(cfg.targetIso).getTime() <= (now ?? Date.now());

  return (
    <div className="mkt-panel">
      <div className="mkt-split">
        <section className="card" aria-labelledby="cd-form">
          <h2 id="cd-form" className="mkt-card-title"><Timer size={16} aria-hidden="true" />Configura tu temporizador</h2>
          <div className="mkt-fields">
            <div className="mkt-field">
              <label htmlFor="cd-target">Fecha y hora final (tu hora local)</label>
              <input id="cd-target" type="datetime-local" value={isoToLocalInput(cfg.targetIso)} onChange={(e) => { const iso = localInputToIso(e.target.value); if (iso) set('targetIso', iso); }} />
              {past && <small style={{ color: 'var(--rai-warning)' }}>La fecha ya pasó: se mostrará el mensaje final.</small>}
            </div>
            <div className="mkt-field"><label htmlFor="cd-title">Título</label><input id="cd-title" maxLength={80} value={cfg.title} onChange={(e) => set('title', e.target.value)} /></div>
            <div className="mkt-field"><label htmlFor="cd-end">Mensaje al terminar</label><input id="cd-end" maxLength={80} value={cfg.endMessage} onChange={(e) => set('endMessage', e.target.value)} /></div>
            <div className="mkt-fields two">
              {([['accent', 'Acento'], ['background', 'Fondo'], ['textColor', 'Texto']] as const).map(([k, l]) => (
                <div key={k} className="mkt-field"><label htmlFor={`cd-${k}`}>{l}</label><input id={`cd-${k}`} className="mkt-color" type="color" value={normalizeHex(sanitizeHex(cfg[k], '#000000'))} onChange={(e) => set(k, e.target.value.toUpperCase())} /></div>
              ))}
            </div>
            <div className="mkt-seg" role="group" aria-label="Estilo">
              <button type="button" className="mkt-seg-btn" aria-pressed={cfg.style === 'blocks'} onClick={() => set('style', 'blocks')}>Bloques</button>
              <button type="button" className="mkt-seg-btn" aria-pressed={cfg.style === 'minimal'} onClick={() => set('style', 'minimal')}>Minimalista</button>
            </div>
          </div>
        </section>

        <div style={{ display: 'grid', gap: 16 }}>
          <section className="card" aria-labelledby="cd-prev">
            <h2 id="cd-prev" className="mkt-card-title">Vista previa en vivo</h2>
            <Preview c={cfg} now={now} />
          </section>
          <section className="card" aria-labelledby="cd-code">
            <h2 id="cd-code" className="mkt-card-title">Código para tu página</h2>
            <label htmlFor="cd-code-area" className="fx-sr-only">Código HTML de la cuenta atrás</label>
            <textarea id="cd-code-area" className="mkt-code" rows={code.split('\n').length + 4} readOnly value={code} onFocus={(e) => e.currentTarget.select()} />
            <div className="mkt-actions" style={{ marginTop: 10 }}>
              <CopyButton id="cd-code" text={code} copied={copied} onCopy={copy} label="Copiar código" />
              <CopyButton id="cd-iso" text={cfg.targetIso} copied={copied} onCopy={copy} label="Copiar fecha final (ISO)" />
            </div>
            <div style={{ marginTop: 10 }}>
              <Note>Pega el código en un bloque HTML de tu sitio web. Los correos bloquean JavaScript, así que ahí no se movería.</Note>
            </div>
          </section>
          <section className="card" aria-labelledby="cd-presets">
            <h2 id="cd-presets" className="mkt-card-title"><Bookmark size={16} aria-hidden="true" />Preajustes<small>Guardados en este navegador</small></h2>
            <div className="mkt-actions">
              <div className="grow"><label htmlFor="cd-pname" className="fx-sr-only">Nombre del preajuste</label><input id="cd-pname" value={presetName} maxLength={40} onChange={(e) => setPresetName(e.target.value)} placeholder="Ej.: Black Friday" /></div>
              <button type="button" className="mkt-btn" disabled={!presetName.trim()} onClick={() => { persist(addPreset(presets, presetName, cfg, Math.random().toString(36).slice(2, 10))); setPresetName(''); }}>Guardar actual</button>
            </div>
            {presets.length === 0 ? <p className="muted" style={{ marginTop: 10, fontSize: 13 }}>Aún no guardas ninguno.</p> : (
              <div className="mkt-list" style={{ marginTop: 8 }}>
                {presets.map((p) => (
                  <div key={p.id} className="mkt-item">
                    <div><h3>{p.name}</h3><p>{p.config.title}</p></div>
                    <div className="mkt-item-actions">
                      <button type="button" className="mkt-btn" onClick={() => setCfg(p.config)}>Aplicar</button>
                      <button type="button" className="mkt-btn is-danger" aria-label={`Eliminar preajuste ${p.name}`} onClick={() => persist(presets.filter((x) => x.id !== p.id))}><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
