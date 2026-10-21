'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import type { CompetitorInsights, DayInventory } from '@/lib/campaign-context';

export interface AdsLibraryResult {
  adsFound: number;
  scrapedOk: boolean;
  htmlReport: string;
}

interface ResearchInputs {
  inventoryPath: string;
  competitorUrls: string;
  adsLibraryBrand: string;
  adsLibraryCountry: string;
  ensureCampaign: () => Promise<string | null>;
}

/** Investigación opcional: inventario de carpetas, competencia por URL y Meta Ads Library. */
export function useResearch(inputs: ResearchInputs) {
  const { inventoryPath, competitorUrls, adsLibraryBrand, adsLibraryCountry, ensureCampaign } = inputs;

  const [inventory, setInventory] = useState<DayInventory[]>([]);
  const [inventoryWarning, setInventoryWarning] = useState<string | null>(null);
  const [rootFilesCount, setRootFilesCount] = useState(0);
  const [scanningInventory, setScanningInventory] = useState(false);

  const [competitorInsights, setCompetitorInsights] = useState<CompetitorInsights | null>(null);
  const [analyzingCompetitors, setAnalyzingCompetitors] = useState(false);

  const [adsLibraryResult, setAdsLibraryResult] = useState<AdsLibraryResult | null>(null);
  const [analyzingAdsLibrary, setAnalyzingAdsLibrary] = useState(false);

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
            ? `${rf} archivos en raíz: carpetas "Día N" no encontradas`
            : `${String(data.warning).slice(0, 80)}...`,
          { icon: '⚠️' },
        );
      } else {
        setRootFilesCount(0);
        toast.success(`${data.days?.length || 0} carpetas "Día N" encontradas`);
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

    const id = await ensureCampaign();
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
      toast.success(`${data.urlCount} URLs analizadas con IA`);
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
    const toastId = toast.loading('Analizando Meta Ads Library... (puede tardar 30-60 seg)');

    try {
      const res = await fetch('/api/research/ads-library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandName: adsLibraryBrand, country: adsLibraryCountry }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Error analizando Ads Library', { id: toastId });
        return;
      }

      setAdsLibraryResult({ adsFound: data.adsFound, scrapedOk: data.scrapedOk, htmlReport: data.htmlReport });
      toast.success(`Reporte generado: ${data.adsFound} anuncios analizados`, { id: toastId });
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

  return {
    inventory,
    inventoryWarning,
    rootFilesCount,
    scanningInventory,
    scanInventory,
    competitorInsights,
    setCompetitorInsights,
    analyzingCompetitors,
    analyzeCompetitors,
    adsLibraryResult,
    analyzingAdsLibrary,
    analyzeAdsLibrary,
    openAdsLibraryReport,
  };
}

export type Research = ReturnType<typeof useResearch>;
