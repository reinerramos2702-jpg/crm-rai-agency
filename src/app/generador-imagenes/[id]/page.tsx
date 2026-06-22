'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Send,
  CheckCircle2,
  Circle,
  Sparkles,
  Image as ImageIcon,
  Wand2,
  Plus,
  X,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Spinner } from '@/components/ui/Spinner';
import toast from 'react-hot-toast';

const LLM_PROVIDERS = [
  { provider: 'deepseek', label: 'DeepSeek (Barato)', models: ['deepseek-chat', 'deepseek-reasoner'] },
  { provider: 'anthropic', label: 'Claude', models: ['claude-sonnet-4-5', 'claude-opus-4-7'] },
  { provider: 'google', label: 'Gemini', models: ['gemini-2.5-pro', 'gemini-2.5-flash'] },
  { provider: 'openai', label: 'GPT-4', models: ['gpt-4o', 'gpt-4o-mini'] },
];

const IMAGE_PROVIDERS = [
  { value: 'gemini', label: 'Gemini Imagen 3 ($0.03/img)' },
  { value: 'openai', label: 'DALL-E 3 / gpt-image-1 ($0.04/img)' },
  { value: 'stabilityai', label: 'Stability AI ($0.08/img)' },
];

const NODES = [
  { n: 1, title: 'Ideación de grilla semanal', hint: 'Define los 7 temas de la semana' },
  { n: 2, title: 'Arquitectura narrativa', hint: 'Estilos visuales + estructura de slides (PAS)' },
  { n: 3, title: 'Generación de imágenes', hint: 'Prompt y generación slide por slide' },
  { n: 4, title: 'Ciclaje entre temas', hint: 'Repite 2→3→4 hasta completar la grilla' },
  { n: 5, title: 'Síntesis de copywriting', hint: 'Captions, CTAs y hashtags finales' },
];

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ThemeEntry {
  title: string;
  category: string;
  segment?: string;
}

interface Asset {
  id: string;
  themeIndex: number;
  slideNumber: number;
  prompt: string | null;
  publicUrl: string;
  createdAt: string;
}

interface ContentGrid {
  id: string;
  name: string;
  status: string;
  currentStep: number;
  activeThemeIndex: number;
  themesTotal: number;
  imageProvider: string;
  llmProvider: string | null;
  llmModel: string | null;
  chatHistory: ChatMessage[];
  themes: ThemeEntry[];
  assets: Asset[];
}

export default function ContentGridWizardPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const gridId = params.id;

  const [grid, setGrid] = useState<ContentGrid | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [provider, setProvider] = useState<'deepseek' | 'anthropic' | 'google' | 'openai'>('anthropic');
  const [modelId, setModelId] = useState('claude-sonnet-4-5');
  const [imageProvider, setImageProvider] = useState('gemini');

  const [themes, setThemes] = useState<ThemeEntry[]>([]);

  // Estudio de imágenes (Nodo 3)
  const [slideNumber, setSlideNumber] = useState(1);
  const [imagePrompt, setImagePrompt] = useState('');
  const [generatingImage, setGeneratingImage] = useState(false);

  const chatLogRef = useRef<HTMLDivElement>(null);

  const loadGrid = useCallback(async () => {
    try {
      const res = await fetch(`/api/content-grids/${gridId}`);
      if (!res.ok) throw new Error('Grilla no encontrada');
      const data = await res.json();
      const g: ContentGrid = data.grid;
      setGrid(g);
      setMessages(g.chatHistory || []);
      setThemes(
        g.themes && g.themes.length > 0
          ? g.themes
          : Array.from({ length: g.themesTotal }, () => ({ title: '', category: '' }))
      );
      setImageProvider(g.imageProvider || 'gemini');
      if (g.llmProvider) setProvider(g.llmProvider as any);
      if (g.llmModel) setModelId(g.llmModel);
    } catch (e: any) {
      toast.error(e.message || 'Error cargando la grilla');
    } finally {
      setLoading(false);
    }
  }, [gridId]);

  useEffect(() => {
    loadGrid();
  }, [loadGrid]);

  useEffect(() => {
    chatLogRef.current?.scrollTo({ top: chatLogRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function patchGrid(data: Record<string, unknown>) {
    setSaving(true);
    try {
      const res = await fetch(`/api/content-grids/${gridId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('No se pudo guardar');
      const updated = await res.json();
      setGrid((prev) => (prev ? { ...prev, ...updated.grid } : prev));
      return updated.grid;
    } catch (e: any) {
      toast.error(e.message || 'Error guardando cambios');
    } finally {
      setSaving(false);
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || busy || !grid) return;

    const userMsg: ChatMessage = { role: 'user', content: input.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setBusy(true);

    let res: Response;
    try {
      res = await fetch(`/api/content-grids/${gridId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, provider, modelId }),
      });
    } catch {
      toast.error('Error de red al contactar la IA.');
      setBusy(false);
      return;
    }

    if (!res.ok) {
      let errMsg = `Error ${res.status} al contactar la IA.`;
      try {
        const text = await res.text();
        try {
          const parsed = JSON.parse(text);
          errMsg = parsed.error || text || errMsg;
        } catch {
          errMsg = text || errMsg;
        }
      } catch {}
      if (res.status === 401) errMsg = 'Sesión expirada. Vuelve a iniciar sesión.';
      else if (/no api key/i.test(errMsg)) {
        errMsg = `No hay API key configurada para "${provider}". Ve a "Claves de IA" y agrega una.`;
      }
      toast.error(errMsg);
      setMessages([...next, { role: 'assistant', content: `⚠️ ${errMsg}` }]);
      setBusy(false);
      return;
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let assistantText = '';
    let gotAnyText = false;
    setMessages([...next, { role: 'assistant', content: '' }]);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split('\n')) {
        if (!line.trim()) continue;
        if (line.startsWith('0:')) {
          try {
            const piece = JSON.parse(line.slice(2));
            assistantText += piece;
            gotAnyText = true;
            setMessages([...next, { role: 'assistant', content: assistantText }]);
          } catch {}
        } else if (line.startsWith('3:')) {
          try {
            const errPiece = JSON.parse(line.slice(2));
            const errText = typeof errPiece === 'string' ? errPiece : errPiece?.message || 'Error desconocido del modelo.';
            toast.error(`Error de la IA: ${errText}`);
            assistantText = `⚠️ ${errText}`;
            gotAnyText = true;
            setMessages([...next, { role: 'assistant', content: assistantText }]);
          } catch {}
        }
      }
    }

    if (!gotAnyText) {
      const errText = 'La IA no devolvió respuesta. Verifica tu API key en "Claves de IA".';
      toast.error(errText);
      setMessages([...next, { role: 'assistant', content: `⚠️ ${errText}` }]);
    }

    setBusy(false);
    setGrid((prev) => (prev ? { ...prev, status: 'in_progress' } : prev));
  }

  /** ALTO TOTAL — avanza al siguiente nodo (y cicla temas en Nodos 2-4) */
  async function advanceStep() {
    if (!grid) return;
    let nextStep = grid.currentStep;
    let nextThemeIndex = grid.activeThemeIndex;
    let nextStatus = grid.status;

    if (grid.currentStep === 4) {
      if (grid.activeThemeIndex < grid.themesTotal - 1) {
        nextStep = 2;
        nextThemeIndex = grid.activeThemeIndex + 1;
      } else {
        nextStep = 5;
      }
    } else if (grid.currentStep < 5) {
      nextStep = grid.currentStep + 1;
    } else {
      nextStatus = 'completed';
    }

    await patchGrid({ currentStep: nextStep, activeThemeIndex: nextThemeIndex, status: nextStatus });
    toast.success('ALTO TOTAL validado — avanzando');
  }

  function updateTheme(i: number, field: keyof ThemeEntry, value: string) {
    setThemes((prev) => prev.map((t, idx) => (idx === i ? { ...t, [field]: value } : t)));
  }

  async function saveThemes() {
    await patchGrid({ themes });
    toast.success('Temas guardados');
  }

  async function generateImage() {
    if (!grid || !imagePrompt.trim()) {
      toast.error('Escribe el prompt de imagen para este slide');
      return;
    }
    setGeneratingImage(true);
    try {
      const res = await fetch(`/api/content-grids/${gridId}/generate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          themeIndex: grid.activeThemeIndex,
          slideNumber,
          prompt: imagePrompt.trim(),
          provider: imageProvider,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error generando la imagen');
      toast.success(`Imagen generada (costo ~$${data.costUsd?.toFixed(2) ?? '?'})`);
      setGrid((prev) =>
        prev
          ? { ...prev, assets: [...prev.assets.filter((a) => !(a.themeIndex === data.asset.themeIndex && a.slideNumber === data.asset.slideNumber)), data.asset] }
          : prev
      );
    } catch (e: any) {
      toast.error(e.message || 'Error generando la imagen');
    } finally {
      setGeneratingImage(false);
    }
  }

  if (loading) {
    return (
      <div className="row" style={{ justifyContent: 'center', padding: 80 }}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (!grid) {
    return (
      <div className="container">
        <p className="muted">No se encontró esta grilla.</p>
        <Link href="/generador-imagenes" className="btn-secondary" style={{ marginTop: 12 }}>
          <ArrowLeft size={14} /> Volver a la galería
        </Link>
      </div>
    );
  }

  const themeAssets = grid.assets.filter((a) => a.themeIndex === grid.activeThemeIndex);

  return (
    <>
      <TopBar
        title={grid.name}
        subtitle={`Nodo ${grid.currentStep}/5 · ${NODES[grid.currentStep - 1].title}${saving ? ' · guardando…' : ''}`}
        actions={
          <>
            <Link href="/generador-imagenes" className="btn-ghost btn-sm">
              <ArrowLeft size={14} /> Galería
            </Link>
            <button className="btn-primary btn-sm" onClick={advanceStep} disabled={saving}>
              <CheckCircle2 size={14} /> ALTO TOTAL — Validar y continuar
            </button>
          </>
        }
      />

      <div style={{ display: 'flex', height: 'calc(100vh - 73px)' }}>
        {/* ===== Columna izquierda: stepper + config ===== */}
        <div
          style={{
            width: 300,
            borderRight: '1px solid var(--rai-border)',
            padding: 20,
            overflowY: 'auto',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          {/* Stepper de 5 nodos */}
          <div>
            <p className="label" style={{ marginBottom: 10 }}>Pipeline — 5 nodos</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {NODES.map((node) => {
                const isDone = node.n < grid.currentStep;
                const isCurrent = node.n === grid.currentStep;
                return (
                  <div
                    key={node.n}
                    className="row"
                    style={{
                      gap: 10,
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: isCurrent ? 'rgba(201,168,76,0.08)' : 'transparent',
                      border: isCurrent ? '1px solid rgba(201,168,76,0.3)' : '1px solid transparent',
                    }}
                  >
                    {isDone ? (
                      <CheckCircle2 size={18} color="var(--rai-success)" style={{ flexShrink: 0 }} />
                    ) : (
                      <Circle size={18} color={isCurrent ? 'var(--rai-gold)' : 'var(--rai-muted)'} style={{ flexShrink: 0 }} />
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: isCurrent ? 'var(--rai-gold)' : 'var(--rai-text)' }}>
                        {node.n}. {node.title}
                      </div>
                      <div className="muted" style={{ fontSize: 11 }}>{node.hint}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Progreso de temas (Nodos 2-4) */}
          {grid.currentStep >= 2 && grid.currentStep <= 4 && (
            <div>
              <p className="label" style={{ marginBottom: 10 }}>Tema activo</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {Array.from({ length: grid.themesTotal }).map((_, i) => (
                  <span
                    key={i}
                    className={`badge ${i === grid.activeThemeIndex ? 'badge-gold' : i < grid.activeThemeIndex ? 'badge-success' : 'badge-muted'}`}
                  >
                    {i + 1}
                  </span>
                ))}
              </div>
              {themes[grid.activeThemeIndex]?.title && (
                <p className="muted" style={{ marginTop: 8, fontSize: 12 }}>
                  {themes[grid.activeThemeIndex].title}
                </p>
              )}
            </div>
          )}

          {/* Temas de la semana (editable, Nodo 1) */}
          <div>
            <div className="row-between" style={{ marginBottom: 10 }}>
              <p className="label" style={{ margin: 0 }}>Temas de la semana</p>
              <button className="btn-ghost btn-sm" onClick={saveThemes} disabled={saving}>
                Guardar
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {themes.map((t, i) => (
                <div key={i} className="card" style={{ padding: 10 }}>
                  <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>Día {i + 1}</div>
                  <input
                    placeholder="Título del tema"
                    value={t.title}
                    onChange={(e) => updateTheme(i, 'title', e.target.value)}
                    style={{ marginBottom: 6, fontSize: 12, padding: '6px 10px' }}
                  />
                  <input
                    placeholder="Categoría"
                    value={t.category}
                    onChange={(e) => updateTheme(i, 'category', e.target.value)}
                    style={{ fontSize: 12, padding: '6px 10px' }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Configuración de IA */}
          <div>
            <p className="label" style={{ marginBottom: 10 }}>Modelo de IA (chat)</p>
            <div className="form-group">
              <select
                value={provider}
                onChange={(e) => {
                  const p = e.target.value as typeof provider;
                  setProvider(p);
                  setModelId(LLM_PROVIDERS.find((x) => x.provider === p)?.models[0] || '');
                }}
              >
                {LLM_PROVIDERS.map((p) => (
                  <option key={p.provider} value={p.provider}>{p.label}</option>
                ))}
              </select>
            </div>
            <select value={modelId} onChange={(e) => setModelId(e.target.value)}>
              {LLM_PROVIDERS.find((p) => p.provider === provider)?.models.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <p className="label" style={{ marginBottom: 10 }}>Proveedor de imágenes</p>
            <select
              value={imageProvider}
              onChange={(e) => {
                setImageProvider(e.target.value);
                patchGrid({ imageProvider: e.target.value });
              }}
            >
              {IMAGE_PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ===== Columna central: chat ===== */}
        <div className="chat-container" style={{ flex: 1, minWidth: 0, borderRight: '1px solid var(--rai-border)' }}>
          <div className="chat-log" ref={chatLogRef}>
            {messages.length === 0 && (
              <div className="muted" style={{ textAlign: 'center', padding: 40 }}>
                <Sparkles size={24} style={{ marginBottom: 8 }} />
                <p>
                  Empieza con el Nodo 1: escribe <strong>"Hagamos la grilla de los 7 días"</strong> para que el
                  asistente proponga los temas de la semana.
                </p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`chat-bubble ${m.role}`} style={{ whiteSpace: 'pre-wrap' }}>
                {m.content}
              </div>
            ))}
            {busy && (
              <div className="chat-bubble assistant">
                <Spinner size="sm" />
              </div>
            )}
          </div>
          <form onSubmit={sendMessage} className="chat-input-row">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(e);
                }
              }}
              placeholder="Escribe tu mensaje…"
              style={{ minHeight: 44, maxHeight: 120 }}
              disabled={busy}
            />
            <button type="submit" className="btn-primary" disabled={busy || !input.trim()}>
              {busy ? <Spinner size="sm" /> : <Send size={16} />}
            </button>
          </form>
        </div>

        {/* ===== Columna derecha: estudio de imágenes / galería ===== */}
        <div style={{ width: 340, padding: 20, overflowY: 'auto', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <p className="label" style={{ marginBottom: 10 }}>
              Nodo 3 — Generar imagen (Tema {grid.activeThemeIndex + 1})
            </p>
            <div className="form-group">
              <label>Slide</label>
              <select value={slideNumber} onChange={(e) => setSlideNumber(Number(e.target.value))}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>Slide {n}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Prompt de imagen</label>
              <textarea
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                placeholder="Pega aquí el prompt detallado que te dio el asistente para este slide…"
                style={{ minHeight: 100 }}
              />
            </div>
            <button className="btn-primary" onClick={generateImage} disabled={generatingImage} style={{ width: '100%' }}>
              {generatingImage ? <Spinner size="sm" /> : <Wand2 size={16} />}
              Generar imagen
            </button>
          </div>

          <div className="divider" />

          <div>
            <p className="label" style={{ marginBottom: 10 }}>
              Imágenes del tema {grid.activeThemeIndex + 1} ({themeAssets.length})
            </p>
            {themeAssets.length === 0 ? (
              <p className="muted" style={{ fontSize: 12 }}>
                Aún no hay imágenes generadas para este tema.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {themeAssets
                  .sort((a, b) => a.slideNumber - b.slideNumber)
                  .map((asset) => (
                    <div key={asset.id} className="card" style={{ padding: 8 }}>
                      <img
                        src={asset.publicUrl}
                        alt={`Slide ${asset.slideNumber}`}
                        style={{ width: '100%', borderRadius: 'var(--radius-sm)', display: 'block', marginBottom: 6 }}
                      />
                      <div className="row-between">
                        <span className="badge badge-gold">Slide {asset.slideNumber}</span>
                        <button
                          className="btn-ghost btn-sm"
                          onClick={() => {
                            setSlideNumber(asset.slideNumber);
                            setImagePrompt(asset.prompt || '');
                          }}
                          title="Reusar prompt para regenerar"
                        >
                          <RefreshCw size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {grid.assets.length > themeAssets.length && (
            <>
              <div className="divider" />
              <div>
                <p className="label" style={{ marginBottom: 10 }}>Todas las imágenes ({grid.assets.length})</p>
                <div className="grid grid-2">
                  {grid.assets.map((asset) => (
                    <img
                      key={asset.id}
                      src={asset.publicUrl}
                      alt={`Tema ${asset.themeIndex + 1} · Slide ${asset.slideNumber}`}
                      title={`Tema ${asset.themeIndex + 1} · Slide ${asset.slideNumber}`}
                      style={{ width: '100%', borderRadius: 'var(--radius-sm)', display: 'block' }}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
