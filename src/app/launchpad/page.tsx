'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Rocket, ChevronDown, CheckCircle2 } from 'lucide-react';
import { useCachedJson } from '@/lib/use-cached-json';
import { categoryPercent, computeNextStep, countCompleted, detectMilestone } from '@/lib/launchpad-progress';
import {
  LAUNCHPAD_CATEGORIES,
  LAUNCHPAD_STEPS,
  LAUNCHPAD_TOTAL,
  remainingMinutes,
  type LaunchpadStep,
} from '@/lib/launchpad-steps';
import {
  DEFAULT_LAUNCHPAD_PREFS,
  LAUNCHPAD_PREFS_KEY,
  filterItems,
  parseLaunchpadPrefs,
  pickInitialCategory,
  serializeLaunchpadPrefs,
  stepState,
  toggleSkipped,
  type LaunchpadFilter,
  type LaunchpadPrefs,
} from '@/lib/launchpad-prefs';
import { SkeletonLine } from '@/components/ui/Skeleton';
import { NextStepCard } from './NextStepCard';
import { MilestoneBanner } from './MilestoneBanner';
import { CategoryRail } from './CategoryRail';
import { StepRow } from './StepRow';
import { TutorialModal } from './TutorialModal';
import { stepIcon } from './launchpad-icons';
import './launchpad.css';

interface LaunchpadProgress {
  completed: string[];
  manualItemIds: string[];
}

interface TutorialManifestEntry {
  version: number;
  slides: number;
}
type TutorialManifest = Record<string, TutorialManifestEntry>;

const EMPTY_IDS: string[] = [];
const EMPTY_MANIFEST: TutorialManifest = {};
const EMPTY_SET: ReadonlySet<string> = new Set();
const STEP_IDS = LAUNCHPAD_STEPS.map((s) => s.id);
const CELEBRATE_MS = 900;
const SYNC_PULSE_MS = 1200;

interface Celebration {
  items: ReadonlySet<string>;
  categories: ReadonlySet<string>;
}

const OVERALL = { id: 'todo', items: LAUNCHPAD_STEPS };

export default function LaunchpadPage() {
  const [activeCategory, setActiveCategory] = useState(LAUNCHPAD_CATEGORIES[0].id);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [tutorialItem, setTutorialItem] = useState<LaunchpadStep | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [prefs, setPrefs] = useState<LaunchpadPrefs>(DEFAULT_LAUNCHPAD_PREFS);
  const pickedByUser = useRef(false);
  const pendingScroll = useRef<string | null>(null);
  // Pasos recién completados a mano: siguen visibles con el filtro «pendientes» hasta cambiar de vista.
  const [kept, setKept] = useState<ReadonlySet<string>>(EMPTY_SET);

  // Progreso real por workspace (ver src/app/api/launchpad/route.ts). Caché compartida:
  // al volver se pinta al instante y se actualiza por detrás (el Dashboard usa la misma).
  const progress = useCachedJson<LaunchpadProgress>('/api/launchpad', { ttlMs: 15_000 });
  const manifestState = useCachedJson<{ items?: TutorialManifest }>('/tutorials/manifest.json', { ttlMs: 10 * 60_000 });
  const completed = progress.data?.completed ?? EMPTY_IDS;
  const manualItemIds = progress.data?.manualItemIds ?? EMPTY_IDS;
  const hasData = progress.data !== undefined;
  const loaded = hasData || progress.error !== null;
  const manifest: TutorialManifest = manifestState.data?.items ?? EMPTY_MANIFEST;

  const category = LAUNCHPAD_CATEGORIES.find((c) => c.id === activeCategory) ?? LAUNCHPAD_CATEGORIES[0];

  // Preferencias locales y enlace profundo (?paso=id): solo tras montar (hidratación).
  useEffect(() => {
    try {
      setPrefs(parseLaunchpadPrefs(window.localStorage.getItem(LAUNCHPAD_PREFS_KEY), STEP_IDS));
    } catch { /* sin storage: valores predeterminados */ }
    const target = new URLSearchParams(window.location.search).get('paso');
    const cat = LAUNCHPAD_CATEGORIES.find((c) => c.items.some((i) => i.id === target));
    if (target && cat) {
      pickedByUser.current = true;
      pendingScroll.current = target;
      setActiveCategory(cat.id);
      setExpanded(target);
    }
  }, []);

  const updatePrefs = useCallback((update: (p: LaunchpadPrefs) => LaunchpadPrefs) => {
    setPrefs((prev) => {
      const next = update(prev);
      try { window.localStorage.setItem(LAUNCHPAD_PREFS_KEY, serializeLaunchpadPrefs(next)); } catch { /* sin storage */ }
      return next;
    });
  }, []);

  // Al llegar el progreso por primera vez, se abre la categoría con el siguiente paso (si la persona no eligió otra).
  useEffect(() => {
    if (!hasData || pickedByUser.current) return;
    const id = pickInitialCategory(LAUNCHPAD_CATEGORIES, completed, prefs.skipped);
    if (id) setActiveCategory(id);
    pickedByUser.current = true;
    // Solo la primera vez que hay datos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasData]);

  // Desplaza hasta el paso del enlace profundo (un solo scroll: el de la página).
  useEffect(() => {
    if (!expanded || pendingScroll.current !== expanded) return;
    pendingScroll.current = null;
    document.getElementById(`paso-${expanded}`)?.scrollIntoView({ block: 'center' });
  }, [expanded, activeCategory]);

  // Celebraciones: solo ante una transición real (nunca en la carga inicial).
  const [celebrate, setCelebrate] = useState<Celebration | null>(null);
  const [milestoneOpen, setMilestoneOpen] = useState(false);
  const prevCompleted = useRef<readonly string[] | null>(null);

  useEffect(() => {
    if (!hasData) return;
    const prev = prevCompleted.current;
    prevCompleted.current = completed;
    if (prev === null) return;
    const milestone = detectMilestone(prev, completed, LAUNCHPAD_CATEGORIES);
    if (milestone.newlyDone.length === 0) return;
    setCelebrate({ items: new Set(milestone.newlyDone), categories: new Set(milestone.categoriesCompleted) });
    if (milestone.overallCompleted) setMilestoneOpen(true);
  }, [hasData, completed]);

  useEffect(() => {
    if (!celebrate) return;
    const timer = setTimeout(() => setCelebrate(null), CELEBRATE_MS);
    return () => clearTimeout(timer);
  }, [celebrate]);

  // Pulso de sincronización: al terminar una revalidación que cambió el progreso mostrado.
  const [syncing, setSyncing] = useState(false);
  const syncBaseline = useRef<string | null>(null);
  const wasRevalidating = useRef(false);

  useEffect(() => {
    if (!hasData) return;
    const signature = [...completed].sort().join('|');
    const finished = wasRevalidating.current && !progress.revalidating;
    wasRevalidating.current = progress.revalidating;
    if (syncBaseline.current === null) {
      syncBaseline.current = signature;
      return;
    }
    if (progress.revalidating) return;
    const changed = signature !== syncBaseline.current;
    syncBaseline.current = signature;
    if (finished && changed) setSyncing(true);
  }, [hasData, completed, progress.revalidating]);

  useEffect(() => {
    if (!syncing) return;
    const timer = setTimeout(() => setSyncing(false), SYNC_PULSE_MS);
    return () => clearTimeout(timer);
  }, [syncing]);

  const toggleComplete = (id: string) => {
    if (!manualItemIds.includes(id)) return;
    const nextDone = !completed.includes(id);
    if (nextDone) setKept((prev) => new Set(prev).add(id));
    const next = nextDone ? [...completed, id] : completed.filter((x) => x !== id);
    progress.mutate({ completed: next, manualItemIds: [...manualItemIds] }); // optimista
    fetch('/api/launchpad', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: id, done: nextDone }),
    }).catch(() => void progress.refresh());
  };

  const completedCount = countCompleted(OVERALL, completed);
  const overallProgress = categoryPercent(OVERALL, completed);
  const categoryProgress = categoryPercent(category, completed);
  const pendingInCategory = category.items.filter((i) => !completed.includes(i.id)).length;
  const minutesLeft = remainingMinutes(completed);

  // Siguiente paso: primer pendiente que no esté pospuesto; si solo quedan pospuestos, se sugiere retomar uno.
  const nextStep = useMemo(() => {
    if (!loaded) return undefined;
    const fresh = computeNextStep(LAUNCHPAD_CATEGORIES, [...completed, ...prefs.skipped]);
    if (fresh) return { ...fresh, resumed: false };
    const resumed = computeNextStep(LAUNCHPAD_CATEGORIES, completed);
    return resumed ? { ...resumed, resumed: true } : undefined;
  }, [loaded, completed, prefs.skipped]);

  const visibleItems = filterItems(category.items, completed, prefs.filter, kept);

  const selectCategory = (id: string) => {
    pickedByUser.current = true;
    setKept(EMPTY_SET);
    setActiveCategory(id);
    setExpanded(null);
  };

  const setFilter = (filter: LaunchpadFilter) => {
    setKept(EMPTY_SET);
    updatePrefs((p) => ({ ...p, filter }));
  };

  const tutorialSlides = tutorialItem ? manifest[tutorialItem.id]?.slides ?? 0 : 0;

  return (
    <div className="container">
      <div className="row" style={{ gap: 10, alignItems: 'center', marginBottom: 4 }}>
        <Rocket size={20} color="var(--rai-gold)" />
        <h1 className="h1">Guía de Inicio</h1>
      </div>
      <p className="muted mb-4">
        Hola, aquí tienes tu lista de configuración personalizada con todo lo que necesitas para empezar.
      </p>

      <div className={`card mb-6 fx-sync${syncing ? ' is-syncing' : ''}`}>
        <div className="row-between mb-2">
          <span className="muted" style={{ fontSize: 12 }}>Progreso general de la plataforma</span>
          <span className="lp-overall-value" aria-busy={!loaded}>
            {loaded ? (
              `${completedCount} / ${LAUNCHPAD_TOTAL} pasos · ${overallProgress}%`
            ) : (
              <>
                <SkeletonLine width={116} height={14} />
                <span className="fx-sr-only">Calculando progreso…</span>
              </>
            )}
          </span>
        </div>
        <div className="lp-bar" role="progressbar" aria-valuenow={overallProgress} aria-valuemin={0} aria-valuemax={100} aria-label="Progreso general">
          <i style={{ '--w': overallProgress / 100 } as React.CSSProperties} />
        </div>
        <p className="lp-eta">
          {loaded
            ? minutesLeft > 0 ? `Te faltan unos ${minutesLeft} min para dejar todo listo.` : 'Todo configurado.'
            : ' '}
        </p>
      </div>

      {milestoneOpen && overallProgress === 100 && (
        <MilestoneBanner total={LAUNCHPAD_TOTAL} onDismiss={() => setMilestoneOpen(false)} />
      )}

      {nextStep && (
        <NextStepCard
          icon={stepIcon(nextStep.item.id)}
          title={nextStep.item.title}
          minutes={nextStep.item.minutes}
          href={nextStep.item.href}
          resumed={nextStep.resumed}
          onView={() => {
            pickedByUser.current = true;
            setActiveCategory(nextStep.category.id);
            setExpanded(nextStep.item.id);
          }}
          onSnooze={() => updatePrefs((p) => toggleSkipped(p, nextStep.item.id))}
        />
      )}

      <div className="lp-layout">
        <CategoryRail
          categories={LAUNCHPAD_CATEGORIES}
          completed={completed}
          activeId={category.id}
          doneCollapsed={prefs.doneCollapsed}
          poppingCategories={celebrate?.categories ?? EMPTY_SET}
          onSelect={selectCategory}
          onToggleDone={() => updatePrefs((p) => ({ ...p, doneCollapsed: !p.doneCollapsed }))}
        />

        <div className="lp-main">
          <div className="card mb-4">
            <div className="row-between mb-2">
              <span className="muted" style={{ fontSize: 12 }}>
                Tu progreso de {category.label.toLowerCase()}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--rai-gold)' }}>{categoryProgress}%</span>
            </div>
            <div className="lp-bar" role="progressbar" aria-valuenow={categoryProgress} aria-valuemin={0} aria-valuemax={100} aria-label={`Progreso de ${category.label}`}>
              <i style={{ '--w': categoryProgress / 100 } as React.CSSProperties} />
            </div>
            <div className="lp-filters" role="group" aria-label="Filtrar pasos">
              {(['pending', 'all'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`lp-filter${prefs.filter === f ? ' is-on' : ''}`}
                  aria-pressed={prefs.filter === f}
                  onClick={() => setFilter(f)}
                >
                  {f === 'pending' ? `Pendientes (${pendingInCategory})` : `Todos (${category.items.length})`}
                </button>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {visibleItems.length === 0 && (
              <div className="lp-allset">
                <CheckCircle2 size={22} color="var(--rai-success)" aria-hidden="true" />
                <strong>Categoría completa</strong>
                <span className="muted">Ya hiciste todos los pasos de {category.label.toLowerCase()}.</span>
                <button type="button" className="ghost btn-sm" onClick={() => setFilter('all')}>
                  Ver todos los pasos <ChevronDown size={14} />
                </button>
              </div>
            )}
            {visibleItems.map((item) => (
              <StepRow
                key={item.id}
                step={item}
                state={stepState(item.id, completed, prefs.skipped)}
                isManual={manualItemIds.includes(item.id)}
                hasData={hasData}
                isOpen={expanded === item.id}
                isPopping={celebrate?.items.has(item.id) ?? false}
                tutorialSlides={manifest[item.id]?.slides ?? 0}
                onToggleOpen={() => setExpanded(expanded === item.id ? null : item.id)}
                onToggleManual={() => toggleComplete(item.id)}
                onToggleSkip={() => updatePrefs((p) => toggleSkipped(p, item.id))}
                onOpenTutorial={() => { setTutorialItem(item); setSlideIndex(0); }}
              />
            ))}
          </div>
        </div>
      </div>

      {tutorialItem && (
        <TutorialModal
          stepId={tutorialItem.id}
          title={tutorialItem.title}
          slideCount={tutorialSlides}
          slideIndex={slideIndex}
          onSlide={setSlideIndex}
          onClose={() => setTutorialItem(null)}
        />
      )}
    </div>
  );
}
