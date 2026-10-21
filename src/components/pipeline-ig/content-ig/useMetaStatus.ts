'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/client-api';
import { isRecord } from './utils';

export type MetaState = 'unknown' | 'connected' | 'disconnected';

/** Estado de conexión de Instagram (solo lectura; sin secretos). Si no hay permiso o datos, queda «unknown». */
export function useMetaStatus(): MetaState {
  const [state, setState] = useState<MetaState>('unknown');
  useEffect(() => {
    let cancelled = false;
    apiFetch('/api/workspace/meta')
      .then(async (res) => {
        if (!res.ok) return;
        const body: unknown = await res.json();
        if (cancelled || !isRecord(body)) return;
        setState(body.isConnected === true && typeof body.igBusinessId === 'string' && body.igBusinessId ? 'connected' : 'disconnected');
      })
      .catch(() => { /* indicador opcional */ });
    return () => { cancelled = true; };
  }, []);
  return state;
}
