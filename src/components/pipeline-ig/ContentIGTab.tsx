'use client';

import React from 'react';
import { SkeletonCard } from '@/components/ui/Skeleton';
import ProductTour from './ProductTour';
import ScheduleBatchDialog from './ScheduleBatchDialog';
import { CalendarView } from './content-ig/CalendarView';
import { CampaignsView } from './content-ig/CampaignsView';
import { ConfigView } from './content-ig/ConfigView';
import { PlannerView } from './content-ig/PlannerView';
import { SubNav } from './content-ig/SubNav';
import { IG_TOUR_STEPS } from './content-ig/tour-steps';
import type { Campaign } from './content-ig/types';
import { useIgChat } from './content-ig/useIgChat';
import { useIgConfig } from './content-ig/useIgConfig';
import { useIgScheduling } from './content-ig/useIgScheduling';
import { useIgSession } from './content-ig/useIgSession';
import { useIgTour } from './content-ig/useIgTour';
import { useMetaStatus } from './content-ig/useMetaStatus';
import { buildConfigProgress } from './content-ig/utils';

/**
 * Contenido IG: campañas, planificador con IA, calendario de publicación y configuración de marca.
 * Este archivo solo coordina; la lógica vive en los hooks y las vistas de `content-ig/`.
 */
export default function ContentIGTab() {
  const session = useIgSession();
  const { view, setView, setActiveCampaign, setChatInput } = session;
  const cfg = useIgConfig();
  const meta = useMetaStatus();
  const chat = useIgChat(session, cfg.config);
  const scheduling = useIgScheduling({ session, publishTime: cfg.config.publishTime, timezone: cfg.config.timezone });
  const tour = useIgTour(setView);
  const progress = buildConfigProgress(cfg.config, session.uploadedPhotos);

  const openCampaign = (campaign: Campaign) => {
    setActiveCampaign(campaign);
    setView('calendar');
  };
  const goPlanner = () => setView('planner');
  const saveAndPlan = async () => {
    await cfg.saveNow();
    setView('planner');
  };

  return (
    <div className="rai-stage ig-root">
      <SubNav view={view} configPending={!progress.complete} onChange={setView} onTour={() => tour.setOpen(true)} />

      <div id="ig-panel" role="tabpanel" aria-labelledby={`ig-tab-${view}`}>
        {!session.hydrated ? (
          <SkeletonCard lines={4} />
        ) : (
          <>
            {view === 'campaigns' && (
              <CampaignsView
                campaigns={session.campaigns}
                showSetupBanner={!progress.complete && cfg.configReady}
                setupDone={progress.done}
                setupTotal={progress.required.length}
                onOpen={openCampaign}
                onPlan={goPlanner}
                onConfig={() => setView('config')}
              />
            )}
            {view === 'config' && (
              <ConfigView
                config={cfg.config}
                onChange={cfg.setField}
                photos={session.uploadedPhotos}
                onPhotos={session.setUploadedPhotos}
                progress={progress}
                meta={meta}
                syncStatus={cfg.syncStatus}
                syncLabel={cfg.syncLabel}
                ready={cfg.configReady}
                onSave={() => void saveAndPlan()}
              />
            )}
            {view === 'planner' && (
              <PlannerView
                messages={session.chatMessages}
                input={session.chatInput}
                loading={chat.loading}
                model={session.selectedModel}
                campaign={session.activeCampaign}
                onInput={setChatInput}
                onModel={session.setSelectedModel}
                onSend={() => void chat.send()}
              />
            )}
            {view === 'calendar' && <CalendarView campaign={session.activeCampaign} scheduling={scheduling} onPlan={goPlanner} />}
          </>
        )}
      </div>

      <ScheduleBatchDialog
        open={scheduling.dialogOpen}
        campaignName={session.activeCampaign?.name ?? ''}
        days={scheduling.batch.valid}
        invalidDays={scheduling.batch.invalid}
        igHandle={cfg.config.igHandle}
        time={cfg.config.publishTime}
        timezone={cfg.config.timezone}
        mode={scheduling.sched.mode}
        metaConnected={meta === 'unknown' ? null : meta === 'connected'}
        onClose={() => scheduling.setDialogOpen(false)}
        onConfirm={scheduling.confirmBatch}
      />

      <ProductTour steps={IG_TOUR_STEPS} open={tour.open} onClose={tour.close} onStep={tour.onStep} />
    </div>
  );
}
