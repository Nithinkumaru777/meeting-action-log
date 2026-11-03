import { useEffect } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { createStore } from './store';
import { toast } from '../components/feedback/toast-store';

/** Identifies this tab on every API call, so its own changes don't toast back at it. */
export const CLIENT_ID: string =
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `tab-${Math.random().toString(36).slice(2, 14)}`;

export type LiveStatus = 'connecting' | 'live' | 'offline';

export const useLiveStore = createStore<{
  status: LiveStatus;
  set: (s: LiveStatus) => void;
}>((set) => ({ status: 'connecting', set: (status) => set({ status }) }));

export interface ChangeEvent {
  resource: string;
  method: string;
  origin: string | null;
  at: string;
}

const RESOURCE_LABEL: Record<string, string> = {
  actions: 'An action',
  decisions: 'A decision',
  meetings: 'A meeting',
  members: 'The team list',
};

/** Toast copy for a change made in another tab or by a teammate; null = stay quiet. */
export function describeRemoteChange(e: ChangeEvent): string | null {
  // Own keys only: 'constructor' / 'toString' must not resolve through the prototype.
  if (!Object.hasOwn(RESOURCE_LABEL, e.resource)) return null;
  const subject = RESOURCE_LABEL[e.resource];
  return `${subject} was just updated by a teammate. Your view is up to date.`;
}

const REFETCH_DEBOUNCE_MS = 150;
const TOAST_COOLDOWN_MS = 4000;

/**
 * Subscribes to /api/events. Each change refetches active queries (debounced so a burst of
 * writes — e.g. convert creating 5 actions — costs one round of refetches).
 * After a reconnect everything is refetched, since events sent while offline were missed.
 */
export function connectLive(
  qc: QueryClient,
  url = '/api/events',
  now: () => number = Date.now,
): () => void {
  const setStatus = useLiveStore.getState().set;
  if (typeof EventSource === 'undefined') {
    setStatus('offline');
    return () => {};
  }
  const es = new EventSource(url);
  let everConnected = false;
  let refetchTimer: ReturnType<typeof setTimeout> | null = null;
  let lastToastAt = -Infinity;

  const refetch = () => {
    if (refetchTimer) clearTimeout(refetchTimer);
    refetchTimer = setTimeout(() => {
      refetchTimer = null;
      void qc.invalidateQueries();
    }, REFETCH_DEBOUNCE_MS);
  };

  es.addEventListener('ready', () => {
    if (everConnected) refetch();
    everConnected = true;
    setStatus('live');
  });
  es.addEventListener('change', (msg) => {
    let event: ChangeEvent;
    try {
      event = JSON.parse((msg as MessageEvent<string>).data) as ChangeEvent;
    } catch {
      return;
    }
    refetch();
    if (event.origin === CLIENT_ID) return;
    const body = describeRemoteChange(event);
    if (body && now() - lastToastAt >= TOAST_COOLDOWN_MS) {
      lastToastAt = now();
      toast({ title: 'Live update', body, tone: 'info' });
    }
  });
  es.onerror = () => setStatus(es.readyState === EventSource.CLOSED ? 'offline' : 'connecting');

  return () => {
    if (refetchTimer) clearTimeout(refetchTimer);
    es.close();
  };
}

export function useLiveUpdates(): void {
  const qc = useQueryClient();
  useEffect(() => connectLive(qc), [qc]);
}
