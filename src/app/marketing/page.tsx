'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCachedJson } from '@/lib/use-cached-json';
import { MARKETING_TABS, marketingTabHref, parseMarketingTab, type MarketingTabId } from '@/lib/marketing-tabs';
import { KpiStrip } from './_components/KpiStrip';
import { MarketingHead } from './_components/MarketingHead';
import { MarketingSkeleton } from './_components/MarketingSkeleton';
import { MarketingStatus } from './_components/MarketingStatus';
import { MarketingTabs } from './_components/MarketingTabs';
import { StatusSkeleton } from './_components/skeletons';
import { SUMMARY_URL, type MarketingSummary } from './_components/shared';
import PlannerTab from './_components/PlannerTab';
import EmailsTab from './_components/EmailsTab';
import SnippetsTab from './_components/SnippetsTab';
import CountdownTab from './_components/CountdownTab';
import LinksTab from './_components/LinksTab';
import BrandTab from './_components/BrandTab';
import AdsTab from './_components/AdsTab';
import ProspectingTab from './_components/ProspectingTab';

function MarketingInner() {
  const params = useSearchParams();
  const router = useRouter();
  const tab = parseMarketingTab(params.get('tab'));
  const { data: summary, error: summaryError, refresh: retrySummary } = useCachedJson<MarketingSummary>(SUMMARY_URL, { ttlMs: 15_000 });
  const canWrite = summary?.canWrite ?? true;
  const active = MARKETING_TABS.find((t) => t.id === tab) ?? MARKETING_TABS[0];

  const go = (id: MarketingTabId) => router.replace(marketingTabHref(id), { scroll: false });
  const status = summary ? <MarketingStatus summary={summary} /> : summaryError === null ? <StatusSkeleton /> : null;

  return (
    <div className="container mkt-page">
      <MarketingHead status={status} />
      <KpiStrip summary={summary} error={summaryError} onRetry={() => void retrySummary()} />

      <MarketingTabs tab={tab} onSelect={go} />
      <p className="mkt-tab-desc">{active.description}</p>

      <div id="mkt-tabpanel" role="tabpanel" aria-labelledby={`mkt-tab-${tab}`}>
        {tab === 'social' && <PlannerTab canWrite={canWrite} canManageContent={summary?.canManageContent} />}
        {tab === 'emails' && <EmailsTab canWrite={canWrite} />}
        {tab === 'snippets' && <SnippetsTab canWrite={canWrite} />}
        {tab === 'countdown' && <CountdownTab />}
        {tab === 'links' && <LinksTab canWrite={canWrite} />}
        {tab === 'brand' && <BrandTab />}
        {tab === 'ads' && <AdsTab canWrite={canWrite} google={summary?.providers.google} />}
        {tab === 'prospecting' && <ProspectingTab canWrite={canWrite} anthropic={summary?.providers.anthropic} />}
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
