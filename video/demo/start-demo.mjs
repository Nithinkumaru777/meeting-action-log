// Demo mode: a throwaway in-memory MongoDB on port 27099, seeded, with the unmodified production build on :5000.
//   node video/demo/start-demo.mjs      (run `npm run build` first; Ctrl+C stops everything)
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { MongoMemoryServer } from 'mongodb-memory-server';

const ROOT = path.resolve(import.meta.dirname, '../..');
const URI = 'mongodb://127.0.0.1:27099/mal_demo';

const mongo = await MongoMemoryServer.create({ instance: { port: 27099, dbName: 'mal_demo' } });
const env = { ...process.env, NODE_ENV: 'production', PORT: '5000', MONGODB_URI: URI, CLIENT_ORIGIN: 'http://localhost:5000', RATE_LIMIT_PER_MIN: '100000' };

const seeded = spawnSync('npx', ['tsx', 'video/demo/seed.ts'], { cwd: ROOT, env, stdio: 'inherit', shell: true });
if (seeded.status !== 0) {
  await mongo.stop();
  process.exit(seeded.status ?? 1);
}

const server = spawn('node', ['server/dist/server.js'], { cwd: ROOT, env, stdio: 'inherit' });
const stop = async () => {
  server.kill();
  await mongo.stop();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
server.on('exit', async (code) => {
  await mongo.stop();
  process.exit(code ?? 0);
});
