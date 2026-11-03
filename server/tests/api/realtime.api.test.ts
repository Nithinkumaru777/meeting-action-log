import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { Router } from 'express';
import fc from 'fast-check';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { closeEventStreams, streamCount, type ChangeEvent } from '../../src/realtime/events';

const RUNS = { numRuns: 100 };
const env = {
  NODE_ENV: 'test',
  CLIENT_ORIGIN: 'http://localhost:5173',
  RATE_LIMIT_PER_MIN: 1e6,
} as const;

// Test-only route: answers with whatever status the test asks for, under a chosen resource name.
const extraRoutes = Router();
extraRoutes.all('/:resource/echo/:status', (req, res) => {
  res.status(Number(req.params.status)).json({ data: null });
});

let server: Server;
let base: string;

beforeAll(async () => {
  server = createApp({ env, extraRoutes }).listen(0);
  await new Promise<void>((r) => server.once('listening', () => r()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
});
afterAll(async () => {
  closeEventStreams();
  await new Promise<void>((r) => server.close(() => r()));
});

/** Opens /api/events and returns a reader that yields parsed `change` events in order. */
async function openStream() {
  const ctrl = new AbortController();
  const res = await fetch(`${base}/events`, { signal: ctrl.signal });
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  const queue: ChangeEvent[] = [];
  let ready = false;
  const pump = async (until: () => boolean) => {
    const deadline = Date.now() + 3000;
    while (!until()) {
      if (Date.now() > deadline) throw new Error('timed out waiting for SSE frame');
      const { value, done } = await reader.read();
      if (done) throw new Error('stream ended');
      buf += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf('\n\n')) !== -1) {
        const frame = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        const event = /^event: (\w+)$/m.exec(frame)?.[1];
        const data = /^data: (.*)$/m.exec(frame)?.[1];
        if (event === 'ready') ready = true;
        if (event === 'change' && data) queue.push(JSON.parse(data) as ChangeEvent);
      }
    }
  };
  await pump(() => ready);
  return {
    res,
    next: async () => {
      await pump(() => queue.length > 0);
      return queue.shift()!;
    },
    /** Resolves once the server ends the stream. */
    ended: async () => {
      while (!(await reader.read()).done);
    },
    close: () => ctrl.abort(),
  };
}

describe('GET /api/events', () => {
  it('responds as an uncached event stream and tracks the connection', async () => {
    const before = streamCount();
    const s = await openStream();
    expect(s.res.status).toBe(200);
    expect(s.res.headers.get('content-type')).toMatch(/^text\/event-stream/);
    expect(s.res.headers.get('cache-control')).toMatch(/no-cache/);
    expect(streamCount()).toBe(before + 1);
    s.close();
    await expect.poll(() => streamCount()).toBe(before);
  });

  it('100 runs: only successful mutations are broadcast, with resource and sanitised origin', async () => {
    const s = await openStream();
    try {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('POST', 'PUT', 'PATCH', 'DELETE', 'GET'),
          fc.constantFrom(200, 201, 204, 400, 404, 409),
          fc.stringMatching(/^[a-z]{1,12}$/),
          fc.option(
            fc.oneof(
              fc.stringMatching(/^[A-Za-z0-9_-]{1,64}$/), // valid -> echoed
              fc.constantFrom('has space', 'x'.repeat(65), 'a/b', '<script>'), // invalid -> null
            ),
            { nil: undefined },
          ),
          async (method, status, resource, clientId) => {
            const headers: Record<string, string> = clientId ? { 'x-client-id': clientId } : {};
            await fetch(`${base}/${resource}/echo/${status}`, { method, headers });
            // Sentinel: always broadcast, so the next frame is either ours or the sentinel.
            await fetch(`${base}/sentinel/echo/201`, { method: 'POST' });

            const broadcastExpected = method !== 'GET' && status < 400;
            const first = await s.next();
            if (broadcastExpected) {
              expect(first.resource).toBe(resource);
              expect(first.method).toBe(method);
              const validId = clientId !== undefined && /^[A-Za-z0-9_-]{1,64}$/.test(clientId);
              expect(first.origin).toBe(validId ? clientId : null);
              expect(new Date(first.at).toISOString()).toBe(first.at);
              expect((await s.next()).resource).toBe('sentinel');
            } else {
              expect(first.resource).toBe('sentinel');
            }
          },
        ),
        RUNS,
      );
    } finally {
      s.close();
    }
  });

  it('closeEventStreams ends every open stream', async () => {
    const a = await openStream();
    const b = await openStream();
    closeEventStreams();
    expect(streamCount()).toBe(0);
    await a.ended();
    await b.ended();
  });
});
