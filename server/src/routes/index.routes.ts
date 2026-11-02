import { Router } from 'express';
import { getDbHealth } from '../db/connect';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ data: { status: 'ok', db: getDbHealth(), time: new Date().toISOString() } });
});

// Resource routers (members, meetings, decisions, actions, insights) mount here in later steps.
