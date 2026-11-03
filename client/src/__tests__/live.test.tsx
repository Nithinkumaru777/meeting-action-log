import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import fc from 'fast-check';
import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { CLIENT_ID, connectLive, describeRemoteChange, useLiveStore } from '../lib/live';
import { LiveIndicator } from '../components/layout/app-shell';
import { useToastStore } from '../components/feedback/toast-store';

/** Minimal EventSource stand-in: tests drive frames through emit(). */
class FakeEventSource {
  static CLOSED = 2;
  static last: FakeEventSource | null = null;
  readyState = 1;
  onerror: (() => void) | null = null;
  closed = false;
  private handlers = new Map<string, ((e: { data: string }) => void)[]>();
  constructor(public url: string) {
    FakeEventSource.last = this;
  }
  addEventListener(type: string, fn: (e: { data: string }) => void) {
    this.handlers.set(type, [...(this.handlers.get(type) ?? []), fn]);
  }
  emit(type: string, data: unknown = {}) {
    for (const fn of this.handlers.get(type) ?? []) fn({ data: JSON.stringify(data) });
  }
  close() {
    this.closed = true;
  }
}

const change = (resource: string, origin: string | null) => ({
  resource,
  method: 'PATCH',
  origin,
  at: new Date().toISOString(),
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('EventSource', FakeEventSource);
  useToastStore.getState().clear();
  useLiveStore.getState().set('connecting');
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('live updates', () => {
  test('describeRemoteChange: known resources get copy, anything else stays quiet', () => {
    fc.assert(
      fc.property(fc.string(), fc.constantFrom(null, 'abc'), (resource, origin) => {
        const out = describeRemoteChange(change(resource, origin));
        const known = ['actions', 'decisions', 'meetings', 'members'].includes(resource);
        expect(out === null).toBe(!known);
        if (out) expect(out).toMatch(/updated by a teammate/);
      }),
      { numRuns: 100 },
    );
  });

  test(
    'bursts refetch once, own changes never toast, remote toasts are throttled',
    { repeats: 100 },
    () => {
      const qc = new QueryClient();
      const invalidate = vi.spyOn(qc, 'invalidateQueries').mockResolvedValue();
      let clock = 0;
      const stop = connectLive(qc, '/api/events', () => clock);
      const es = FakeEventSource.last!;

      es.emit('ready');
      expect(useLiveStore.getState().status).toBe('live');
      expect(invalidate).not.toHaveBeenCalled(); // first connect: nothing missed

      const burst = fc.sample(fc.integer({ min: 1, max: 8 }), 1)[0]!;
      for (let i = 0; i < burst; i++) es.emit('change', change('actions', CLIENT_ID));
      vi.advanceTimersByTime(200);
      expect(invalidate).toHaveBeenCalledTimes(1);
      expect(useToastStore.getState().toasts).toHaveLength(0);

      es.emit('change', change('decisions', 'someone-else'));
      es.emit('change', change('meetings', 'someone-else')); // inside cooldown
      expect(useToastStore.getState().toasts).toHaveLength(1);
      clock += 4000;
      es.emit('change', change('members', 'someone-else'));
      expect(useToastStore.getState().toasts).toHaveLength(2);

      es.emit('change', 'not json{'); // ignored, no throw
      es.onerror?.();
      expect(useLiveStore.getState().status).toBe('connecting');
      invalidate.mockClear();
      es.emit('ready'); // reconnect -> refetch what was missed
      vi.advanceTimersByTime(200);
      expect(invalidate).toHaveBeenCalledTimes(1);

      es.readyState = FakeEventSource.CLOSED;
      es.onerror?.();
      expect(useLiveStore.getState().status).toBe('offline');
      stop();
      expect(es.closed).toBe(true);
    },
  );

  test('no EventSource support -> offline, no throw', () => {
    vi.stubGlobal('EventSource', undefined);
    connectLive(new QueryClient())();
    expect(useLiveStore.getState().status).toBe('offline');
  });

  test('LiveIndicator renders the current status', { repeats: 100 }, () => {
    const status = fc.sample(fc.constantFrom('live', 'connecting', 'offline' as const), 1)[0]!;
    act(() => useLiveStore.getState().set(status));
    render(<LiveIndicator />);
    const el = screen.getByRole('status');
    expect(el).toHaveAttribute('data-state', status);
    expect(el).toHaveTextContent(
      { live: 'Live', connecting: 'Reconnecting', offline: 'Offline' }[status],
    );
  });
});
