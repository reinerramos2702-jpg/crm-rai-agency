'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar, FileText, Link2, Mail, Megaphone, Palette, Timer, Users, type LucideIcon } from 'lucide-react';
import { useCachedJson } from '@/lib/use-cached-json';
import { prefetchJson } from '@/lib/swr-cache';
import { MARKETING_TABS, marketingTabHref, parseMarketingTab, type MarketingTabId } from '@/lib/marketing-tabs';
import { KpiStrip } from './_components/KpiStrip';
import { MarketingSkeleton } from './_components/MarketingSkeleton';
import { SUMMARY_URL, type MarketingSummary } from './_components/shared';
import PlannerTab from './_components/PlannerTab';
import EmailsTab from './_components/EmailsTab';
import SnippetsTab from './_components/SnippetsTab';
import CountdownTab from './_components/CountdownTab';
import LinksTab from './_components/LinksTab';
import BrandTab from './_components/BrandTab';
import AdsTab from './_components/AdsTab';
import ProspectingTab from './_components/ProspectingTab';
import './marketing.css';

const ICONS: Record<MarketingTabId, LucideIcon> = {
  social: Calendar,
  emails: Mail,
  snippets: FileText,
  countdown: Timer,
  links: Link2,
  brand: Palette,
  ads: Megaphone,
  prospecting: Users,
};

/** Datos que cada pestaña pide al abrirse: se precargan al pasar el cursor o enfocar la pestaña. */
const TAB_PREFETCH: Partial<Record<MarketingTabId, string[]>> = {
  snippets: ['/api/snippets'],
  links: ['/api/activation-links'],
  brand: ['/api/marketing/brand'],
  emails: ['/api/marketing/brand'],
};

function MarketingInner() {
  const params = useSearchParams();
  const router = useRouter();
  const tab = parseMarketingTab(params.get('tab'));
  const { data: summary } = useCachedJson<MarketingSummary>(SUMMARY_URL, { ttlMs: 15_000 });
  const canWrite = summary?.canWrite ?? true;
  const active = MARKETING_TABS.find((t) => t.id === tab) ?? MARKETING_TABS[0];

  const go = (id: MarketingTabId) => router.replace(marketingTabHref(id), { scroll: false });
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const n = MARKETING_TABS.length;
    const next = e.key === 'ArrowRight' ? (i + 1) % n : e.key === 'ArrowLeft' ? (i - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1;
    if (next < 0) return;
    e.preventDefault();
    go(MARKETING_TABS[next].id);
    requestAnimationFrame(() => document.getElementById(`mkt-tab-${MARKETING_TABS[next].id}`)?.focus());
  };

  return (
    <div className="container mkt-page">
      <div className="mkt-head">
        <div>
          <h1>Marketing</h1>
          <p className="muted">Planifica publicaciones, mide enlaces y cuida tu marca desde un solo lugar.</p>
        </div>
      </div>

      <KpiStrip summary={summary} />

      <div className="mkt-tabs" role="tablist" aria-label="Herramientas de marketing" data-tour="marketing-tabs">
        {MARKETING_TABS.map((t, i) => {
          const Icon = ICONS[t.id];
          const selected = t.id === tab;
          return (
            <button
              key={t.id}
              id={`mkt-tab-${t.id}`}
              type="button"
              role="tab"
              className="mkt-tab"
              aria-selected={selected}
              aria-controls="mkt-tabpanel"
              tabIndex={selected ? 0 : -1}
              onClick={() => go(t.id)}
              onPointerEnter={() => TAB_PREFETCH[t.id]?.forEach((u) => prefetchJson(u))}
              onFocus={() => TAB_PREFETCH[t.id]?.forEach((u) => prefetchJson(u))}
              onKeyDown={(e) => onKey(e, i)}
            >
              <Icon size={14} aria-hidden="true" />
              {t.label}
            </button>
          );
        })}
      </div>
      <p className="mkt-tab-desc">{active.description}</p>

      <div id="mkt-tabpanel" role="tabpanel" aria-labelledby={`mkt-tab-${tab}`}>
        {tab === 'social' && <PlannerTab canWrite={canWrite} canManageContent={summary?.canManageContent} />}
        {tab === 'emails' && <EmailsTab canWrite={canWrite} />}
        {tab === 'snippets' && <SnippetsTab canWrite={canWrite} />}
        {tab === 'countdown' && <CountdownTab />}
        {tab === 'links' && <LinksTab canWrite={canWrite} />}
        {tab === 'brand' && <BrandTab />}
        {tab === 'ads' && <AdsTab canWrite={canWrite} google={summary?.providers.google} />}
        {tab === 'prospecting' && <ProspectingTab anthropic={summary?.providers.anthropic} />}
      </div>
    </div>
  );
}

export default function MarketingPage() {
  return (
    <Suspense fallback={<MarketingSkeleton />}>
      <MarketingInner />
    </Suspense>
  );
}
