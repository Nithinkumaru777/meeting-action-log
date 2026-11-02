import { Router } from 'express';
import { getDbHealth } from '../db/connect';
import { meetingsRouter } from './meetings.routes';
import { membersRouter } from './members.routes';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ data: { status: 'ok', db: getDbHealth(), time: new Date().toISOString() } });
});

apiRouter.use('/members', membersRouter);
apiRouter.use('/meetings', meetingsRouter);
