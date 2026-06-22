'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Send,
  Sparkles,
  FolderSearch,
  Search,
  Bot,
  ChevronDown,
  Folder,
  X,
  Globe,
  Megaphone,
  FileText,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Spinner } from '@/components/ui/Spinner';
import { CostEstimate } from '@/components/campaign/CostEstimate';
import toast from 'react-hot-toast';

const PROVIDERS = [
  { provider: 'deepseek', label: 'DeepSeek (Barato)', models: ['deepseek-chat', 'deepseek-reasoner'] },
  { provider: 'anthropic', label: 'Claude', models: ['claude-sonnet-4-5', 'claude-opus-4-7'] },
  { provider: 'google', label: 'Gemini', models: ['gemini-2.5-pro', 'gemini-2.5-flash'] },
  { provider: 'openai', label: 'GPT-4', models: ['gpt-4o', 'gpt-4o-mini'] },
];

const PIPELINE_TYPES = [
  { value: 'ugc', label: 'UGC — Videos personaje + producto' },
  { value: 'avatar_reel', label: 'Avatar Reel — Reacción a noticias' },
  { value: 'static_ads', label: 'Anuncios Estáticos' },
  { value: 'carousel', label: 'Carruseles' },
];

const IMAGE_PROVIDERS = [
  { value: 'gemini', label: 'Gemini Imagen 3 (defecto)' },
  { value: 'openai', label: 'DALL-E 3 / gpt-image-1' },
  { value: 'stabilityai', label: 'Stability AI' },
];

const COUNTRY_OPTIONS = [
  { value: 'ALL', label: 'Todos los países' },
  { value: 'MX', label: 'México' },
  { value: 'US', label: 'Estados Unidos' },
  { value: 'ES', label: 'España' },
  { value: 'AR', label: 'Argentina' },
  { value: 'CO', label: 'Colombia' },
  { value: 'CL', label: 'Chile' },
  { value: 'PE', label: 'Perú' },
  { value: 'BR', label: 'Brasil' },
];

interface DayInventory {
  dayNumber: number;
  hasContent: boolean;
  existingAssets: Array<{ name: string; type: string }>;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface CompetitorInsights {
  painPoints: string[];
  opportunities: string[];
  toneAnalysis: string;
  rawSummary: string;
}

interface UploadedFile {
  name: string;
  sizeBytes: number;
  type: string;
  content?: string; // text content if readable
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function fileIcon(mime: string, name: string): string {
  if (mime.startsWith('image/')) return '🖼️';
  if (mime.startsWith('video/')) return '🎬';
  if (mime.startsWith('audio/')) return '🎵';
  if (name.endsWith('.zip') || name.endsWith('.rar')) return '📦';
  if (name.endsWith('.pdf')) return '📄';
  if (name.endsWith('.txt') || name.endsWith('.md')) return '📝';
  return '📎';
}

export default function NewCampaignPage() {
  const router = useRouter();

  // Form state
  const [name, setName] = useState('');
  const [pipelineType, setPipelineType] = useState('ugc');
  const [provider, setProvider] = useState('deepseek');
  const [modelId, setModelId] = useState('deepseek-chat');
  const [imageProvider, setImageProvider] = useState('gemini');
  const [brandInput, setBrandInput] = useState('');
  const [campaignId, setCampaignId] = useState<string | null>(null);

  // Inventory
  const [inventoryPath, setInventoryPath] = useState('');
  const [inventory, setInventory] = useState<DayInventory[]>([]);
  const [inventoryWarning, setInventoryWarning] = useState<string | null>(null);
  const [rootFilesCount, setRootFilesCount] = useState(0);
  const [scanningInventory, setScanningInventory] = useState(false);

  // Competitor analysis — dual mode
  const [competitorMode, setCompetitorMode] = useState<'urls' | 'ads-library'>('urls');
  const [competitorUrls, setCompetitorUrls] = useState('');
  const [competitorInsights, setCompetitorInsights] = useState<CompetitorInsights | null>(null);
  const [analyzingCompetitors, setAnalyzingCompetitors] = useState(false);

  // Ads Library
  const [adsLibraryBrand, setAdsLibraryBrand] = useState('');
  const [adsLibraryCountry, setAdsLibraryCountry] = useState('ALL');
  const [adsLibraryResult, setAdsLibraryResult] = useState<{
    adsFound: number;
    scrapedOk: boolean;
    htmlReport: string;
  } | null>(null);
  const [analyzingAdsLibrary, setAnalyzingAdsLibrary] = useState(false);

  // Chat
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const chatLogRef = useRef<HTMLDivElement>(null);

  // File upload
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cargar campaña existente
  const [loadingCampaign, setLoadingCampaign] = useState(false);
  const skipModelResetRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const existingId = params.get('id');
    if (!existingId) return;

    setLoadingCampaign(true);
    (async () => {
      try {
        const res = await fetch(`/api/campaigns/${existingId}`);
        if (!res.ok) {
          toast.error('No se pudo cargar la campaña existente.');
          return;
        }
        const data = await res.json();
        const campaign = data.campaign;
        if (!campaign) return;

        setCampaignId(campaign.id);
        setName(campaign.name || '');
        if (campaign.pipelineType) setPipelineType(campaign.pipelineType);
        if (campaign.llmProvider) {
          skipModelResetRef.current = true;
          setProvider(campaign.llmProvider);
        }
        if (campaign.llmModel) setModelId(campaign.llmModel);
        if (Array.isArray(campaign.chatHistory) && campaign.chatHistory.length > 0) {
          setMessages(campaign.chatHistory as ChatMessage[]);
        }
        const masterJson = campaign.masterJson as Record<string, unknown> | null;
        if (masterJson?.competitorInsights) {
          setCompetitorInsights(masterJson.competitorInsights as CompetitorInsights);
        }
        toast.success(`Continuando "${campaign.name}"`);
      } catch {
        toast.error('Error de red al cargar la campaña.');
      } finally {
        setLoadingCampaign(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (chatLogRef.current) {
      chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (skipModelResetRef.current) {
      skipModelResetRef.current = false;
      return;
    }
    const p = PROVIDERS.find((p) => p.provider === provider);
    if (p) setModelId(p.models[0]);
  }, [provider]);

  async function createCampaign(): Promise<string | null> {
    if (!name.trim()) {
      toast.error('Escribe un nombre para la campaña');
      return null;
    }
    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, pipelineType }),
    });
    const data = await res.json();
    const id = data.campaign?.id;
    if (id) setCampaignId(id);
    return id;
  }

  async function scanInventory() {
    if (!inventoryPath.trim()) return;
    setScanningInventory(true);
    setInventoryWarning(null);
    try {
      const res = await fetch(`/api/inventory?path=${encodeURIComponent(inventoryPath)}`);
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Error escaneando carpeta');
        return;
      }
      const data = await res.json();
      setInventory(data.days || []);

      if (data.warning) {
        setInventoryWarning(data.warning);
        const rf = data.rootFiles?.length || 0;
        setRootFilesCount(rf);
        toast(
          rf > 0
            ? `⚠️ ${rf} archivos en raíz — carpetas "Día N" no encontradas`
            : `⚠️ ${data.warning.slice(0, 80)}...`,
          { icon: '⚠️' }
        );
      } else {
        setRootFilesCount(0);
        toast.success(`✅ ${data.days?.length || 0} carpetas "Día N" encontradas`);
      }
    } catch {
      toast.error('Error de red al escanear');
    } finally {
      setScanningInventory(false);
    }
  }

  async function analyzeCompetitors() {
    const urls = competitorUrls
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.startsWith('http'));

    if (!urls.length) {
      toast.error('Agrega al menos una URL válida (http...)');
      return;
    }

    let id = campaignId;
    if (!id) id = await createCampaign();
    if (!id) return;

    setAnalyzingCompetitors(true);
    try {
      const res = await fetch('/api/research/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls, campaignId: id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Error analizando competencia');
        return;
      }
      setCompetitorInsights(data.insights);
      toast.success(`✅ ${data.urlCount} URLs analizadas con IA`);
    } catch {
      toast.error('Error de red');
    } finally {
      setAnalyzingCompetitors(false);
    }
  }

  async function analyzeAdsLibrary() {
    if (!adsLibraryBrand.trim()) {
      toast.error('Escribe el nombre de la marca a analizar');
      return;
    }

    setAnalyzingAdsLibrary(true);
    const toastId = toast.loading('🔍 Analizando Meta Ads Library... (puede tardar 30-60 seg)');

    try {
      const res = await fetch('/api/research/ads-library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName: adsLibraryBrand,
          country: adsLibraryCountry,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Error analizando Ads Library', { id: toastId });
        return;
      }

      setAdsLibraryResult({
        adsFound: data.adsFound,
        scrapedOk: data.scrapedOk,
        htmlReport: data.htmlReport,
      });

      toast.success(
        `✅ Reporte generado — ${data.adsFound} anuncios analizados`,
        { id: toastId }
      );
    } catch {
      toast.error('Error de red al analizar', { id: toastId });
    } finally {
      setAnalyzingAdsLibrary(false);
    }
  }

  function openAdsLibraryReport() {
    if (!adsLibraryResult?.htmlReport) return;
    const blob = new Blob([adsLibraryResult.htmlReport], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }

  // ─── File upload ──────────────────────────────────────────────
  const readFileText = (file: File): Promise<string | undefined> => {
    const textTypes = ['text/', 'application/json', 'application/xml'];
    const isText = textTypes.some((t) => file.type.startsWith(t)) ||
      file.name.endsWith('.txt') || file.name.endsWith('.md') ||
      file.name.endsWith('.csv') || file.name.endsWith('.json');

    if (!isText || file.size > 50 * 1024) return Promise.resolve(undefined);

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => resolve(undefined);
      reader.readAsText(file);
    });
  };

  const addFiles = useCallback(async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    const newUploads: UploadedFile[] = await Promise.all(
      files.map(async (f) => ({
        name: f.name,
        sizeBytes: f.size,
        type: f.type || 'application/octet-stream',
        content: await readFileText(f),
      }))
    );
    setUploadedFiles((prev) => [...prev, ...newUploads]);
    toast.success(`${files.length} archivo(s) adjunto(s)`);
  }, []);

  const removeFile = (idx: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  // Drag & drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!chatLogRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) await addFiles(files);
  };

  // ─── Chat send ────────────────────────────────────────────────
  async function sendMessage() {
    if ((!input.trim() && uploadedFiles.length === 0) || busy) return;

    let id = campaignId;
    if (!id) {
      id = await createCampaign();
      if (!id) return;
    }

    // Build message content with file info appended
    let messageContent = input.trim();
    if (uploadedFiles.length > 0) {
      const fileLines = uploadedFiles.map((f) => {
        const base = `${fileIcon(f.type, f.name)} ${f.name} (${formatSize(f.sizeBytes)})`;
        return f.content ? `${base}\n\`\`\`\n${f.content.slice(0, 2000)}\n\`\`\`` : base;
      });
      messageContent += `\n\n[Archivos adjuntos]\n${fileLines.join('\n')}`;
    }

    const userMsg: ChatMessage = { role: 'user', content: messageContent };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setUploadedFiles([]);
    setBusy(true);

    const contextSuffix = buildContextSuffix();

    let res: Response;
    try {
      res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: id,
          messages: next,
          provider,
          modelId,
          contextSuffix,
          imageProvider,
          pipelineType,
        }),
      });
    } catch {
      toast.error('Error de red al contactar la IA. Verifica tu conexión.');
      setBusy(false);
      return;
    }

    if (!res.ok) {
      let errMsg = `Error ${res.status} al contactar la IA.`;
      try {
        const text = await res.text();
        try {
          const parsed = JSON.parse(text);
          errMsg = parsed.error || parsed.message || text || errMsg;
        } catch {
          errMsg = text || errMsg;
        }
      } catch {}

      if (res.status === 401) {
        errMsg = 'Sesión expirada. Vuelve a iniciar sesión.';
      } else if (/no api key/i.test(errMsg)) {
        errMsg = `No hay API key configurada para "${provider}". Ve a "Claves de IA" y agrega una.`;
      }

      toast.error(errMsg);
      setMessages([
        ...next,
        { role: 'assistant', content: `⚠️ ${errMsg}` },
      ]);
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
        // Vercel AI SDK data stream protocol prefixes:
        // 0: text delta, 3: error, others (f/e/d/...): metadata we ignore
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
      const errText = 'La IA no devolvió respuesta. Verifica tu API key en "Claves de IA" e inténtalo de nuevo.';
      toast.error(errText);
      setMessages([...next, { role: 'assistant', content: `⚠️ ${errText}` }]);
    }

    setBusy(false);
  }

  function buildContextSuffix(): string {
    let ctx = '';
    if (brandInput.trim()) {
      ctx += `\n\n[PERFIL DE MARCA PROPORCIONADO]\n${brandInput}`;
    }
    if (inventory.length > 0) {
      const withContent = inventory.filter((d) => d.hasContent);
      ctx += `\n\n[INVENTARIO LOCAL]\nCarpeta: ${inventoryPath}\nDías con assets existentes: ${withContent.map((d) => `Día ${d.dayNumber}`).join(', ') || 'ninguno'}\nTotal carpetas: ${inventory.length}`;
    }
    if (adsLibraryResult) {
      ctx += `\n\n[ANÁLISIS META ADS LIBRARY: ${adsLibraryBrand}]\nAnuncios encontrados: ${adsLibraryResult.adsFound}`;
    }
    if (competitorInsights) {
      ctx += `\n\n[ANÁLISIS COMPETENCIA]\nInsights: ${competitorInsights.rawSummary.slice(0, 300)}`;
    }
    if (imageProvider !== 'gemini') {
      ctx += `\n\n[CONFIGURACIÓN]\nProveedor de imágenes: ${imageProvider}`;
    }
    return ctx;
  }

  async function finalizePlan() {
    if (!campaignId || messages.length < 2) return;
    setFinalizing(true);
    try {
      const res = await fetch('/api/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId }),
      });
      if (res.ok) {
        toast.success('¡Plan maestro generado!');
        router.push(`/campaign/${campaignId}`);
      } else {
        const err = await res.json();
        toast.error(err.error || 'Error al finalizar');
        setFinalizing(false);
      }
    } catch {
      toast.error('Error de red');
      setFinalizing(false);
    }
  }

  const currentModels = PROVIDERS.find((p) => p.provider === provider)?.models || [];

  return (
    <>
      <TopBar title="Nueva Campaña" subtitle="Planifica tu campaña de contenido con IA" />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="*/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files?.length) {
            addFiles(e.target.files);
            e.target.value = '';
          }
        }}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '340px 1fr',
          minHeight: 'calc(100vh - 73px)',
          overflow: 'auto',
        }}
      >
        {/* ═══════════ PANEL IZQUIERDO ═══════════ */}
        <div
          style={{
            borderRight: '1px solid var(--rai-border)',
            background: 'var(--rai-dark)',
            overflowY: 'auto',
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          {/* Nombre */}
          <div>
            <p className="label" style={{ marginBottom: 6 }}>Nombre de la campaña</p>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Sprint 30 días Mayo"
              style={{ width: '100%' }}
            />
          </div>

          {/* Pipeline type */}
          <div>
            <p className="label" style={{ marginBottom: 6 }}>Tipo de Pipeline</p>
            <select value={pipelineType} onChange={(e) => setPipelineType(e.target.value)} style={{ width: '100%' }}>
              {PIPELINE_TYPES.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* LLM Selector */}
          <div>
            <p className="label" style={{ marginBottom: 6 }}>Modelo de Planificación</p>
            <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
              <select value={provider} onChange={(e) => setProvider(e.target.value)} style={{ width: '100%' }}>
                {PROVIDERS.map((p) => (
                  <option key={p.provider} value={p.provider}>{p.label}</option>
                ))}
              </select>
              <select value={modelId} onChange={(e) => setModelId(e.target.value)} style={{ width: '100%' }}>
                {currentModels.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Imagen IA */}
          <div>
            <p className="label" style={{ marginBottom: 6 }}>Generación de Imágenes</p>
            <select value={imageProvider} onChange={(e) => setImageProvider(e.target.value)} style={{ width: '100%' }}>
              {IMAGE_PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* CTA Automatización */}
          <Link
            href="/automatizacion"
            className="card"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              padding: '10px 12px',
              textDecoration: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={14} color="var(--rai-gold)" />
              <span style={{ fontSize: 11, color: 'var(--rai-muted)', lineHeight: 1.5 }}>
                Tip: automatiza el seguimiento de los nuevos contactos que lleguen por esta campaña.
              </span>
            </div>
            <ArrowRight size={12} color="var(--rai-gold)" style={{ flexShrink: 0 }} />
          </Link>

          <div className="divider" />

          {/* Inventario */}
          <div>
            <p className="label" style={{ marginBottom: 6 }}>
              <FolderSearch size={11} style={{ marginRight: 4, display: 'inline' }} />
              Carpeta de Planificación Local
            </p>
            <p style={{ fontSize: 10, color: 'var(--rai-muted)', marginBottom: 6 }}>
              Organiza tu carpeta con subcarpetas &quot;Día 1&quot;, &quot;Día 2&quot;, etc.
            </p>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                value={inventoryPath}
                onChange={(e) => setInventoryPath(e.target.value)}
                placeholder="C:\Users\...\Mes_Mayo"
                style={{ flex: 1 }}
              />
              <button
                onClick={scanInventory}
                disabled={!inventoryPath.trim() || scanningInventory}
                className="btn btn-secondary btn-sm"
                style={{ whiteSpace: 'nowrap' }}
              >
                {scanningInventory ? <Spinner size="sm" /> : <Search size={12} />}
                Escanear
              </button>
            </div>

            {/* Warning de estructura */}
            {inventoryWarning && (
              <div
                style={{
                  marginTop: 8,
                  padding: '8px 10px',
                  background: 'rgba(245,158,11,0.08)',
                  border: '1px solid rgba(245,158,11,0.2)',
                  borderRadius: 6,
                }}
              >
                <p style={{ fontSize: 11, color: '#fcd34d', fontWeight: 600 }}>
                  ⚠️ Estructura no reconocida
                </p>
                <p style={{ fontSize: 10, color: 'var(--rai-muted)', marginTop: 4, lineHeight: 1.5 }}>
                  {inventoryWarning}
                </p>
                {rootFilesCount > 0 && (
                  <p style={{ fontSize: 10, color: 'var(--rai-muted)', marginTop: 4 }}>
                    📁 {rootFilesCount} archivos multimedia detectados en la raíz
                  </p>
                )}
              </div>
            )}

            {/* Grid de días */}
            {inventory.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <p style={{ fontSize: 11, color: 'var(--rai-muted)', marginBottom: 6 }}>
                  {inventory.filter((d) => d.hasContent).length} de {inventory.length} días con assets
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {inventory.map((day) => (
                    <div
                      key={day.dayNumber}
                      title={`Día ${day.dayNumber}: ${day.existingAssets.length} archivos`}
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 4,
                        background: day.hasContent ? 'var(--rai-gold)' : day.existingAssets.length > 0 ? 'var(--rai-muted)' : 'var(--rai-border)',
                        fontSize: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: day.hasContent ? '#000' : 'var(--rai-muted)',
                        fontWeight: 700,
                        cursor: 'default',
                      }}
                    >
                      {day.dayNumber}
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: 10, color: 'var(--rai-muted)', marginTop: 6 }}>
                  🟡 Con assets &nbsp; ⚫ Vacío
                </p>
              </div>
            )}
          </div>

          {/* Manual de Marca */}
          <div>
            <p className="label" style={{ marginBottom: 6 }}>Manual de Marca (opcional)</p>
            <textarea
              value={brandInput}
              onChange={(e) => setBrandInput(e.target.value)}
              placeholder="Pega aquí: nombre, tono, audiencia, productos, hashtags, topics prohibidos..."
              style={{ width: '100%', minHeight: 100, fontSize: 12 }}
            />
          </div>

          {/* ─── Investigar Competencia ─── */}
          <div>
            <p className="label" style={{ marginBottom: 8 }}>
              <Search size={11} style={{ marginRight: 4, display: 'inline' }} />
              Investigar Competencia (opcional)
            </p>

            {/* Mode tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
              <button
                onClick={() => setCompetitorMode('urls')}
                className={competitorMode === 'urls' ? 'btn btn-secondary btn-sm' : 'btn btn-ghost btn-sm'}
                style={{ flex: 1, gap: 4, fontSize: 11 }}
              >
                <Globe size={10} /> URLs / Webs
              </button>
              <button
                onClick={() => setCompetitorMode('ads-library')}
                className={competitorMode === 'ads-library' ? 'btn btn-secondary btn-sm' : 'btn btn-ghost btn-sm'}
                style={{ flex: 1, gap: 4, fontSize: 11 }}
              >
                <Megaphone size={10} /> Meta Ads
              </button>
            </div>

            {/* URL mode */}
            {competitorMode === 'urls' && (
              <>
                <textarea
                  value={competitorUrls}
                  onChange={(e) => setCompetitorUrls(e.target.value)}
                  placeholder={"https://instagram.com/competidor1\nhttps://competidor2.com"}
                  style={{ width: '100%', minHeight: 60, fontSize: 12 }}
                />
                <button
                  onClick={analyzeCompetitors}
                  disabled={!competitorUrls.trim() || analyzingCompetitors}
                  className="btn btn-ghost btn-sm"
                  style={{ width: '100%', marginTop: 6, gap: 6 }}
                >
                  {analyzingCompetitors ? (
                    <><Spinner size="sm" /> Investigando con IA...</>
                  ) : (
                    <>Analizar Competencia</>
                  )}
                </button>
                {competitorInsights && (
                  <div style={{ marginTop: 8, padding: '8px 10px', background: 'rgba(46,196,182,0.08)', border: '1px solid rgba(46,196,182,0.2)', borderRadius: 6 }}>
                    <p style={{ fontSize: 11, color: 'var(--rai-success)', fontWeight: 600 }}>
                      Analisis listo: {competitorInsights.painPoints.length + competitorInsights.opportunities.length} insights
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--rai-muted)', marginTop: 4, lineHeight: 1.5 }}>
                      {competitorInsights.rawSummary.slice(0, 120)}...
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Ads Library mode */}
            {competitorMode === 'ads-library' && (
              <>
                <p style={{ fontSize: 10, color: 'var(--rai-muted)', marginBottom: 8, lineHeight: 1.5 }}>
                  Analiza anuncios activos en Meta Ads Library y genera un reporte HTML con graficos.
                </p>
                <input
                  value={adsLibraryBrand}
                  onChange={(e) => setAdsLibraryBrand(e.target.value)}
                  placeholder="Nombre de la marca (ej: Nike)"
                  style={{ width: '100%', marginBottom: 6 }}
                />
                <select
                  value={adsLibraryCountry}
                  onChange={(e) => setAdsLibraryCountry(e.target.value)}
                  style={{ width: '100%', marginBottom: 8 }}
                >
                  {COUNTRY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <button
                  onClick={analyzeAdsLibrary}
                  disabled={!adsLibraryBrand.trim() || analyzingAdsLibrary}
                  className="btn btn-ghost btn-sm"
                  style={{ width: '100%', gap: 6 }}
                >
                  {analyzingAdsLibrary ? (
                    <><Spinner size="sm" /> Analizando Ads Library...</>
                  ) : (
                    <>Analizar Ads Library</>
                  )}
                </button>
                {adsLibraryResult && (
                  <div style={{ marginTop: 8, padding: '8px 10px', background: 'rgba(46,196,182,0.08)', border: '1px solid rgba(46,196,182,0.2)', borderRadius: 6 }}>
                    <p style={{ fontSize: 11, color: 'var(--rai-success)', fontWeight: 600 }}>
                      {adsLibraryResult.adsFound} anuncios analizados
                      {!adsLibraryResult.scrapedOk && ' (analisis IA)'}
                    </p>
                    <button
                      onClick={openAdsLibraryReport}
                      className="btn btn-ghost btn-sm"
                      style={{ width: '100%', marginTop: 6, gap: 6, fontSize: 11 }}
                    >
                      <FileText size={10} /> Ver Reporte HTML
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Estimado de costos */}
          {messages.length >= 2 && (
            <CostEstimate items={7} pipelineType={pipelineType} imageProvider={imageProvider} />
          )}
        </div>

        {/* PANEL DERECHO - CHAT */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--rai-black)' }}>
          {/* Header del chat */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--rai-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(123,94,167,0.2)', border: '1px solid rgba(123,94,167,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={14} color="var(--rai-purple)" />
              </div>
              <div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--rai-text)' }}>
                  IA de Planificacion
                </span>
                <span style={{ fontSize: 11, color: 'var(--rai-muted)', marginLeft: 8 }}>
                  {provider} / {modelId}
                </span>
              </div>
            </div>
            {messages.length >= 2 && (
              <button onClick={finalizePlan} disabled={finalizing} className="btn btn-primary">
                {finalizing ? <><Spinner size="sm" /> Extrayendo JSON...</> : <><Sparkles size={14} /> Generar Plan Maestro</>}
              </button>
            )}
          </div>

          {/* Chat log - drag and drop zone */}
          <div
            ref={chatLogRef}
            className="chat-log"
            style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', position: 'relative' }}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {isDragging && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(123,94,167,0.15)', border: '2px dashed rgba(123,94,167,0.6)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, pointerEvents: 'none' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>{"📎"}</div>
                  <p style={{ color: 'var(--rai-purple)', fontWeight: 600, fontSize: 14 }}>Suelta los archivos aqui</p>
                </div>
              </div>
            )}

            {messages.length === 0 && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div className="chat-bubble assistant" style={{ maxWidth: '80%' }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <Bot size={14} color="var(--rai-purple)" />
                    <span style={{ fontSize: 12, color: 'var(--rai-purple)', fontWeight: 600 }}>IA</span>
                  </div>
                  <p style={{ fontSize: 14, lineHeight: 1.7 }}>
                    Hola, soy tu IA de contenido. Dime sobre tu marca y te ayudo a planificar hasta 31 dias de contenido.
                    {inventory.length > 0 && ` Tengo ${inventory.filter((d) => d.hasContent).length} dias con assets.`}
                    {adsLibraryResult && ` Analice ${adsLibraryResult.adsFound} anuncios de ${adsLibraryBrand}.`}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--rai-muted)', marginTop: 8 }}>
                    Tip: Arrastra archivos al chat o usa el icono de carpeta para adjuntarlos.
                  </p>
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
                <div className={"chat-bubble " + msg.role} style={{ maxWidth: '80%', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                  {msg.role === 'assistant' && (
                    <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                      <Bot size={12} color="var(--rai-purple)" />
                      <span style={{ fontSize: 11, color: 'var(--rai-purple)', fontWeight: 600 }}>IA</span>
                    </div>
                  )}
                  {msg.content || (busy && i === messages.length - 1 ? '...' : '')}
                </div>
              </div>
            ))}

            {busy && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <Spinner size="sm" />
                <span style={{ fontSize: 12, color: 'var(--rai-muted)' }}>Generando respuesta...</span>
              </div>
            )}
          </div>

          {/* File chips */}
          {uploadedFiles.length > 0 && (
            <div style={{ padding: '8px 24px', borderTop: '1px solid var(--rai-border)', display: 'flex', flexWrap: 'wrap', gap: 6, background: 'rgba(123,94,167,0.04)' }}>
              {uploadedFiles.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(123,94,167,0.12)', border: '1px solid rgba(123,94,167,0.25)', borderRadius: 6, padding: '3px 8px', fontSize: 11, color: 'var(--rai-text)' }}>
                  <span>{fileIcon(f.type, f.name)}</span>
                  <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                  <span style={{ color: 'var(--rai-muted)' }}>{formatSize(f.sizeBytes)}</span>
                  <button onClick={() => removeFile(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--rai-muted)', padding: 0, lineHeight: 1 }}>
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Chat input */}
          <div style={{ padding: '16px 24px', borderTop: uploadedFiles.length > 0 ? 'none' : '1px solid var(--rai-border)', display: 'flex', gap: 8, alignItems: 'flex-end', background: 'var(--rai-dark)' }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Adjuntar archivos"
              className="btn btn-ghost"
              style={{ height: 52, width: 44, padding: 0, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: uploadedFiles.length > 0 ? 'var(--rai-purple)' : 'var(--rai-muted)' }}
            >
              <Folder size={18} />
            </button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
              }}
              placeholder="Describe la marca, audiencia, objetivos... (Enter para enviar)"
              style={{ flex: 1, minHeight: 52, maxHeight: 160, resize: 'none', fontSize: 14, lineHeight: 1.6 }}
              rows={2}
            />
            <button
              onClick={sendMessage}
              disabled={busy || (!input.trim() && uploadedFiles.length === 0)}
              className="btn btn-primary"
              style={{ height: 52, padding: '0 18px', flexShrink: 0 }}
            >
              {busy ? <Spinner size="sm" /> : <Send size={16} />}
            </button>
          </div>

          {messages.length >= 2 && !finalizing && (
            <div style={{ padding: '10px 24px', background: 'rgba(201,168,76,0.05)', borderTop: '1px solid rgba(201,168,76,0.1)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <ChevronDown size={12} color="var(--rai-gold)" />
              <span style={{ fontSize: 12, color: 'var(--rai-muted)' }}>
                Cuando el plan este listo, haz clic en <strong style={{ color: 'var(--rai-gold)' }}>Generar Plan Maestro</strong>.
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
