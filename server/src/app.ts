import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type Express, type Router } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pino } from 'pino';
import { pinoHttp } from 'pino-http';
import { env as defaultEnv, type Env } from './config/env';
import { requestId } from './middleware/requestId';
import { createRateLimiter } from './middleware/rateLimit';
import { notFound } from './middleware/notFound';
import { errorHandler } from './middleware/errorHandler';
import { apiRouter } from './routes/index.routes';

export interface AppOptions {
  env?: Pick<Env, 'NODE_ENV' | 'CLIENT_ORIGIN' | 'RATE_LIMIT_PER_MIN'>;
  /** Built client to serve in production. Same relative path from src/ and dist/. */
  clientDistDir?: string;
  /** Extra routes mounted under /api before notFound (used by tests). */
  extraRoutes?: Router;
}

const DEFAULT_CLIENT_DIST = fileURLToPath(new URL('../../client/dist', import.meta.url));

export function createApp(options: AppOptions = {}): Express {
  const env = options.env ?? defaultEnv;
  const clientDist = options.clientDistDir ?? DEFAULT_CLIENT_DIST;
  const app = express();
  app.disable('x-powered-by');

  app.use(requestId);
  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_ORIGIN }));
  app.use(express.json({ limit: '100kb' }));
  app.use(
    pinoHttp({
      logger: pino({ level: env.NODE_ENV === 'test' ? 'silent' : 'info' }),
      genReqId: (req) => (req as express.Request).requestId,
    }),
  );
  app.use('/api', createRateLimiter(env.RATE_LIMIT_PER_MIN));
  app.use('/api', apiRouter);
  if (options.extraRoutes) app.use('/api', options.extraRoutes);

  if (env.NODE_ENV === 'production' && existsSync(path.join(clientDist, 'index.html'))) {
    app.use(express.static(clientDist));
    // SPA fallback: any non-API GET returns index.html so client-side routes survive reloads.
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
