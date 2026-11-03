import { Router } from 'express';
import { getDbHealth } from '../db/connect';
import { actionsRouter } from './actions.routes';
import { decisionsRouter } from './decisions.routes';
import { insightsRouter } from './insights.routes';
import { meetingsRouter } from './meetings.routes';
import { membersRouter } from './members.routes';
import { eventsStream } from '../realtime/events';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ data: { status: 'ok', db: getDbHealth(), time: new Date().toISOString() } });
});

apiRouter.get('/events', eventsStream);

apiRouter.use('/members', membersRouter);
apiRouter.use('/meetings', meetingsRouter);
apiRouter.use('/decisions', decisionsRouter);
apiRouter.use('/actions', actionsRouter);
apiRouter.use('/insights', insightsRouter);
