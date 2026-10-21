'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_MODEL, DEFAULT_WELCOME } from './constants';
import { isCampaign, isChatMessage, readStored, writeStored } from './utils';
import { isIgView, type Campaign, type ChatMessage, type IgView } from './types';

/**
 * Estado de la sesión de Contenido IG (vista, campañas, conversación, modelo y fotos).
 * Se lee de localStorage una sola vez, dentro de un efecto (nunca al renderizar), y solo se
 * vuelve a guardar cuando ya se leyó: así no se pisa lo guardado con los valores iniciales.
 */
export function useIgSession() {
  const [hydrated, setHydrated] = useState(false);
  const [view, setView] = useState<IgView>('campaigns');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([DEFAULT_WELCOME]);
  const [chatInput, setChatInput] = useState('');
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);

  useEffect(() => {
    const storedView = readStored('view');
    if (isIgView(storedView)) setView(storedView);
    const storedCampaigns = readStored('campaigns');
    if (Array.isArray(storedCampaigns)) setCampaigns(storedCampaigns.filter(isCampaign));
    const storedActive = readStored('activeCampaign');
    if (isCampaign(storedActive)) setActiveCampaign(storedActive);
    const storedChat = readStored('chatMessages');
    if (Array.isArray(storedChat)) {
      const messages = storedChat.filter(isChatMessage);
      if (messages.length > 0) setChatMessages(messages);
    }
    const storedInput = readStored('chatInput');
    if (typeof storedInput === 'string') setChatInput(storedInput);
    const storedModel = readStored('selectedModel');
    if (typeof storedModel === 'string' && storedModel) setSelectedModel(storedModel);
    const storedPhotos = readStored('uploadedPhotos');
    if (Array.isArray(storedPhotos)) setUploadedPhotos(storedPhotos.filter((p): p is string => typeof p === 'string'));
    setHydrated(true);
  }, []);

  useEffect(() => { if (hydrated) writeStored('view', view); }, [hydrated, view]);
  useEffect(() => { if (hydrated) writeStored('campaigns', campaigns); }, [hydrated, campaigns]);
  useEffect(() => { if (hydrated) writeStored('activeCampaign', activeCampaign); }, [hydrated, activeCampaign]);
  useEffect(() => { if (hydrated) writeStored('chatMessages', chatMessages); }, [hydrated, chatMessages]);
  useEffect(() => { if (hydrated) writeStored('chatInput', chatInput); }, [hydrated, chatInput]);
  useEffect(() => { if (hydrated) writeStored('selectedModel', selectedModel); }, [hydrated, selectedModel]);
  useEffect(() => { if (hydrated) writeStored('uploadedPhotos', uploadedPhotos); }, [hydrated, uploadedPhotos]);

  return {
    hydrated,
    view, setView,
    campaigns, setCampaigns,
    activeCampaign, setActiveCampaign,
    chatMessages, setChatMessages,
    chatInput, setChatInput,
    selectedModel, setSelectedModel,
    uploadedPhotos, setUploadedPhotos,
  };
}

export type IgSession = ReturnType<typeof useIgSession>;
