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
  Upload,
  FileText,
  Palette,
  Camera,
  Globe,
  Phone,
  MapPin,
  Trash2,
  X,
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

  // Brand & Business Config
  const [businessName, setBusinessName] = useState(() => loadFromStorage('businessName', ''));
  const [businessType, setBusinessType] = useState(() => loadFromStorage('businessType', ''));
  const [businessLocation, setBusinessLocation] = useState(() => loadFromStorage('businessLocation', ''));
  const [businessPhone, setBusinessPhone] = useState(() => loadFromStorage('businessPhone', ''));
  const [businessWhatsApp, setBusinessWhatsApp] = useState(() => loadFromStorage('businessWhatsApp', ''));
  const [businessWebsite, setBusinessWebsite] = useState(() => loadFromStorage('businessWebsite', ''));
  const [brandColors, setBrandColors] = useState(() => loadFromStorage('brandColors', ''));
  const [brandTone, setBrandTone] = useState(() => loadFromStorage('brandTone', 'amigable'));
  const [brandDocName, setBrandDocName] = useState(() => loadFromStorage('brandDocName', ''));
  const [brandDocContent, setBrandDocContent] = useState(() => loadFromStorage('brandDocContent', ''));
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>(() => loadFromStorage('uploadedPhotos', []));
  const [photoMode, setPhotoMode] = useState(() => loadFromStorage('photoMode', 'mixed'));
  const [logoMode, setLogoMode] = useState(() => loadFromStorage('logoMode', 'manual'));
  const [targetAudience, setTargetAudience] = useState(() => loadFromStorage('targetAudience', ''));
  const [services, setServices] = useState(() => loadFromStorage('services', ''));
  const [competitors, setCompetitors] = useState(() => loadFromStorage('competitors', ''));
  const [contentNotes, setContentNotes] = useState(() => loadFromStorage('contentNotes', ''));

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
  useEffect(() => { saveToStorage('businessName', businessName); }, [businessName]);
  useEffect(() => { saveToStorage('businessType', businessType); }, [businessType]);
  useEffect(() => { saveToStorage('businessLocation', businessLocation); }, [businessLocation]);
  useEffect(() => { saveToStorage('businessPhone', businessPhone); }, [businessPhone]);
  useEffect(() => { saveToStorage('businessWhatsApp', businessWhatsApp); }, [businessWhatsApp]);
  useEffect(() => { saveToStorage('businessWebsite', businessWebsite); }, [businessWebsite]);
  useEffect(() => { saveToStorage('brandColors', brandColors); }, [brandColors]);
  useEffect(() => { saveToStorage('brandTone', brandTone); }, [brandTone]);
  useEffect(() => { saveToStorage('brandDocName', brandDocName); }, [brandDocName]);
  useEffect(() => { saveToStorage('brandDocContent', brandDocContent); }, [brandDocContent]);
  useEffect(() => { saveToStorage('uploadedPhotos', uploadedPhotos); }, [uploadedPhotos]);
  useEffect(() => { saveToStorage('photoMode', photoMode); }, [photoMode]);
  useEffect(() => { saveToStorage('logoMode', logoMode); }, [logoMode]);
  useEffect(() => { saveToStorage('targetAudience', targetAudience); }, [targetAudience]);
  useEffect(() => { saveToStorage('services', services); }, [services]);
  useEffect(() => { saveToStorage('competitors', competitors); }, [competitors]);
  useEffect(() => { saveToStorage('contentNotes', contentNotes); }, [contentNotes]);

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
      const brandContext: Record<string, string> = {};
      if (businessName) brandContext.businessName = businessName;
      if (businessType) brandContext.businessType = businessType;
      if (businessLocation) brandContext.businessLocation = businessLocation;
      if (businessPhone) brandContext.businessPhone = businessPhone;
      if (businessWhatsApp) brandContext.businessWhatsApp = businessWhatsApp;
      if (businessWebsite) brandContext.businessWebsite = businessWebsite;
      if (igHandle) brandContext.igHandle = igHandle;
      if (brandColors) brandContext.brandColors = brandColors;
      if (brandTone) brandContext.brandTone = brandTone;
      if (services) brandContext.services = services;
      if (targetAudience) brandContext.targetAudience = targetAudience;
      if (competitors) brandContext.competitors = competitors;
      if (contentNotes) brandContext.contentNotes = contentNotes;
      if (photoMode) brandContext.photoMode = photoMode;
      if (logoMode) brandContext.logoMode = logoMode;
      if (uploadedPhotos.length > 0) brandContext.availablePhotos = uploadedPhotos.join(', ');
      if (brandDocContent) brandContext.brandDocument = brandDocContent.slice(0, 30000);

      const res = await fetch('/api/pipeline/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...chatMessages, userMsg],
          model: selectedModel,
          brandContext: Object.keys(brandContext).length > 0 ? brandContext : undefined,
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

          {/* ===== CONFIGURACIÓN COMPLETA ===== */}
          <div style={{ display: 'grid', gap: 16, maxWidth: 800, marginTop: 24 }}>

            {/* --- Datos del Negocio --- */}
            <div className="card">
              <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, fontSize: 15 }}>
                <MapPin size={16} style={{ color: 'var(--rai-gold)' }} /> Datos del Negocio
              </div>
              <p className="muted" style={{ fontSize: 12, marginBottom: 12 }}>Esta información se inyecta automáticamente al planificador IA para generar contenido preciso.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Nombre del negocio</label>
                  <input className="input" placeholder="Hotel Muévete por Vargas" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
                </div>
                <div>
                  <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Tipo de negocio</label>
                  <input className="input" placeholder="Hotel, Restaurante, Tienda..." value={businessType} onChange={(e) => setBusinessType(e.target.value)} />
                </div>
                <div>
                  <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Ubicación</label>
                  <input className="input" placeholder="Maiquetía, Venezuela" value={businessLocation} onChange={(e) => setBusinessLocation(e.target.value)} />
                </div>
                <div>
                  <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Sitio web</label>
                  <input className="input" placeholder="www.ejemplo.com" value={businessWebsite} onChange={(e) => setBusinessWebsite(e.target.value)} />
                </div>
                <div>
                  <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Teléfono</label>
                  <input className="input" placeholder="(0212) 351.03.03" value={businessPhone} onChange={(e) => setBusinessPhone(e.target.value)} />
                </div>
                <div>
                  <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>WhatsApp</label>
                  <input className="input" placeholder="584241292814" value={businessWhatsApp} onChange={(e) => setBusinessWhatsApp(e.target.value)} />
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Servicios / Productos principales</label>
                <textarea className="input" rows={3} placeholder="Ej: 6 tipos de habitación, WiFi, AC, traslado aeropuerto incluido, piscina, restaurante..." value={services} onChange={(e) => setServices(e.target.value)} style={{ resize: 'vertical', width: '100%' }} />
              </div>
              <div style={{ marginTop: 12 }}>
                <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Cliente ideal / Público objetivo</label>
                <textarea className="input" rows={2} placeholder="Ej: Viajeros 25-55 años, familias, parejas, viajeros de negocios que buscan hotel cerca del aeropuerto..." value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} style={{ resize: 'vertical', width: '100%' }} />
              </div>
              <div style={{ marginTop: 12 }}>
                <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Competidores principales (opcional)</label>
                <input className="input" placeholder="@competidor1, @competidor2..." value={competitors} onChange={(e) => setCompetitors(e.target.value)} />
              </div>
            </div>

            {/* --- Marca y Estilo --- */}
            <div className="card">
              <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, fontSize: 15 }}>
                <Palette size={16} style={{ color: 'var(--rai-purple)' }} /> Marca y Estilo Visual
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Colores de marca</label>
                  <input className="input" placeholder="Azul oscuro, dorado, blanco..." value={brandColors} onChange={(e) => setBrandColors(e.target.value)} />
                </div>
                <div>
                  <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Tono de comunicación</label>
                  <select className="input" value={brandTone} onChange={(e) => setBrandTone(e.target.value)}>
                    <option value="amigable">Amigable y cercano</option>
                    <option value="profesional">Profesional y elegante</option>
                    <option value="divertido">Divertido y casual</option>
                    <option value="inspiracional">Inspiracional y motivador</option>
                    <option value="informativo">Informativo y educativo</option>
                    <option value="lujoso">Lujoso y exclusivo</option>
                  </select>
                </div>
              </div>

              {/* Brand Document Upload */}
              <div style={{ marginTop: 16, padding: 16, border: '1px dashed var(--rai-border)', borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <FileText size={16} style={{ color: 'var(--rai-gold)' }} />
                  <span style={{ fontWeight: 600, fontSize: 14 }}>Manual de Marca / Documento de referencia</span>
                </div>
                <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
                  Sube un PDF, TXT o pega el contenido de tu manual de marca, brief, guía de estilo o cualquier documento informativo. El planificador IA lo usará como contexto para generar contenido alineado a tu marca.
                </p>
                {brandDocName ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--rai-bg-secondary)', borderRadius: 6 }}>
                    <FileText size={14} style={{ color: 'var(--rai-success)' }} />
                    <span style={{ fontSize: 13, flex: 1 }}>{brandDocName}</span>
                    <span className="muted" style={{ fontSize: 11 }}>{(brandDocContent.length / 1024).toFixed(1)}KB</span>
                    <button onClick={() => { setBrandDocName(''); setBrandDocContent(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                      <X size={14} style={{ color: 'var(--rai-error)' }} />
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--rai-bg-secondary)', borderRadius: 6, cursor: 'pointer', fontSize: 13, border: '1px solid var(--rai-border)' }}>
                      <Upload size={14} /> Subir archivo
                      <input type="file" accept=".pdf,.txt,.md,.doc,.docx" style={{ display: 'none' }} onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setBrandDocName(file.name);
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          const text = ev.target?.result as string;
                          setBrandDocContent(text.slice(0, 50000));
                        };
                        reader.readAsText(file);
                      }} />
                    </label>
                  </div>
                )}
                <div style={{ marginTop: 10 }}>
                  <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>O pega el contenido directamente:</label>
                  <textarea className="input" rows={4} placeholder="Pega aquí tu manual de marca, brief del negocio, guía de estilo, información de servicios, precios, horarios, políticas..." value={brandDocContent} onChange={(e) => { setBrandDocContent(e.target.value); if (!brandDocName && e.target.value.length > 0) setBrandDocName('Documento pegado'); }} style={{ resize: 'vertical', width: '100%', fontSize: 12 }} />
                </div>
              </div>
            </div>

            {/* --- Fotos y Assets --- */}
            <div className="card">
              <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, fontSize: 15 }}>
                <Camera size={16} style={{ color: 'var(--rai-success)' }} /> Fotos y Assets
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Modo de imágenes</label>
                  <select className="input" value={photoMode} onChange={(e) => setPhotoMode(e.target.value)}>
                    <option value="real">Solo fotos reales del negocio</option>
                    <option value="ai">Solo imágenes generadas por IA</option>
                    <option value="mixed">Mixto: reales + IA según el post</option>
                  </select>
                </div>
                <div>
                  <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Logo en imágenes</label>
                  <select className="input" value={logoMode} onChange={(e) => setLogoMode(e.target.value)}>
                    <option value="manual">Manual (Canva u otro editor)</option>
                    <option value="auto">Automático (IA + verificación QA)</option>
                    <option value="none">Sin logo en posts</option>
                  </select>
                </div>
              </div>

              {/* Photo upload area */}
              <div style={{ padding: 16, border: '1px dashed var(--rai-border)', borderRadius: 8 }}>
                <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
                  Sube fotos reales de tu negocio. El IA las referenciará por nombre al planificar contenido. Usa nombres descriptivos (ej: suite-principal-01.jpg, piscina-dia.jpg, fachada-noche.jpg).
                </p>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--rai-bg-secondary)', borderRadius: 6, cursor: 'pointer', fontSize: 13, border: '1px solid var(--rai-border)' }}>
                  <Upload size={14} /> Subir fotos
                  <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={(e) => {
                    const files = e.target.files;
                    if (!files) return;
                    const names = Array.from(files).map(f => f.name);
                    setUploadedPhotos(prev => [...prev, ...names.filter(n => !prev.includes(n))]);
                  }} />
                </label>
                {uploadedPhotos.length > 0 && (
                  <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {uploadedPhotos.map((name, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: 'var(--rai-bg-secondary)', borderRadius: 4, fontSize: 12 }}>
                        <ImageIcon size={12} />
                        <span>{name}</span>
                        <button onClick={() => setUploadedPhotos(prev => prev.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                          <X size={12} style={{ color: 'var(--rai-error)' }} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* --- Config de Instagram --- */}
            <div className="card">
              <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, fontSize: 15 }}>
                <Instagram size={16} style={{ color: '#E4405F' }} /> Configuración de Instagram
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Handle de Instagram</label>
                  <input className="input" placeholder="@tu_cuenta" value={igHandle} onChange={(e) => setIgHandle(e.target.value)} />
                </div>
                <div>
                  <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Hora de publicación por defecto</label>
                  <input className="input" type="time" value={publishTime} onChange={(e) => setPublishTime(e.target.value)} />
                </div>
              </div>
              <div className="row" style={{ gap: 8, alignItems: 'center', marginTop: 12 }}>
                <input type="checkbox" checked={autoPublish} onChange={(e) => setAutoPublish(e.target.checked)} id="auto-publish" />
                <label htmlFor="auto-publish" className="muted" style={{ fontSize: 13 }}>
                  Publicación automática vía API de Instagram (requiere token configurado)
                </label>
              </div>
            </div>

            {/* --- Notas adicionales --- */}
            <div className="card">
              <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, fontSize: 15 }}>
                <FileText size={16} style={{ color: 'var(--rai-muted)' }} /> Notas y contexto adicional
              </div>
              <textarea className="input" rows={3} placeholder="Cualquier información extra para el planificador: promociones actuales, eventos próximos, temporada alta, restricciones de contenido, cosas que NO mencionar..." value={contentNotes} onChange={(e) => setContentNotes(e.target.value)} style={{ resize: 'vertical', width: '100%' }} />
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
