import path from 'node:path';
import { config } from 'dotenv';

// Load .env before any module reads process.env (static imports would evaluate first).
// npm workspaces run this with cwd=server/, so the root .env is one level up.
config({ path: [path.resolve('.env'), path.resolve('..', '.env')], quiet: true });

const { env } = await import('./config/env');
const { createApp } = await import('./app');
const { connectDB, registerGracefulShutdown } = await import('./db/connect');
const { MemberModel } = await import('./models/Member');
const { seedDatabase } = await import('./seed/seed');

try {
  const db = await connectDB(env.MONGODB_URI, {
    maxRetries: 2,
    retryDelayMs: 500,
    serverSelectionTimeoutMS: 1500,
    // Never silently swap to a RAM database in production: data would vanish on restart.
    allowMemoryFallback: env.NODE_ENV !== 'production',
  });
  if (db.inMemory) {
    console.warn(
      'MongoDB at MONGODB_URI is unreachable; using an embedded in-memory database and seeding demo data.',
    );
  }
  const existingMembers = await MemberModel.countDocuments({});
  if (existingMembers === 0) {
    await seedDatabase();
    console.info('Database was empty; seeded initial MeetingActionLog demo data.');
  }
} catch (err) {
  console.error((err as Error).message);
  process.exit(1);
}

const server = createApp({ env }).listen(env.PORT, () => {
  console.info(`API listening on http://localhost:${env.PORT}/api (${env.NODE_ENV})`);
});
registerGracefulShutdown(server);
