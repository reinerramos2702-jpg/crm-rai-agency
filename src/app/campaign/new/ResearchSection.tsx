'use client';

import { FileText, FolderSearch, Globe, Megaphone, Search } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { COUNTRY_OPTIONS } from '@/lib/campaign-new-options';
import type { CampaignForm } from './hooks/useCampaignForm';
import type { Research } from './hooks/useResearch';

interface BrandFieldProps {
  cf: CampaignForm;
  /** Hay datos de marca en Configuración listos para precargar. */
  canLoadBrand: boolean;
  onLoadBrand: () => void;
}

/** Manual de marca con atajo para precargarlo desde Configuración. */
function BrandField({ cf, canLoadBrand, onLoadBrand }: BrandFieldProps) {
  return (
    <div className="cn-sec" data-tour="cn-brand">
      <div className="cn-label-row">
        <p className="label">Manual de Marca (opcional)</p>
        {canLoadBrand && (
          <button type="button" className="cn-mini-btn" onClick={onLoadBrand}>
            Cargar mi marca
          </button>
        )}
      </div>
      <textarea
        value={cf.form.brandInput}
        onChange={(e) => cf.setField('brandInput', e.target.value)}
        placeholder="Pega aquí: nombre, tono, audiencia, productos, hashtags, topics prohibidos..."
        style={{ width: '100%', minHeight: 100, fontSize: 12 }}
      />
    </div>
  );
}

function InventoryField({ cf, r }: { cf: CampaignForm; r: Research }) {
  const { inventoryPath } = cf.form;
  return (
    <div className="cn-sec" data-tour="cn-folder">
      <p className="label" style={{ marginBottom: 6 }}>
        <FolderSearch size={11} style={{ marginRight: 4, display: 'inline' }} aria-hidden="true" />
        Carpeta de planificación del workspace
      </p>
      <p className="cn-hint" style={{ marginBottom: 6 }}>
        Usa una ruta habilitada por el administrador y organízala en subcarpetas &quot;Día 1&quot;, &quot;Día 2&quot;, etc.
      </p>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={inventoryPath}
          onChange={(e) => cf.setField('inventoryPath', e.target.value)}
          placeholder="Ruta habilitada dentro de tu inventario"
          style={{ flex: 1, minWidth: 0 }}
        />
        <button
          onClick={r.scanInventory}
          disabled={!inventoryPath.trim() || r.scanningInventory}
          className="btn btn-secondary btn-sm"
          style={{ whiteSpace: 'nowrap' }}
        >
          {r.scanningInventory ? <Spinner size="sm" /> : <Search size={12} />}
          Escanear
        </button>
      </div>

      {r.inventoryWarning && (
        <div className="cn-note cn-note--warn" role="status">
          <p className="cn-note-title">Estructura no reconocida</p>
          <p className="cn-hint">{r.inventoryWarning}</p>
          {r.rootFilesCount > 0 && <p className="cn-hint">{r.rootFilesCount} archivos multimedia detectados en la raíz</p>}
        </div>
      )}

      {r.inventory.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <p className="cn-hint" style={{ marginBottom: 6 }}>
            {r.inventory.filter((d) => d.hasContent).length} de {r.inventory.length} días con assets
          </p>
          <div className="cn-days">
            {r.inventory.map((day) => (
              <span
                key={day.dayNumber}
                title={`Día ${day.dayNumber}: ${day.existingAssets.length} archivos`}
                className={`cn-day${day.hasContent ? ' is-full' : day.existingAssets.length > 0 ? ' is-some' : ''}`}
              >
                {day.dayNumber}
              </span>
            ))}
          </div>
          <p className="cn-hint" style={{ marginTop: 6 }}>Dorado: con assets · Gris: vacío</p>
        </div>
      )}
    </div>
  );
}

function CompetitorField({ cf, r }: { cf: CampaignForm; r: Research }) {
  const { competitorMode, competitorUrls, adsLibraryBrand, adsLibraryCountry } = cf.form;
  return (
    <div className="cn-sec" data-tour="cn-competitor">
      <p className="label" style={{ marginBottom: 8 }}>
        <Search size={11} style={{ marginRight: 4, display: 'inline' }} aria-hidden="true" />
        Investigar Competencia (opcional)
      </p>

      <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
        <button
          onClick={() => cf.setField('competitorMode', 'urls')}
          className={competitorMode === 'urls' ? 'btn btn-secondary btn-sm' : 'btn btn-ghost btn-sm'}
          style={{ flex: 1, gap: 4, fontSize: 11 }}
        >
          <Globe size={10} /> URLs / Webs
        </button>
        <button
          onClick={() => cf.setField('competitorMode', 'ads-library')}
          className={competitorMode === 'ads-library' ? 'btn btn-secondary btn-sm' : 'btn btn-ghost btn-sm'}
          style={{ flex: 1, gap: 4, fontSize: 11 }}
        >
          <Megaphone size={10} /> Meta Ads
        </button>
      </div>

      {competitorMode === 'urls' && (
        <>
          <textarea
            value={competitorUrls}
            onChange={(e) => cf.setField('competitorUrls', e.target.value)}
            placeholder={'https://instagram.com/competidor1\nhttps://competidor2.com'}
            style={{ width: '100%', minHeight: 60, fontSize: 12 }}
          />
          <button
            onClick={r.analyzeCompetitors}
            disabled={!competitorUrls.trim() || r.analyzingCompetitors}
            className="btn btn-ghost btn-sm"
            style={{ width: '100%', marginTop: 6, gap: 6 }}
          >
            {r.analyzingCompetitors ? <><Spinner size="sm" /> Investigando con IA...</> : <>Analizar Competencia</>}
          </button>
          {r.competitorInsights && (
            <div className="cn-note cn-note--ok" role="status">
              <p className="cn-note-title">
                Análisis listo: {r.competitorInsights.painPoints.length + r.competitorInsights.opportunities.length} insights
              </p>
              <p className="cn-hint">{r.competitorInsights.rawSummary.slice(0, 120)}...</p>
            </div>
          )}
        </>
      )}

      {competitorMode === 'ads-library' && (
        <>
          <p className="cn-hint" style={{ marginBottom: 8 }}>
            Analiza anuncios activos en Meta Ads Library y genera un reporte HTML con gráficos.
          </p>
          <input
            value={adsLibraryBrand}
            onChange={(e) => cf.setField('adsLibraryBrand', e.target.value)}
            placeholder="Nombre de la marca (ej: Nike)"
            style={{ width: '100%', marginBottom: 6 }}
          />
          <select
            value={adsLibraryCountry}
            onChange={(e) => cf.setField('adsLibraryCountry', e.target.value)}
            style={{ width: '100%', marginBottom: 8 }}
            aria-label="País"
          >
            {COUNTRY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <button
            onClick={r.analyzeAdsLibrary}
            disabled={!adsLibraryBrand.trim() || r.analyzingAdsLibrary}
            className="btn btn-ghost btn-sm"
            style={{ width: '100%', gap: 6 }}
          >
            {r.analyzingAdsLibrary ? <><Spinner size="sm" /> Analizando Ads Library...</> : <>Analizar Ads Library</>}
          </button>
          {r.adsLibraryResult && (
            <div className="cn-note cn-note--ok" role="status">
              <p className="cn-note-title">
                {r.adsLibraryResult.adsFound} anuncios analizados
                {!r.adsLibraryResult.scrapedOk && ' (análisis IA)'}
              </p>
              <button
                onClick={r.openAdsLibraryReport}
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
  );
}

interface ResearchSectionProps extends BrandFieldProps {
  r: Research;
}

/** Campos opcionales que aparecen al nombrar la campaña: carpeta, manual de marca y competencia. */
export function ResearchSection({ cf, r, canLoadBrand, onLoadBrand }: ResearchSectionProps) {
  return (
    <div className="cn-optional fx-field-in">
      <div className="divider" />
      <InventoryField cf={cf} r={r} />
      <BrandField cf={cf} canLoadBrand={canLoadBrand} onLoadBrand={onLoadBrand} />
      <CompetitorField cf={cf} r={r} />
    </div>
  );
}
