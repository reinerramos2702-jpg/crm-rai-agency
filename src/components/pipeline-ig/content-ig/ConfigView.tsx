'use client';

import React from 'react';
import type { ContentPlannerConfig } from '@/lib/content-planner-config';
import type { SyncStatus } from '../useContentPlannerSync';
import { BrandCard } from './config/BrandCard';
import { BusinessCard } from './config/BusinessCard';
import { ConfigHeader, ConfigNav, SaveBar } from './config/ConfigChrome';
import { InstagramCard } from './config/InstagramCard';
import { NotesCard } from './config/NotesCard';
import { PhotosCard } from './config/PhotosCard';
import { RulesCard } from './config/RulesCard';
import type { ConfigSetter } from './types';
import { useConfigNav } from './useConfigNav';
import type { MetaState } from './useMetaStatus';
import type { ConfigProgress } from './utils';

interface ConfigViewProps {
  config: ContentPlannerConfig;
  onChange: ConfigSetter;
  photos: string[];
  onPhotos: (update: (prev: string[]) => string[]) => void;
  progress: ConfigProgress;
  meta: MetaState;
  syncStatus: SyncStatus;
  syncLabel: string;
  ready: boolean;
  onSave: () => void;
}

export function ConfigView({ config, onChange, photos, onPhotos, progress, meta, syncStatus, syncLabel, ready, onSave }: ConfigViewProps) {
  const { activeSection, goSection } = useConfigNav(true, ready);
  return (
    <div className="rai-cfg">
      <ConfigHeader progress={progress} syncStatus={syncStatus} syncLabel={syncLabel} />
      {syncStatus === 'error' && !ready && (
        <p className="au-error" role="alert">
          No se pudo cargar tu configuración, así que por ahora no se guardará nada. Revisa tu conexión y recarga la página.
        </p>
      )}
      <div className="rai-cfg-layout">
        <ConfigNav progress={progress} activeSection={activeSection} onGo={goSection} />
        <div className={`rai-cfg-body${ready ? '' : ' is-loading'}`} aria-busy={!ready}>
          <BusinessCard config={config} onChange={onChange} />
          <BrandCard config={config} onChange={onChange} />
          <PhotosCard config={config} photos={photos} onChange={onChange} onPhotos={onPhotos} />
          <InstagramCard config={config} meta={meta} onChange={onChange} />
          <RulesCard rules={config.brandRules} onChange={(rules) => onChange('brandRules', rules)} />
          <NotesCard value={config.contentNotes} onChange={(value) => onChange('contentNotes', value)} />
        </div>
      </div>
      <SaveBar syncStatus={syncStatus} syncLabel={syncLabel} onSave={onSave} />
    </div>
  );
}
