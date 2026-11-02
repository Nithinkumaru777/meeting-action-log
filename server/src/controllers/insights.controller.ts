import type { Request, Response } from 'express';
import type { ListQueryUnconverted, ListQueryWeekly } from '@mal/shared';
import { insightsService } from '../services/insights.service';

export async function getSummary(_req: Request, res: Response): Promise<void> {
  const data = await insightsService.getSummary();
  res.json({ data });
}

export async function getOverdue(_req: Request, res: Response): Promise<void> {
  const data = await insightsService.getOverdueByOwner();
  res.json({ data });
}

export async function getUnconvertedDecisions(req: Request, res: Response): Promise<void> {
  const query = req.valid.query as ListQueryUnconverted;
  const data = await insightsService.getUnconvertedDecisions(query);
  res.json({ data });
}

export async function getWeeklyCompletion(req: Request, res: Response): Promise<void> {
  const query = req.valid.query as ListQueryWeekly;
  const data = await insightsService.getWeeklyCompletion(query);
  res.json({ data });
}
