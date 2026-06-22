'use client';

import React, { useState } from 'react';
import { FolderSearch, Search, Image, Video, Music } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import toast from 'react-hot-toast';

interface AssetItem {
  name: string;
  type: 'image' | 'video' | 'audio' | 'other';
  path: string;
  sizeBytes: number;
  visionAnalysis?: {
    palette: string[];
    style: string;
    contentType: string;
    description: string;
  };
}

interface DayInventory {
  dayNumber: number;
  folderPath: string;
  existingAssets: AssetItem[];
  hasContent: boolean;
}

interface InventoryScannerProps {
  onScanComplete?: (days: DayInventory[], rootPath: string) => void;
}

const TYPE_ICONS = {
  image: Image,
  video: Video,
  audio: Music,
};

/**
 * Escáner de inventario local de assets.
 * Lee carpetas "Día N" y las analiza con Gemini Vision.
 */
export function InventoryScanner({ onScanComplete }: InventoryScannerProps) {
  const [path, setPath] = useState('');
  const [scanning, setScanning] = useState(false);
  const [days, setDays] = useState<DayInventory[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);

  async function scan() {
    if (!path.trim()) return;
    setScanning(true);
    try {
      const res = await fetch(`/api/inventory?path=${encodeURIComponent(path)}`);
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Error escaneando carpeta');
        return;
      }
      const data = await res.json();
      const scannedDays = data.days || [];
      setDays(scannedDays);
      onScanComplete?.(scannedDays, path);
      const withContent = scannedDays.filter((d: DayInventory) => d.hasContent).length;
      toast.success(`${scannedDays.length} días encontrados · ${withContent} con assets`);
    } catch {
      toast.error('Error de red al escanear');
    } finally {
      setScanning(false);
    }
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Barra de búsqueda */}
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <FolderSearch
            size={14}
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--rai-muted)',
            }}
          />
          <input
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="C:/Users/.../Planificacion_Mayo"
            style={{ paddingLeft: 32 }}
            onKeyDown={(e) => e.key === 'Enter' && scan()}
          />
        </div>
        <button
          onClick={scan}
          disabled={!path.trim() || scanning}
          className="btn btn-secondary"
          style={{ whiteSpace: 'nowrap' }}
        >
          {scanning ? <Spinner size="sm" /> : <Search size={14} />}
          {scanning ? 'Escaneando...' : 'Escanear'}
        </button>
      </div>

      {/* Resultados */}
      {days.length > 0 && (
        <>
          {/* Mini mapa de días */}
          <div>
            <p style={{ fontSize: 12, color: 'var(--rai-muted)', marginBottom: 8 }}>
              {days.filter((d) => d.hasContent).length}/{days.length} días con assets
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {days.map((day) => (
                <div
                  key={day.dayNumber}
                  onClick={() => setExpanded(expanded === day.dayNumber ? null : day.dayNumber)}
                  title={`Día ${day.dayNumber}: ${day.existingAssets.length} archivos`}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 5,
                    background: day.hasContent
                      ? 'var(--rai-gold)'
                      : day.existingAssets.length > 0
                      ? 'var(--rai-muted)'
                      : 'var(--rai-border)',
                    fontSize: 9,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: day.hasContent ? '#000' : '#666',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: expanded === day.dayNumber ? '2px solid var(--rai-gold-br)' : '2px solid transparent',
                    transition: 'var(--transition)',
                  }}
                >
                  {day.dayNumber}
                </div>
              ))}
            </div>
            <p style={{ fontSize: 10, color: 'var(--rai-muted)', marginTop: 6 }}>
              🟡 Con assets &nbsp; ⚫ Vacío — Clic para ver detalle
            </p>
          </div>

          {/* Detalle del día seleccionado */}
          {expanded !== null && (
            () => {
              const day = days.find((d) => d.dayNumber === expanded);
              if (!day) return null;
              return (
                <div
                  style={{
                    background: 'var(--rai-card)',
                    border: '1px solid var(--rai-border)',
                    borderRadius: 8,
                    padding: 14,
                  }}
                >
                  <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
                    Día {day.dayNumber}
                  </p>
                  {day.existingAssets.length === 0 ? (
                    <p style={{ fontSize: 12, color: 'var(--rai-muted)' }}>Sin archivos en esta carpeta</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {day.existingAssets.map((asset, i) => {
                        const Icon = TYPE_ICONS[asset.type as keyof typeof TYPE_ICONS] || Image;
                        return (
                          <div
                            key={i}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              padding: '6px 8px',
                              background: 'var(--rai-dark)',
                              borderRadius: 6,
                            }}
                          >
                            <Icon size={12} color="var(--rai-muted)" />
                            <span style={{ fontSize: 11, color: 'var(--rai-text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {asset.name}
                            </span>
                            <span style={{ fontSize: 10, color: 'var(--rai-muted)', flexShrink: 0 }}>
                              {formatBytes(asset.sizeBytes)}
                            </span>
                          </div>
                        );
                      })}
                      {day.existingAssets[0]?.visionAnalysis && (
                        <div
                          style={{
                            marginTop: 8,
                            padding: '8px 10px',
                            background: 'rgba(123,94,167,0.08)',
                            border: '1px solid rgba(123,94,167,0.2)',
                            borderRadius: 6,
                          }}
                        >
                          <p style={{ fontSize: 10, color: 'var(--rai-purple)', fontWeight: 600, marginBottom: 4 }}>
                            🔍 Análisis de IA
                          </p>
                          <p style={{ fontSize: 11, color: 'var(--rai-muted)', lineHeight: 1.5 }}>
                            {day.existingAssets[0].visionAnalysis.description}
                          </p>
                          <p style={{ fontSize: 10, color: 'var(--rai-muted)', marginTop: 4 }}>
                            Estilo: {day.existingAssets[0].visionAnalysis.style}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            }
          )()}
        </>
      )}
    </div>
  );
}
