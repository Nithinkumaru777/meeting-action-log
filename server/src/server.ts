import path from 'node:path';
import { config } from 'dotenv';

// Load .env before any module reads process.env (static imports would evaluate first).
// npm workspaces run this with cwd=server/, so the root .env is one level up.
config({ path: [path.resolve('.env'), path.resolve('..', '.env')], quiet: true });

const { env } = await import('./config/env');
const { createApp } = await import('./app');
const { connectDB, registerGracefulShutdown } = await import('./db/connect');

try {
  const db = await connectDB(env.MONGODB_URI, {
    maxRetries: 3,
    retryDelayMs: 1000,
    serverSelectionTimeoutMS: 2000,
    allowMemoryFallback: env.NODE_ENV !== 'production',
  });
  if (db.inMemory)
    console.warn(
      'MongoDB at MONGODB_URI is unreachable; using an embedded in-memory database. Data is lost on exit.',
    );
} catch (err) {
  console.error((err as Error).message);
  process.exit(1);
}

const server = createApp({ env }).listen(env.PORT, () => {
  console.info(`API listening on http://localhost:${env.PORT}/api (${env.NODE_ENV})`);
});
registerGracefulShutdown(server);
