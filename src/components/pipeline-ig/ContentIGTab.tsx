'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Instagram,
  Calendar,
  MessageSquare,
  FolderOpen,
  Send,
  Loader2,
  ChevronRight,
  Image as ImageIcon,
  Video,
  LayoutGrid,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Settings,
  Eye,
  Play,
  Pause,
  RefreshCw,
} from 'lucide-react';

type CampaignStatus = 'planning' | 'generating' | 'review' | 'scheduled' | 'publishing' | 'completed';
type ContentType = 'carousel' | 'reel' | 'post';

interface ContentDay {
  day: number;
  date: string;
  type: ContentType;
  pillar: string;
  hook: string;
  caption: string;
  cta: string;
  hashtags: string;
  status: 'pending' | 'generated' | 'approved' | 'published' | 'failed';
  imageFile?: string;
}

interface Campaign {
  id: string;
  name: string;
  folderName: string;
  status: CampaignStatus;
  startDate: string;
  endDate: string;
  totalPieces: number;
  published: number;
  model: string;
  days: ContentDay[];
  createdAt: string;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const CONTENT_TYPE_ICONS: Record<ContentType, React.ReactNode> = {
  carousel: <LayoutGrid size={14} />,
  reel: <Video size={14} />,
  post: <ImageIcon size={14} />,
};

const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  carousel: 'Carrusel',
  reel: 'Reel',
  post: 'Post',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'var(--rai-muted)',
  generated: 'var(--rai-purple)',
  approved: 'var(--rai-gold)',
  published: 'var(--rai-success)',
  failed: 'var(--rai-error)',
};

const PILLAR_COLORS: Record<string, string> = {
  P1: '#3b82f6',
  P2: '#8b5cf6',
  P3: '#f59e0b',
  P4: '#10b981',
  P5: '#ec4899',
};

const AVAILABLE_MODELS = [
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', provider: 'Google' },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', provider: 'Google' },
  { id: 'gpt-4.1', label: 'GPT-4.1', provider: 'OpenAI' },
  { id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini', provider: 'OpenAI' },
  { id: 'claude-sonnet-4', label: 'Claude Sonnet 4', provider: 'Anthropic' },
  { id: 'claude-haiku-4', label: 'Claude Haiku 4', provider: 'Anthropic' },
];

const STORAGE_PREFIX = 'rai-ig-';
const DEFAULT_WELCOME: ChatMessage = {
  role: 'system',
  content: '¡Hola! Soy tu asistente de contenido para Instagram. Vamos a planear 30 días de contenido para tu negocio. Para empezar necesito saber:\n\n1. **¿Cuál es tu negocio?** (tipo, nombre, ubicación)\n2. **¿Quién es tu cliente ideal?** (edad, intereses, necesidades)\n3. **¿Qué servicios o productos ofreces?**\n4. **¿Tienes fotos reales de tu negocio?**\n\nCuéntame y yo me encargo de crear tu plan completo.',
};

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function saveToStorage(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value)); } catch {}
}

export default function ContentIGTab() {
  const [view, setView] = useState<'campaigns' | 'planner' | 'calendar'>(() => loadFromStorage('view', 'campaigns'));
  const [campaigns, setCampaigns] = useState<Campaign[]>(() => loadFromStorage('campaigns', []));
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(() => loadFromStorage('activeCampaign', null));
  const [loading, setLoading] = useState(false);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => loadFromStorage('chatMessages', [DEFAULT_WELCOME]));
  const [chatInput, setChatInput] = useState(() => loadFromStorage('chatInput', ''));
  const [chatLoading, setChatLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(() => loadFromStorage('selectedModel', 'gemini-2.5-flash'));
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [publishTime, setPublishTime] = useState(() => loadFromStorage('publishTime', '20:47'));
  const [igHandle, setIgHandle] = useState(() => loadFromStorage('igHandle', '@Hotel_mpv'));
  const [autoPublish, setAutoPublish] = useState(() => loadFromStorage('autoPublish', false));

  // Auto-save all state to localStorage
  useEffect(() => { saveToStorage('view', view); }, [view]);
  useEffect(() => { saveToStorage('campaigns', campaigns); }, [campaigns]);
  useEffect(() => { saveToStorage('activeCampaign', activeCampaign); }, [activeCampaign]);
  useEffect(() => { saveToStorage('chatMessages', chatMessages); }, [chatMessages]);
  useEffect(() => { saveToStorage('chatInput', chatInput); }, [chatInput]);
  useEffect(() => { saveToStorage('selectedModel', selectedModel); }, [selectedModel]);
  useEffect(() => { saveToStorage('publishTime', publishTime); }, [publishTime]);
  useEffect(() => { saveToStorage('igHandle', igHandle); }, [igHandle]);
  useEffect(() => { saveToStorage('autoPublish', autoPublish); }, [autoPublish]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  async function sendMessage() {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg: ChatMessage = { role: 'user', content: chatInput.trim() };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/pipeline/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...chatMessages, userMsg],
          model: selectedModel,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setChatMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.reply },
        ]);

        if (data.campaign) {
          setActiveCampaign(data.campaign);
          setCampaigns((prev) => [...prev, data.campaign]);
        }
      } else {
        setChatMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'Hubo un error al procesar tu mensaje. Verifica que tu API key esté configurada en Claves IA.',
          },
        ]);
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Error de conexión. Intenta de nuevo.' },
      ]);
    }
    setChatLoading(false);
  }

  function formatCampaignFolder(name: string, startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return `${name.replace(/\s+/g, '_')}_${fmt(start)}_al_${fmt(end)}`;
  }

  return (
    <div>
      {/* Sub-navigation */}
      <div className="row mb-6" style={{ gap: 8 }}>
        <button
          className={view === 'campaigns' ? 'primary' : 'ghost'}
          onClick={() => setView('campaigns')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 13 }}
        >
          <FolderOpen size={14} /> Mis campañas
        </button>
        <button
          className={view === 'planner' ? 'primary' : 'ghost'}
          onClick={() => setView('planner')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 13 }}
        >
          <Sparkles size={14} /> Planear contenido
        </button>
        <button
          className={view === 'calendar' ? 'primary' : 'ghost'}
          onClick={() => setView('calendar')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 13 }}
        >
          <Calendar size={14} /> Calendario
        </button>
        <div style={{ flex: 1 }} />
        <button
          className="ghost"
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 13 }}
          onClick={() => setView('campaigns')}
        >
          <Settings size={14} /> Configurar IG
        </button>
      </div>

      {/* ============ VIEW: CAMPAIGNS ============ */}
      {view === 'campaigns' && (
        <div>
          {campaigns.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '64px 32px' }}>
              <Instagram size={48} style={{ color: 'var(--rai-gold)', marginBottom: 16, opacity: 0.6 }} />
              <h3 style={{ fontWeight: 600, marginBottom: 8 }}>Aún no tienes campañas de contenido</h3>
              <p className="muted" style={{ fontSize: 14, marginBottom: 24, maxWidth: 480, margin: '0 auto 24px' }}>
                Planea 30 días de contenido para Instagram en una sola sesión. La IA te guía paso a paso:
                define tu marca, elige pilares, genera hooks, captions y visuales. Todo automático.
              </p>
              <button className="primary" onClick={() => setView('planner')} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={16} /> Planear mi primer mes de contenido
              </button>
            </div>
          ) : (
            <div className="grid" style={{ gap: 16 }}>
              <div className="row-between mb-4">
                <h3 style={{ fontWeight: 600 }}>Campañas de contenido</h3>
                <button className="primary" onClick={() => setView('planner')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Sparkles size={14} /> Nueva campaña
                </button>
              </div>
              {campaigns.map((campaign) => (
                <div key={campaign.id} className="card" style={{ cursor: 'pointer' }} onClick={() => { setActiveCampaign(campaign); setView('calendar'); }}>
                  <div className="row-between">
                    <div>
                      <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Instagram size={16} style={{ color: 'var(--rai-gold)' }} />
                        {campaign.name}
                      </div>
                      <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                        {campaign.startDate} → {campaign.endDate} · {campaign.totalPieces} piezas · Modelo: {campaign.model}
                      </p>
                      <p className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                        Carpeta: <code style={{ fontSize: 11, background: 'rgba(0,0,0,0.04)', padding: '2px 6px', borderRadius: 4 }}>{campaign.folderName}</code>
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--rai-gold)' }}>
                          {campaign.published}/{campaign.totalPieces}
                        </div>
                        <div className="muted" style={{ fontSize: 11 }}>publicados</div>
                      </div>
                      <ChevronRight size={20} style={{ color: 'var(--rai-muted)' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* IG Config section */}
          <div className="card mt-6" style={{ maxWidth: 600 }}>
            <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <Settings size={15} /> Configuración de Instagram
            </div>
            <div className="grid" style={{ gap: 12 }}>
              <div>
                <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Handle de Instagram</label>
                <input
                  className="input"
                  placeholder="@tu_cuenta"
                  value={igHandle}
                  onChange={(e) => setIgHandle(e.target.value)}
                />
              </div>
              <div>
                <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Hora de publicación por defecto</label>
                <input
                  className="input"
                  type="time"
                  value={publishTime}
                  onChange={(e) => setPublishTime(e.target.value)}
                />
              </div>
              <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={autoPublish}
                  onChange={(e) => setAutoPublish(e.target.checked)}
                  id="auto-publish"
                />
                <label htmlFor="auto-publish" className="muted" style={{ fontSize: 13 }}>
                  Publicación automática vía API de Instagram (requiere token configurado)
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ VIEW: PLANNER (AI Chat) ============ */}
      {view === 'planner' && (
        <div className="grid" style={{ gridTemplateColumns: '1fr 320px', gap: 16, minHeight: 500 }}>
          {/* Chat area */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--rai-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <MessageSquare size={16} style={{ color: 'var(--rai-gold)' }} />
              <span style={{ fontWeight: 600, fontSize: 14 }}>Planificador de contenido IG</span>
              <div style={{ flex: 1 }} />
              <select
                className="input"
                style={{ width: 'auto', maxWidth: 200, fontSize: 12, padding: '4px 8px' }}
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
              >
                {AVAILABLE_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label} ({m.provider})
                  </option>
                ))}
              </select>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    padding: '10px 14px',
                    borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: msg.role === 'user' ? 'var(--rai-gold)' : 'rgba(0,0,0,0.04)',
                    color: msg.role === 'user' ? '#0A0A0F' : 'inherit',
                    fontSize: 14,
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {msg.content}
                </div>
              ))}
              {chatLoading && (
                <div style={{ alignSelf: 'flex-start', padding: '10px 14px', borderRadius: '16px 16px 16px 4px', background: 'rgba(0,0,0,0.04)' }}>
                  <Loader2 className="animate-spin" size={16} style={{ color: 'var(--rai-gold)' }} />
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--rai-border)', display: 'flex', gap: 8 }}>
              <input
                className="input"
                style={{ flex: 1 }}
                placeholder="Describe tu negocio, tu audiencia, tus servicios..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                disabled={chatLoading}
              />
              <button className="primary" onClick={sendMessage} disabled={chatLoading || !chatInput.trim()}>
                <Send size={16} />
              </button>
            </div>
          </div>

          {/* Side panel - Plan preview */}
          <div className="card" style={{ overflow: 'auto' }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={15} style={{ color: 'var(--rai-gold)' }} />
              Vista previa del plan
            </div>

            {activeCampaign ? (
              <div>
                <div style={{ fontSize: 12, marginBottom: 8 }}>
                  <strong>Carpeta:</strong>{' '}
                  <code style={{ fontSize: 11, background: 'rgba(0,0,0,0.04)', padding: '2px 6px', borderRadius: 4 }}>
                    {activeCampaign.folderName}
                  </code>
                </div>
                <div style={{ fontSize: 12, marginBottom: 12 }}>
                  <strong>Período:</strong> {activeCampaign.startDate} → {activeCampaign.endDate}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {activeCampaign.days.map((day) => (
                    <div
                      key={day.day}
                      style={{
                        padding: '6px 8px',
                        borderRadius: 6,
                        background: 'rgba(0,0,0,0.03)',
                        border: '1px solid var(--rai-border)',
                        fontSize: 12,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <span style={{ width: 24, fontWeight: 700, color: 'var(--rai-muted)' }}>
                        {String(day.day).padStart(2, '0')}
                      </span>
                      <span style={{ color: PILLAR_COLORS[day.pillar] || 'var(--rai-muted)', fontWeight: 600, width: 22 }}>
                        {day.pillar}
                      </span>
                      {CONTENT_TYPE_ICONS[day.type]}
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {day.hook}
                      </span>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[day.status], flexShrink: 0 }} />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                <Calendar size={32} style={{ color: 'var(--rai-muted)', marginBottom: 8, opacity: 0.4 }} />
                <p className="muted" style={{ fontSize: 13 }}>
                  Chatea con la IA para planear tu contenido. El plan aparecerá aquí cuando esté listo.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============ VIEW: CALENDAR ============ */}
      {view === 'calendar' && (
        <div>
          {activeCampaign ? (
            <div>
              <div className="row-between mb-4">
                <div>
                  <h3 style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Instagram size={18} style={{ color: 'var(--rai-gold)' }} />
                    {activeCampaign.name}
                  </h3>
                  <p className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                    {activeCampaign.startDate} → {activeCampaign.endDate} ·{' '}
                    <code style={{ fontSize: 11 }}>{activeCampaign.folderName}</code>
                  </p>
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <button className="ghost" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                    <RefreshCw size={14} /> Regenerar día
                  </button>
                  <button className="primary" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                    <Play size={14} /> Publicar siguiente
                  </button>
                </div>
              </div>

              {/* Calendar grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                {activeCampaign.days.map((day) => (
                  <div
                    key={day.day}
                    className="card"
                    style={{
                      padding: '10px 12px',
                      cursor: 'pointer',
                      borderLeft: `3px solid ${PILLAR_COLORS[day.pillar] || 'var(--rai-border)'}`,
                      position: 'relative',
                    }}
                  >
                    <div className="row-between" style={{ marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>Día {day.day}</span>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[day.status] }} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--rai-muted)', marginBottom: 4 }}>
                      {day.date}
                    </div>
                    <div className="row" style={{ gap: 4, marginBottom: 4 }}>
                      <span style={{
                        fontSize: 10,
                        padding: '1px 6px',
                        borderRadius: 4,
                        background: PILLAR_COLORS[day.pillar] ? `${PILLAR_COLORS[day.pillar]}22` : 'rgba(0,0,0,0.04)',
                        color: PILLAR_COLORS[day.pillar] || 'var(--rai-muted)',
                        fontWeight: 600,
                      }}>
                        {day.pillar}
                      </span>
                      <span style={{
                        fontSize: 10,
                        padding: '1px 6px',
                        borderRadius: 4,
                        background: 'rgba(0,0,0,0.04)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                      }}>
                        {CONTENT_TYPE_ICONS[day.type]} {CONTENT_TYPE_LABELS[day.type]}
                      </span>
                    </div>
                    <p style={{ fontSize: 11, lineHeight: 1.3, color: 'var(--rai-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {day.hook}
                    </p>
                  </div>
                ))}
              </div>

              {/* Folder structure preview */}
              <div className="card mt-6" style={{ maxWidth: 500 }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FolderOpen size={15} style={{ color: 'var(--rai-gold)' }} />
                  Estructura de carpetas
                </div>
                <div style={{ fontSize: 11, lineHeight: 1.6, color: 'var(--rai-muted)', fontFamily: 'monospace', whiteSpace: 'pre' }}>
                  {[
                    `${activeCampaign.folderName}/`,
                    '├── brief.json',
                    '├── calendario.json',
                    '├── dia_01/',
                    '│   ├── imagen_01.png',
                    '│   ├── caption.txt',
                    '│   └── metadata.json',
                    '├── dia_02/',
                    '│   ├── imagen_01.png',
                    '│   └── metadata.json',
                    '├── ...',
                    '├── dia_30/',
                    '│   ├── imagen_01.png',
                    '│   └── metadata.json',
                    '└── assets/',
                    '    ├── logo.png',
                    '    ├── fotos_reales/',
                    '    └── plantillas/',
                  ].join('\n')}
                </div>
              </div>
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '64px 32px' }}>
              <Calendar size={48} style={{ color: 'var(--rai-muted)', marginBottom: 16, opacity: 0.4 }} />
              <h3 style={{ fontWeight: 600, marginBottom: 8 }}>Selecciona una campaña</h3>
              <p className="muted" style={{ fontSize: 14, marginBottom: 24 }}>
                Ve a "Mis campañas" para seleccionar una, o planea una nueva.
              </p>
              <button className="primary" onClick={() => setView('planner')} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={16} /> Planear contenido
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
