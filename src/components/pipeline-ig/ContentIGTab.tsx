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
  AlertCircle,
  Sparkles,
  Settings,
  Play,
  RefreshCw,
  Upload,
  FileText,
  Palette,
  Camera,
  MapPin,
  Trash2,
  X,
  Check,
  ArrowRight,
} from 'lucide-react';
import { EMPTY_CONFIG, type ContentPlannerConfig } from '@/lib/content-planner-config';
import { apiFetch } from '@/lib/client-api';
import { useContentPlannerSync } from './useContentPlannerSync';

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

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  generated: 'Generado',
  approved: 'Aprobado',
  published: 'Publicado',
  failed: 'Fallido',
};

const CFG_SECTION_IDS = ['cfg-negocio', 'cfg-marca', 'cfg-fotos', 'cfg-instagram', 'cfg-reglas', 'cfg-notas'];

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

function renderRich(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.length > 4 && part.startsWith('**') && part.endsWith('**')
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : <React.Fragment key={i}>{part}</React.Fragment>,
  );
}

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    // Volver al valor inicial si el contenido guardado no es JSON válido.
    return fallback;
  }
}

function saveToStorage(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {
    // El guardado es opcional y puede fallar si el almacenamiento está bloqueado o lleno.
  }
}

export default function ContentIGTab() {
  const [view, setView] = useState<'campaigns' | 'planner' | 'calendar' | 'config'>(() => loadFromStorage('view', 'campaigns'));
  const [campaigns, setCampaigns] = useState<Campaign[]>(() => loadFromStorage('campaigns', []));
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(() => loadFromStorage('activeCampaign', null));
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => loadFromStorage('chatMessages', [DEFAULT_WELCOME]));
  const [chatInput, setChatInput] = useState(() => loadFromStorage('chatInput', ''));
  const [chatLoading, setChatLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(() => loadFromStorage('selectedModel', 'gemini-2.5-flash'));
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [publishTime, setPublishTime] = useState<string>(EMPTY_CONFIG.publishTime);
  const [igHandle, setIgHandle] = useState<string>(EMPTY_CONFIG.igHandle);
  const [timezone, setTimezone] = useState<string>(EMPTY_CONFIG.timezone);
  const [autoPublish, setAutoPublish] = useState<boolean>(EMPTY_CONFIG.autoPublish);

  // Brand & Business Config
  const [businessName, setBusinessName] = useState<string>(EMPTY_CONFIG.businessName);
  const [businessType, setBusinessType] = useState<string>(EMPTY_CONFIG.businessType);
  const [businessLocation, setBusinessLocation] = useState<string>(EMPTY_CONFIG.businessLocation);
  const [businessPhone, setBusinessPhone] = useState<string>(EMPTY_CONFIG.businessPhone);
  const [businessWhatsApp, setBusinessWhatsApp] = useState<string>(EMPTY_CONFIG.businessWhatsApp);
  const [businessWebsite, setBusinessWebsite] = useState<string>(EMPTY_CONFIG.businessWebsite);
  const [brandColors, setBrandColors] = useState<string>(EMPTY_CONFIG.brandColors);
  const [brandTone, setBrandTone] = useState<string>(EMPTY_CONFIG.brandTone);
  const [brandDocName, setBrandDocName] = useState<string>(EMPTY_CONFIG.brandDocName);
  const [brandDocContent, setBrandDocContent] = useState<string>(EMPTY_CONFIG.brandDocContent);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>(() => loadFromStorage('uploadedPhotos', []));
  const [photoMode, setPhotoMode] = useState<string>(EMPTY_CONFIG.photoMode);
  const [logoMode, setLogoMode] = useState<string>(EMPTY_CONFIG.logoMode);
  const [targetAudience, setTargetAudience] = useState<string>(EMPTY_CONFIG.targetAudience);
  const [services, setServices] = useState<string>(EMPTY_CONFIG.services);
  const [competitors, setCompetitors] = useState<string>(EMPTY_CONFIG.competitors);
  const [contentNotes, setContentNotes] = useState<string>(EMPTY_CONFIG.contentNotes);

  // Brand Language Rules
  interface BrandRule { forbidden: string; replacement: string; reason: string; }
  const [brandRules, setBrandRules] = useState<BrandRule[]>(EMPTY_CONFIG.brandRules);
  const [newForbidden, setNewForbidden] = useState('');
  const [newReplacement, setNewReplacement] = useState('');
  const [newReason, setNewReason] = useState('');

  // Auto-save all state to localStorage
  useEffect(() => { saveToStorage('view', view); }, [view]);
  useEffect(() => { saveToStorage('campaigns', campaigns); }, [campaigns]);
  useEffect(() => { saveToStorage('activeCampaign', activeCampaign); }, [activeCampaign]);
  useEffect(() => { saveToStorage('chatMessages', chatMessages); }, [chatMessages]);
  useEffect(() => { saveToStorage('chatInput', chatInput); }, [chatInput]);
  useEffect(() => { saveToStorage('selectedModel', selectedModel); }, [selectedModel]);
  useEffect(() => { saveToStorage('uploadedPhotos', uploadedPhotos); }, [uploadedPhotos]);

  // Estado de conexión de Instagram (solo lectura; sin secretos).
  const [metaState, setMetaState] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');
  useEffect(() => {
    let cancelled = false;
    apiFetch('/api/workspace/meta')
      .then(async (res) => {
        if (!res.ok) return; // sin permiso o sin datos: queda "sin datos"
        const v = (await res.json()) as { isConnected?: boolean; igBusinessId?: string | null };
        if (!cancelled) setMetaState(v.isConnected && v.igBusinessId ? 'connected' : 'disconnected');
      })
      .catch(() => { /* indicador opcional */ });
    return () => { cancelled = true; };
  }, []);
  const timezoneOptions = React.useMemo(() => {
    let all: string[] = [];
    try {
      all = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.('timeZone') ?? [];
    } catch { /* navegador sin soporte */ }
    return Array.from(new Set([...(all.length ? all : ['UTC']), timezone]));
  }, [timezone]);

  // Config del planificador: vive en la BD de la empresa (no en localStorage).
  const plannerConfig: ContentPlannerConfig = {
    igHandle, publishTime, timezone, autoPublish,
    businessName, businessType, businessLocation, businessPhone, businessWhatsApp, businessWebsite,
    brandColors, brandTone, brandDocName, brandDocContent, photoMode, logoMode,
    targetAudience, services, competitors, contentNotes, brandRules,
  };
  const { status: syncStatus, ready: configReady, saveNow } = useContentPlannerSync(plannerConfig, (c) => {
    setIgHandle(c.igHandle); setPublishTime(c.publishTime); setTimezone(c.timezone); setAutoPublish(c.autoPublish);
    setBusinessName(c.businessName); setBusinessType(c.businessType); setBusinessLocation(c.businessLocation);
    setBusinessPhone(c.businessPhone); setBusinessWhatsApp(c.businessWhatsApp); setBusinessWebsite(c.businessWebsite);
    setBrandColors(c.brandColors); setBrandTone(c.brandTone); setBrandDocName(c.brandDocName);
    setBrandDocContent(c.brandDocContent); setPhotoMode(c.photoMode); setLogoMode(c.logoMode);
    setTargetAudience(c.targetAudience); setServices(c.services); setCompetitors(c.competitors);
    setContentNotes(c.contentNotes); setBrandRules(c.brandRules);
  });
  const syncLabel =
    syncStatus === 'loading' ? 'Cargando configuración…'
    : syncStatus === 'saving' ? 'Guardando…'
    : syncStatus === 'saved' ? 'Guardado'
    : syncStatus === 'error' ? 'No se pudo guardar. Revisa tu conexión o permisos.'
    : 'Cambios se guardan solos';

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
      if (brandRules.length > 0) brandContext.brandRules = brandRules.map(r => `"${r.forbidden}" → "${r.replacement}" (${r.reason})`).join('; ');

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

  const cfgSections = [
    { id: 'cfg-negocio', label: 'Negocio', done: !!(businessName.trim() && businessType.trim()), hint: 'Nombre y tipo' },
    { id: 'cfg-marca', label: 'Marca', done: !!(brandColors.trim() || brandDocContent.trim()), hint: 'Colores o manual' },
    { id: 'cfg-fotos', label: 'Fotos', done: photoMode === 'ai' || uploadedPhotos.length > 0, hint: 'Fotos o modo IA' },
    { id: 'cfg-instagram', label: 'Instagram', done: !!(igHandle.trim() && publishTime && timezone), hint: 'Cuenta, hora y zona' },
    { id: 'cfg-reglas', label: 'Reglas', done: brandRules.length > 0, hint: 'Opcional' },
    { id: 'cfg-notas', label: 'Notas', done: !!contentNotes.trim(), hint: 'Opcional' },
  ];
  const cfgRequired = cfgSections.filter((x) => !['cfg-reglas', 'cfg-notas'].includes(x.id));
  const cfgDone = cfgRequired.filter((x) => x.done).length;
  const cfgPct = Math.round((cfgDone / cfgRequired.length) * 100);
  const cfgComplete = cfgDone === cfgRequired.length;
  const [activeSection, setActiveSection] = useState<string>(CFG_SECTION_IDS[0]);
  useEffect(() => {
    if (view !== 'config' || typeof IntersectionObserver === 'undefined') return;
    const els = CFG_SECTION_IDS.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActiveSection(top.target.id);
      },
      { rootMargin: '-10% 0px -65% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [view, configReady]);
  const goSection = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div>
      {/* Sub-navigation */}
      <div className="rai-subnav" role="tablist" aria-label="Contenido de Instagram">
        {([
          ['campaigns', 'Mis campañas', FolderOpen],
          ['planner', 'Planear contenido', Sparkles],
          ['calendar', 'Calendario', Calendar],
          ['config', 'Marca y cuenta', Settings],
        ] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            role="tab"
            aria-selected={view === key}
            className={`rai-subnav-btn ${view === key ? 'is-on' : ''}`}
            onClick={() => setView(key)}
          >
            <Icon size={15} /> <span>{label}</span>
            {key === 'config' && !cfgComplete && <span className="rai-dot" aria-label="Configuración pendiente" />}
          </button>
        ))}
      </div>

      {/* ============ VIEW: CAMPAIGNS ============ */}
      {view === 'campaigns' && (
        <div>
          {!cfgComplete && configReady && (
            <div className="rai-banner">
              <div>
                <strong>Completa tu configuración</strong>
                <span> — {cfgDone} de {cfgRequired.length} secciones listas. Con tu marca lista, la IA planea contenido mucho más preciso.</span>
              </div>
              <button className="rai-banner-btn" onClick={() => setView('config')}>Configurar <ArrowRight size={14} /></button>
            </div>
          )}
          {campaigns.length === 0 ? (
            <div className="card rai-empty" style={{ textAlign: 'center', padding: '56px 32px' }}>
              <div className="rai-halo"><Instagram size={30} /></div>
              <h3 style={{ fontWeight: 700, fontSize: 22, marginBottom: 8 }}>Aún no tienes campañas de contenido</h3>
              <p className="muted" style={{ fontSize: 14, marginBottom: 24, maxWidth: 480, margin: '0 auto 24px' }}>
                Planea 30 días de contenido para Instagram en una sola sesión. La IA te guía paso a paso:
                define tu marca, elige pilares, genera hooks, captions y visuales. Todo automático.
              </p>
              <div className="rai-steps">
                <div className="rai-step"><span className="rai-step-n">1</span><div><strong>Configura</strong><p>Marca, tono y tu cuenta de Instagram.</p></div></div>
                <div className="rai-step"><span className="rai-step-n">2</span><div><strong>Planea</strong><p>La IA arma hasta 30 días de piezas.</p></div></div>
                <div className="rai-step"><span className="rai-step-n">3</span><div><strong>Programa</strong><p>Revisas el calendario y el CRM publica.</p></div></div>
              </div>
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
        </div>
      )}

      {/* ============ VIEW: CONFIG ============ */}
      {view === 'config' && (
        <div className="rai-cfg">
          <div className="rai-cfg-head card">
            <div className="rai-cfg-head-main">
              <div className="rai-cfg-head-title">Configuración de contenido</div>
              <div className="muted" style={{ fontSize: 13 }}>
                Lo que defines aquí alimenta a la IA y a la publicación diaria. Se guarda solo.
              </div>
              <div className="rai-cfg-count">{cfgDone} de {cfgRequired.length} secciones esenciales listas</div>
            </div>
            <div className="rai-cfg-head-side">
              <div className="rai-ring" role="progressbar" aria-valuenow={cfgPct} aria-valuemin={0} aria-valuemax={100} aria-label="Avance de configuración" style={{ '--p': cfgPct } as React.CSSProperties}>
                <span>{cfgPct}%</span>
              </div>
              <div className={`rai-sync-pill ${syncStatus === 'error' ? 'is-error' : ''}`} role="status" aria-live="polite">{syncLabel}</div>
            </div>
          </div>

          <div className="rai-cfg-layout">
            <nav className="rai-cfg-nav" aria-label="Secciones">
              {cfgSections.map((x) => (
                <button key={x.id} type="button" className={`rai-cfg-link ${x.done ? 'is-done' : ''} ${activeSection === x.id ? 'is-active' : ''}`} onClick={() => goSection(x.id)}>
                  <span className="rai-cfg-check">{x.done ? <Check size={12} /> : null}</span>
                  <span className="rai-cfg-link-text"><strong>{x.label}</strong><small>{x.hint}</small></span>
                </button>
              ))}
            </nav>
            <div className="rai-cfg-body" style={{ opacity: configReady ? 1 : 0.55, pointerEvents: configReady ? 'auto' : 'none' }}>
            {/* --- Datos del Negocio --- */}
            <div id="cfg-negocio" className="card rai-cfg-card">
              <div className="rai-cfg-title">
                <MapPin size={16} style={{ color: 'var(--rai-gold)' }} /> Datos del Negocio
              </div>
              <p className="muted" style={{ fontSize: 12, marginBottom: 12 }}>Esta información se inyecta automáticamente al planificador IA para generar contenido preciso.</p>
              <div className="rai-fields">
                <div>
                  <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Nombre del negocio</label>
                  <input className="input" placeholder="Nombre de tu empresa" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
                </div>
                <div>
                  <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Tipo de negocio</label>
                  <input className="input" placeholder="Restaurante, Hotel, Tienda, Clínica…" value={businessType} onChange={(e) => setBusinessType(e.target.value)} />
                </div>
                <div>
                  <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Ubicación</label>
                  <input className="input" placeholder="Ciudad, País" value={businessLocation} onChange={(e) => setBusinessLocation(e.target.value)} />
                </div>
                <div>
                  <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Sitio web</label>
                  <input className="input" placeholder="www.ejemplo.com" value={businessWebsite} onChange={(e) => setBusinessWebsite(e.target.value)} />
                </div>
                <div>
                  <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Teléfono</label>
                  <input className="input" placeholder="+58 212 000 0000" value={businessPhone} onChange={(e) => setBusinessPhone(e.target.value)} />
                </div>
                <div>
                  <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>WhatsApp</label>
                  <input className="input" placeholder="+58 412 000 0000" value={businessWhatsApp} onChange={(e) => setBusinessWhatsApp(e.target.value)} />
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Servicios / Productos principales</label>
                <textarea className="input" rows={3} placeholder="Ej: lista de productos o servicios principales, qué incluye cada uno, qué los diferencia…" value={services} onChange={(e) => setServices(e.target.value)} style={{ resize: 'vertical', width: '100%' }} />
              </div>
              <div style={{ marginTop: 12 }}>
                <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Cliente ideal / Público objetivo</label>
                <textarea className="input" rows={2} placeholder="Ej: edad, intereses, ciudad, qué problema resuelves para ellos…" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} style={{ resize: 'vertical', width: '100%' }} />
              </div>
              <div style={{ marginTop: 12 }}>
                <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Competidores principales (opcional)</label>
                <input className="input" placeholder="@competidor1, @competidor2..." value={competitors} onChange={(e) => setCompetitors(e.target.value)} />
              </div>
            </div>

            {/* --- Marca y Estilo --- */}
            <div id="cfg-marca" className="card rai-cfg-card">
              <div className="rai-cfg-title">
                <Palette size={16} style={{ color: 'var(--rai-purple)' }} /> Marca y Estilo Visual
              </div>
              <div className="rai-fields">
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
            <div id="cfg-fotos" className="card rai-cfg-card">
              <div className="rai-cfg-title">
                <Camera size={16} style={{ color: 'var(--rai-success)' }} /> Fotos y Assets
              </div>
              <div className="rai-fields" style={{ marginBottom: 16 }}>
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
            <div id="cfg-instagram" className="card rai-cfg-card">
              <div className="rai-cfg-title">
                <Instagram size={16} style={{ color: '#E4405F' }} /> Configuración de Instagram
                <span className={`rai-conn-chip ${metaState === 'connected' ? 'is-ok' : ''}`}>
                  {metaState === 'connected' ? 'Instagram conectado' : metaState === 'disconnected' ? 'Instagram sin conectar' : 'Conexión: sin datos'}
                </span>
              </div>
              <div className="rai-fields rai-fields-3">
                <div>
                  <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Cuenta de Instagram</label>
                  <input className="input" placeholder="@tu_cuenta" value={igHandle} onChange={(e) => setIgHandle(e.target.value)} />
                </div>
                <div>
                  <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Hora de publicación por defecto</label>
                  <input className="input" type="time" value={publishTime} onChange={(e) => setPublishTime(e.target.value)} />
                </div>
                <div>
                  <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Zona horaria</label>
                  <select className="input" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                    {timezoneOptions.map((z) => <option key={z} value={z}>{z}</option>)}
                  </select>
                </div>
              </div>
              <div className="rai-switch-row">
                <button
                  type="button"
                  role="switch"
                  aria-checked={autoPublish}
                  aria-label="Publicación automática en Instagram"
                  disabled
                  className={`rai-switch ${autoPublish ? 'is-on' : ''}`}
                >
                  <span className="rai-switch-knob" />
                </button>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    Publicación automática en Instagram <span className="rai-soon-tag">Próximamente</span>
                  </div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                    Al activarla, el CRM publicará cada día lo que dejes programado, sin que tengas que entrar. Requiere conectar tu cuenta de Instagram Business.
                  </div>
                </div>
              </div>
            </div>

            {/* --- Reglas de Lenguaje de Marca --- */}
            <div id="cfg-reglas" className="card rai-cfg-card">
              <div className="rai-cfg-title">
                <AlertCircle size={16} style={{ color: '#ef4444' }} /> Reglas de Lenguaje de Marca
              </div>
              <p className="muted" style={{ fontSize: 12, marginBottom: 14 }}>
                Palabras prohibidas y sus reemplazos. El planificador IA evitará estas palabras y usará los reemplazos automáticamente.
              </p>

              {/* Existing rules */}
              {brandRules.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div className="rai-rule-row rai-rule-head">
                    <span className="muted" style={{ fontSize: 11, fontWeight: 600 }}>PROHIBIDA</span>
                    <span className="muted" style={{ fontSize: 11, fontWeight: 600 }}>USAR EN SU LUGAR</span>
                    <span className="muted" style={{ fontSize: 11, fontWeight: 600 }}>RAZÓN</span>
                    <span />
                  </div>
                  {brandRules.map((rule, i) => (
                    <div key={i} className="rai-rule-row rai-rule-item">
                      <span style={{ fontSize: 13, color: '#ef4444', fontWeight: 600, textDecoration: 'line-through' }}>{rule.forbidden}</span>
                      <span style={{ fontSize: 13, color: 'var(--rai-success)', fontWeight: 600 }}>{rule.replacement}</span>
                      <span className="muted" style={{ fontSize: 12 }}>{rule.reason}</span>
                      <button onClick={() => setBrandRules(prev => prev.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                        <Trash2 size={14} style={{ color: 'var(--rai-error)' }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new rule */}
              <div className="rai-rule-row rai-rule-add">
                <div>
                  <label className="muted" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>Palabra prohibida</label>
                  <input className="input" placeholder="barato" value={newForbidden} onChange={(e) => setNewForbidden(e.target.value)} style={{ fontSize: 13 }} />
                </div>
                <div>
                  <label className="muted" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>Reemplazo</label>
                  <input className="input" placeholder="accesible" value={newReplacement} onChange={(e) => setNewReplacement(e.target.value)} style={{ fontSize: 13 }} />
                </div>
                <div>
                  <label className="muted" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>Razón (opcional)</label>
                  <input className="input" placeholder="Suena a descuento, no a calidad" value={newReason} onChange={(e) => setNewReason(e.target.value)} style={{ fontSize: 13 }} />
                </div>
                <button
                  onClick={() => {
                    if (!newForbidden.trim() || !newReplacement.trim()) return;
                    setBrandRules(prev => [...prev, { forbidden: newForbidden.trim(), replacement: newReplacement.trim(), reason: newReason.trim() }]);
                    setNewForbidden(''); setNewReplacement(''); setNewReason('');
                  }}
                  style={{ padding: '8px 14px', background: 'var(--rai-purple)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}
                >
                  + Agregar
                </button>
              </div>
            </div>

            {/* --- Notas adicionales --- */}
            <div id="cfg-notas" className="card rai-cfg-card">
              <div className="rai-cfg-title">
                <FileText size={16} style={{ color: 'var(--rai-muted)' }} /> Notas y contexto adicional
              </div>
              <textarea className="input" rows={3} placeholder="Cualquier información extra para el planificador: promociones actuales, eventos próximos, temporada alta, restricciones de contenido, cosas que NO mencionar..." value={contentNotes} onChange={(e) => setContentNotes(e.target.value)} style={{ resize: 'vertical', width: '100%' }} />
            </div>
            </div>
          </div>

          <div className="rai-savebar">
            <div className="rai-savebar-info">
              <span className={`rai-sync-dot ${syncStatus === 'error' ? 'is-error' : ''}`} />
              <span>{syncLabel}</span>
            </div>
            <button className="rai-savebar-btn" onClick={async () => { await saveNow(); setView('planner'); }}>
              <Sparkles size={16} /> Guardar y planear contenido <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ============ VIEW: PLANNER (AI Chat) ============ */}
      {view === 'planner' && (
        <div className="rai-planner">
          {/* Chat area */}
          <div className="card rai-chat">
            <div className="rai-chat-head">
              <span className="rai-chat-ico"><MessageSquare size={16} /></span>
              <div className="rai-chat-title">
                <span>Planificador de contenido IG</span>
                <small><i className="rai-live" /> Asistente listo</small>
              </div>
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
            <div className="rai-chat-msgs">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`rai-msg ${msg.role === 'user' ? 'is-user' : 'is-ai'}`}>
                  {renderRich(msg.content)}
                </div>
              ))}
              {chatLoading && (
                <div className="rai-msg is-ai">
                  <Loader2 className="animate-spin" size={16} style={{ color: 'var(--rai-gold)' }} />
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="rai-chat-input">
              <input
                className="input"
                style={{ flex: 1 }}
                placeholder="Describe tu negocio, tu audiencia, tus servicios..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                disabled={chatLoading}
              />
              <button className="primary" aria-label="Enviar mensaje" onClick={sendMessage} disabled={chatLoading || !chatInput.trim()}>
                <Send size={16} />
              </button>
            </div>
          </div>

          {/* Side panel - Plan preview */}
          <div className="card rai-plan-side">
            <div className="rai-cfg-title" style={{ fontSize: 14 }}>
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
                    <div key={day.day} className="rai-plan-row" style={{ '--pc': PILLAR_COLORS[day.pillar] || 'var(--rai-muted)', '--sc': STATUS_COLORS[day.status] } as React.CSSProperties}>
                      <span className="rai-plan-n">{String(day.day).padStart(2, '0')}</span>
                      <span className="rai-plan-pillar">{day.pillar}</span>
                      {CONTENT_TYPE_ICONS[day.type]}
                      <span className="rai-plan-hook">{day.hook}</span>
                      <i className="rai-plan-dot" title={STATUS_LABELS[day.status]} />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rai-empty-mini">
                <Calendar size={30} />
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

              {/* Resumen */}
              <div className="rai-stats">
                {(['published', 'approved', 'generated', 'pending'] as const).map((st) => (
                  <div key={st} className="rai-stat" style={{ '--sc': STATUS_COLORS[st] } as React.CSSProperties}>
                    <strong>{activeCampaign.days.filter((d) => d.status === st).length}</strong>
                    <span><i />{STATUS_LABELS[st]}</span>
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="rai-cal-grid">
                {activeCampaign.days.map((day) => (
                  <div key={day.day} className="rai-day" style={{ '--pc': PILLAR_COLORS[day.pillar] || 'var(--rai-border)', '--sc': STATUS_COLORS[day.status] } as React.CSSProperties}>
                    <div className="rai-day-top">
                      <span className="rai-day-n">{String(day.day).padStart(2, '0')}</span>
                      <span className="rai-day-status"><i />{STATUS_LABELS[day.status]}</span>
                    </div>
                    <div className="rai-day-date">{day.date}</div>
                    <p className="rai-day-hook">{day.hook}</p>
                    <div className="rai-day-tags">
                      <span className="rai-tag rai-tag-pillar">{day.pillar}</span>
                      <span className="rai-tag">{CONTENT_TYPE_ICONS[day.type]} {CONTENT_TYPE_LABELS[day.type]}</span>
                    </div>
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
