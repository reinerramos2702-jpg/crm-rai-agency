import React from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { categoryPercent, countCompleted } from '@/lib/launchpad-progress';
import { splitCategories } from '@/lib/launchpad-prefs';
import type { LaunchpadCategoryData } from '@/lib/launchpad-steps';
import { categoryIcon } from './launchpad-icons';
import { ProgressRing } from './ProgressRing';

interface CategoryRailProps {
  categories: LaunchpadCategoryData[];
  completed: string[];
  activeId: string;
  doneCollapsed: boolean;
  poppingCategories: ReadonlySet<string>;
  onSelect: (id: string) => void;
  onToggleDone: () => void;
}

/** Categorías con anillo de progreso; las completadas se agrupan y se pueden plegar. */
export function CategoryRail({ categories, completed, activeId, doneCollapsed, poppingCategories, onSelect, onToggleDone }: CategoryRailProps) {
  const { active, finished } = splitCategories(categories, completed);
  // La categoría abierta nunca se oculta aunque esté completa.
  const shownFinished = doneCollapsed ? finished.filter((c) => c.id === activeId) : finished;

  const renderCat = (cat: LaunchpadCategoryData) => {
    const Icon = categoryIcon(cat.id);
    const pct = categoryPercent(cat, completed);
    const isActive = cat.id === activeId;
    return (
      <button
        key={cat.id}
        type="button"
        onClick={() => onSelect(cat.id)}
        aria-current={isActive ? 'true' : undefined}
        className={`lp-cat ${isActive ? 'primary' : 'ghost'}`}
      >
        <span className="lp-cat-label">
          <ProgressRing percent={pct} size={26} stroke={3}>
            {pct === 100 ? <Check size={12} strokeWidth={3} /> : <Icon size={11} />}
          </ProgressRing>
          <span className="lp-cat-text">{cat.label}</span>
        </span>
        <span
          className={`lp-pct${pct === 100 ? ' done' : ''}${poppingCategories.has(cat.id) ? ' is-pop' : ''}`}
          aria-label={`${countCompleted(cat, completed)} de ${cat.items.length} pasos, ${pct}% completado`}
        >
          {pct}%
        </span>
      </button>
    );
  };

  return (
    <nav className="lp-cats" aria-label="Categorías de la guía">
      {active.map(renderCat)}
      {finished.length > 0 && (
        <>
          <button
            type="button"
            className="lp-done-toggle"
            aria-expanded={!doneCollapsed}
            onClick={onToggleDone}
          >
            <span>Completadas ({finished.length})</span>
            <ChevronDown size={14} className={doneCollapsed ? '' : 'is-open'} aria-hidden="true" />
          </button>
          {shownFinished.map(renderCat)}
        </>
      )}
    </nav>
  );
}
