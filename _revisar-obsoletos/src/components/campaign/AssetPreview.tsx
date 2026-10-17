'use client';

import React from 'react';
import { Play, Image as ImageIcon, Film } from 'lucide-react';

interface AssetPreviewProps {
  url: string;
  kind: 'image' | 'video' | 'audio' | 'voice' | 'music' | 'script' | string;
  label?: string;
  compact?: boolean;
}

/**
 * Preview de assets: imagen, video o fallback con ícono.
 */
export function AssetPreview({ url, kind, label, compact = false }: AssetPreviewProps) {
  const [videoPlaying, setVideoPlaying] = React.useState(false);

  if (kind === 'image') {
    return (
      <div
        style={{
          borderRadius: compact ? 6 : 10,
          overflow: 'hidden',
          background: 'var(--rai-dark)',
          border: '1px solid var(--rai-border)',
          width: compact ? 48 : '100%',
          height: compact ? 48 : 200,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={label || 'imagen'}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
    );
  }

  if (kind === 'video') {
    return (
      <div
        style={{
          borderRadius: compact ? 6 : 10,
          overflow: 'hidden',
          background: 'var(--rai-dark)',
          border: '1px solid var(--rai-border)',
          position: 'relative',
          width: compact ? 48 : '100%',
          height: compact ? 48 : 200,
        }}
      >
        {videoPlaying ? (
          <video
            src={url}
            autoPlay
            controls
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              background: 'var(--rai-card)',
            }}
            onClick={() => setVideoPlaying(true)}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'rgba(201,168,76,0.2)',
                border: '1px solid rgba(201,168,76,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Play size={16} color="var(--rai-gold)" />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Audio / otros: mostrar link
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        background: 'var(--rai-card)',
        border: '1px solid var(--rai-border)',
        borderRadius: 6,
        fontSize: 12,
        color: 'var(--rai-gold)',
        textDecoration: 'none',
      }}
    >
      {kind === 'video' ? <Film size={12} /> : <ImageIcon size={12} />}
      {label || kind} ↗
    </a>
  );
}
