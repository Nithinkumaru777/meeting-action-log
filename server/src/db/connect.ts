import type { Server } from 'node:http';
import { setTimeout as sleep } from 'node:timers/promises';
import mongoose from 'mongoose';
import type { MongoMemoryServer } from 'mongodb-memory-server';

export interface ConnectOptions {
  maxRetries?: number;
  retryDelayMs?: number;
  serverSelectionTimeoutMS?: number;
  /** Start an embedded MongoMemoryServer when a local (127.0.0.1/localhost) URI is unreachable. */
  allowMemoryFallback?: boolean;
}

export interface ConnectResult {
  uri: string;
  inMemory: boolean;
  attempts: number;
}

let memoryServer: MongoMemoryServer | null = null;

/** True for single-host URIs pointing at this machine. Multi-host / SRV URIs are never local. */
export function isLocalMongoUri(uri: string): boolean {
  try {
    const { protocol, hostname } = new URL(uri);
    return protocol === 'mongodb:' && ['127.0.0.1', 'localhost', '[::1]'].includes(hostname);
  } catch {
    return false;
  }
}

/** Only called after isLocalMongoUri() succeeded, so the URI is known to parse. */
function dbNameOf(uri: string): string {
  return decodeURIComponent(new URL(uri).pathname.slice(1)) || 'meeting_action_log';
}

export async function connectDB(uri: string, options: ConnectOptions = {}): Promise<ConnectResult> {
  const {
    maxRetries = 3,
    retryDelayMs = 1000,
    serverSelectionTimeoutMS = 2000,
    allowMemoryFallback = false,
  } = options;
  if (!Number.isInteger(maxRetries) || maxRetries < 1)
    throw new RangeError('maxRetries must be an integer >= 1');

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS });
      return { uri, inMemory: false, attempts: attempt };
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) await sleep(retryDelayMs);
    }
  }

  if (allowMemoryFallback && isLocalMongoUri(uri)) {
    // Lazy import: the binary download/launch cost is only paid when the fallback is used.
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    const memUri = memoryServer.getUri(dbNameOf(uri));
    await mongoose.connect(memUri);
    return { uri: memUri, inMemory: true, attempts: maxRetries };
  }

  const reason = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`Could not connect to MongoDB after ${maxRetries} attempt(s): ${reason}`);
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}

export function getDbHealth(): 'up' | 'down' {
  return mongoose.connection.readyState === mongoose.ConnectionStates.connected ? 'up' : 'down';
}

/** Closes the HTTP server and the DB on SIGINT/SIGTERM. Returns the shutdown function. */
export function registerGracefulShutdown(
  server?: Server,
  exit: (code: number) => void = (code) => process.exit(code),
): (signal: string) => Promise<void> {
  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.info(`${signal} received, shutting down.`);
    try {
      if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
      await disconnectDB();
      exit(0);
    } catch (err) {
      console.error('Shutdown failed:', err);
      exit(1);
    }
  };
  for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, shutdown);
  return shutdown;
}
