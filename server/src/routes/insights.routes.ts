import { Router } from 'express';
import { listQueryUnconvertedSchema, listQueryWeeklySchema } from '@mal/shared';
import {
  getOverdue,
  getSummary,
  getUnconvertedDecisions,
  getWeeklyCompletion,
} from '../controllers/insights.controller';
import { validate } from '../middleware/validate';

export const insightsRouter = Router();

insightsRouter.get('/summary', getSummary);
insightsRouter.get('/overdue', getOverdue);
insightsRouter.get(
  '/unconverted-decisions',
  validate({ query: listQueryUnconvertedSchema }),
  getUnconvertedDecisions,
);
insightsRouter.get(
  '/weekly-completion',
  validate({ query: listQueryWeeklySchema }),
  getWeeklyCompletion,
);
