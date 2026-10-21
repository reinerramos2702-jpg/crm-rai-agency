'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { TopBar } from '@/components/layout/TopBar';
import { useCachedJson } from '@/lib/use-cached-json';
import { buildPieces } from '@/lib/grid-export';
import { gridProgress } from '@/lib/grid-progress';
import { EMPTY_BRAND_DOC, type Asset, type BrandDocInfo, type ChatMessage, type ContentGrid, type LlmProviderId, type ThemeEntry } from '../types';
import { getErrorMessage } from '../utils';
import { LLM_PROVIDERS, NODES } from './constants';
import { ChatPanel } from './ChatPanel';
import { RightRail } from './RightRail';
import { ScheduleDialog } from './ScheduleDialog';
import { SetupPanel } from './SetupPanel';
import { WeekProgress } from './WeekProgress';
import { WizardSkeleton } from './WizardSkeleton';
import { useWizardChat } from './useWizardChat';

const AUTOSAVE_MS = 1500;

function normalizeThemes(grid: ContentGrid): ThemeEntry[] {
  const total = Math.max(1, grid.themesTotal || 7);
  const stored = Array.isArray(grid.themes) ? grid.themes : [];
  return Array.from({ length: total }, (_, i) => {
    const t = stored[i];
    return {
      ...(t ?? {}),
      title: typeof t?.title === 'string' ? t.title : '',
      category: typeof t?.category === 'string' ? t.category : '',
      ...(typeof t?.caption === 'string' ? { caption: t.caption } : {}),
    };
  });
}

export default function ContentGridWizardPage() {
  const params = useParams<{ id: string }>();
  const gridId = params.id;
  const gridUrl = `/api/content-grids/${gridId}`;

  // Caché compartida: si la lista ya precargó la grilla, el wizard aparece al instante.
  const gridState = useCachedJson<{ grid: ContentGrid }>(gridUrl, { ttlMs: 8_000 });
  const brandState = useCachedJson<BrandDocInfo>('/api/workspace/brand-doc', { ttlMs: 60_000 });
  const brand: BrandDocInfo | null = brandState.data ?? (brandState.error !== null ? EMPTY_BRAND_DOC : null);

  const [grid, setGrid] = useState<ContentGrid | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [themes, setThemes] = useState<ThemeEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [themesDirty, setThemesDirty] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  const [provider, setProvider] = useState<LlmProviderId>('anthropic');
  const [modelId, setModelId] = useState('claude-sonnet-4-5');
  const [imageProvider, setImageProvider] = useState('gemini');

  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  // Mientras no haya cambios locales, los datos frescos de la red reemplazan a los de la caché.
  const touchedRef = useRef(false);
  const themesRef = useRef<ThemeEntry[]>([]);
  themesRef.current = themes;

  const seed = useCallback((g: ContentGrid) => {
    setGrid(g);
    setMessages(g.chatHistory || []);
    setThemes(normalizeThemes(g));
    setImageProvider(g.imageProvider || 'gemini');
    if (g.llmProvider && LLM_PROVIDERS.some((p) => p.provider === g.llmProvider)) setProvider(g.llmProvider as LlmProviderId);
    if (g.llmModel) setModelId(g.llmModel);
  }, []);

  const fetched = gridState.data?.grid;
  useEffect(() => {
    if (fetched && !touchedRef.current) seed(fetched);
  }, [fetched, seed]);

  useEffect(() => {
    if (gridState.error) toast.error('No se pudo cargar la grilla', { id: 'grid-load-error' });
  }, [gridState.error]);

  const markTouched = useCallback(() => {
    touchedRef.current = true;
  }, []);

  const patchGrid = useCallback(
    async (data: Record<string, unknown>) => {
      markTouched();
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
        setSaveFailed(false);
        return updated.grid as ContentGrid;
      } catch (e: unknown) {
        setSaveFailed(true);
        toast.error(getErrorMessage(e, 'Error guardando cambios'));
      } finally {
        setSaving(false);
      }
    },
    [gridId, markTouched],
  );

  // Guardado automático de temas y copys tras una pausa al escribir.
  useEffect(() => {
    if (!themesDirty) return;
    const timer = setTimeout(() => {
      setThemesDirty(false);
      void patchGrid({ themes: themesRef.current });
    }, AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [themes, themesDirty, patchGrid]);

  const chat = useWizardChat({
    gridId,
    provider,
    modelId,
    messages,
    setMessages,
    onSend: markTouched,
    onFinish: useCallback(() => setGrid((prev) => (prev ? { ...prev, status: 'in_progress' } : prev)), []),
  });

  // Mantiene la caché al día con lo editado aquí para que reabrir la grilla no muestre datos viejos.
  const { mutate } = gridState;
  useEffect(() => {
    if (!grid || !touchedRef.current || chat.busy) return;
    mutate({ grid: { ...grid, chatHistory: messages, themes } });
  }, [grid, messages, themes, chat.busy, mutate]);

  const progress = useMemo(
    () => gridProgress(themes, grid?.assets ?? [], grid?.themesTotal || themes.length || 7),
    [themes, grid?.assets, grid?.themesTotal],
  );
  const pieces = useMemo(() => buildPieces(themes, grid?.assets ?? [], themes.length || 7), [themes, grid?.assets]);

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

    const updated = await patchGrid({ currentStep: nextStep, activeThemeIndex: nextThemeIndex, status: nextStatus });
    if (updated) {
      setSelectedDay(null);
      toast.success(nextStatus === 'completed' ? 'Grilla completada' : 'ALTO TOTAL validado — avanzando');
    }
  }

  function updateTheme(i: number, field: 'title' | 'category', value: string) {
    markTouched();
    setThemes((prev) => prev.map((t, idx) => (idx === i ? { ...t, [field]: value } : t)));
    setThemesDirty(true);
  }

  function updateCaption(i: number, value: string) {
    markTouched();
    setThemes((prev) => prev.map((t, idx) => (idx === i ? { ...t, caption: value } : t)));
    setThemesDirty(true);
  }

  function importCopys(copys: Array<string | null>) {
    markTouched();
    setThemes((prev) =>
      prev.map((t, i) => {
        const copy = copys[i];
        if (!copy) return t;
        return { ...t, caption: copy };
      }),
    );
    setThemesDirty(true);
    toast.success('Copys traídos del chat. Revísalos y ajusta lo que haga falta.');
  }

  async function saveThemesNow() {
    setThemesDirty(false);
    const updated = await patchGrid({ themes });
    if (updated) toast.success('Temas y copys guardados');
  }

  const day = selectedDay ?? grid?.activeThemeIndex ?? 0;

  async function generateImage(slideNumber: number, prompt: string): Promise<boolean> {
    if (!grid) return false;
    markTouched();
    setGeneratingImage(true);
    try {
      const res = await fetch(`/api/content-grids/${gridId}/generate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeIndex: day, slideNumber, prompt, provider: imageProvider }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error generando la imagen');
      toast.success(`Imagen generada (costo ~$${data.costUsd?.toFixed(2) ?? '?'})`);
      const asset: Asset = data.asset;
      setGrid((prev) =>
        prev
          ? {
              ...prev,
              assets: [
                ...prev.assets.filter((a) => !(a.themeIndex === asset.themeIndex && a.slideNumber === asset.slideNumber)),
                asset,
              ],
            }
          : prev,
      );
      return true;
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Error generando la imagen'));
      return false;
    } finally {
      setGeneratingImage(false);
    }
  }

  if (!grid) {
    if (gridState.error !== null) {
      return (
        <div className="container">
          <p className="muted">No se encontró esta grilla.</p>
          <Link href="/generador-imagenes" className="btn-secondary" style={{ marginTop: 12 }}>
            <ArrowLeft size={14} /> Volver a la galería
          </Link>
        </div>
      );
    }
    return <WizardSkeleton />;
  }

  const step = Math.min(5, Math.max(1, grid.currentStep || 1));
  const unsaved = themesDirty || saveFailed;
  const status = saving ? ' · guardando…' : unsaved ? ' · cambios sin guardar' : '';

  return (
    <>
      <TopBar
        title={grid.name}
        subtitle={`Nodo ${step}/5 · ${NODES[step - 1].title}${status}`}
        actions={
          <>
            <Link href="/generador-imagenes" className="btn-ghost btn-sm">
              <ArrowLeft size={14} /> Galería
            </Link>
            <button className="btn-primary btn-sm" onClick={advanceStep} disabled={saving} data-tour="gi-advance">
              <CheckCircle2 size={14} /> ALTO TOTAL — Validar y continuar
            </button>
          </>
        }
      />

      <div className="gw-page">
        <WeekProgress
          themes={themes}
          progress={progress}
          selected={day}
          active={grid.activeThemeIndex}
          onSelect={setSelectedDay}
        />

        <div className="gw-layout">
          <SetupPanel
            grid={grid}
            themes={themes}
            brand={brand}
            provider={provider}
            modelId={modelId}
            imageProvider={imageProvider}
            saving={saving}
            unsaved={unsaved}
            onThemeChange={updateTheme}
            onSaveThemes={() => void saveThemesNow()}
            onProviderChange={(p) => {
              markTouched();
              setProvider(p);
              setModelId(LLM_PROVIDERS.find((x) => x.provider === p)?.models[0] || '');
            }}
            onModelChange={(m) => {
              markTouched();
              setModelId(m);
            }}
            onImageProviderChange={(value) => {
              setImageProvider(value);
              void patchGrid({ imageProvider: value });
            }}
          />

          <ChatPanel
            messages={messages}
            input={chat.input}
            busy={chat.busy}
            onInputChange={chat.setInput}
            onSend={() => void chat.send()}
          />

          <RightRail
            gridName={grid.name}
            day={day}
            themes={themes}
            assets={grid.assets}
            pieces={pieces}
            brandText={brand?.brandDocText ?? null}
            messages={messages}
            generating={generatingImage}
            onGenerate={generateImage}
            onCaptionChange={updateCaption}
            onImportCopys={importCopys}
            onSelectDay={setSelectedDay}
            onSchedule={() => setScheduleOpen(true)}
          />
        </div>
      </div>

      {scheduleOpen && (
        <ScheduleDialog
          gridId={grid.id}
          pieces={pieces.map((p) => ({ day: p.day, title: p.title, caption: p.caption, imageUrls: p.imageUrls }))}
          onClose={() => setScheduleOpen(false)}
        />
      )}
    </>
  );
}
