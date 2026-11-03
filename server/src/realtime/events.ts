import type { RequestHandler, Response } from 'express';

/** One SSE frame per successful write, so every open tab can refetch what changed. */
export interface ChangeEvent {
  resource: string;
  method: string;
  /** x-client-id of the tab that made the change (lets that tab skip its own toast). */
  origin: string | null;
  at: string;
}

// ponytail: per-process client set; use Redis pub/sub (or Mongo change streams) if the API is scaled out.
const clients = new Set<Response>();
export const MAX_STREAMS = 1000;
const HEARTBEAT_MS = 25_000;
const CLIENT_ID = /^[A-Za-z0-9_-]{1,64}$/;
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
let heartbeat: NodeJS.Timeout | null = null;

export function streamCount(): number {
  return clients.size;
}

export function broadcast(event: ChangeEvent): void {
  const frame = `event: change\ndata: ${JSON.stringify(event)}\n\n`;
  for (const res of clients) res.write(frame);
}

function drop(res: Response): void {
  clients.delete(res);
  if (clients.size === 0 && heartbeat) {
    clearInterval(heartbeat);
    heartbeat = null;
  }
}

/** GET /api/events — long-lived text/event-stream. */
export const eventsStream: RequestHandler = (req, res) => {
  if (clients.size >= MAX_STREAMS) {
    res.status(429).json({
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many live connections. Try again shortly.',
        requestId: req.requestId || 'unknown',
      },
    });
    return;
  }
  res.status(200).set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // stop nginx-style proxies from buffering the stream
  });
  res.flushHeaders();
  res.write('retry: 3000\n\nevent: ready\ndata: {}\n\n');
  clients.add(res);
  if (!heartbeat) {
    heartbeat = setInterval(() => {
      for (const c of clients) c.write(': ping\n\n');
    }, HEARTBEAT_MS);
    heartbeat.unref();
  }
  req.on('close', () => drop(res));
};

/** After any successful mutating /api request, tell every connected tab. */
export const broadcastMutations: RequestHandler = (req, res, next) => {
  if (MUTATING.has(req.method)) {
    res.on('finish', () => {
      if (res.statusCode >= 400) return;
      // originalUrl = /api/<resource>/... — routers rewrite req.url, so read the original.
      const resource = req.originalUrl.split('?')[0]?.split('/')[2] ?? '';
      const origin = req.get('x-client-id');
      broadcast({
        resource,
        method: req.method,
        origin: origin && CLIENT_ID.test(origin) ? origin : null,
        at: new Date().toISOString(),
      });
    });
  }
  next();
};

/** Ends every open stream so server.close() can finish during shutdown. */
export function closeEventStreams(): void {
  for (const res of clients) {
    res.end();
    drop(res);
  }
}
