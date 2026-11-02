import type { Request, Response } from 'express';
import type {
  DecisionConvert,
  DecisionCreate,
  DecisionDismiss,
  DecisionUpdate,
  ListQueryDecisions,
  ListQueryMeetingDecisions,
} from '@mal/shared';
import { decisionsService } from '../services/decisions.service';

export async function listMeetingDecisions(req: Request, res: Response): Promise<void> {
  const { id } = req.valid.params as { id: string };
  const query = req.valid.query as ListQueryMeetingDecisions;
  const data = await decisionsService.listByMeeting(id, query);
  res.json({ data });
}

export async function createMeetingDecision(req: Request, res: Response): Promise<void> {
  const { id } = req.valid.params as { id: string };
  const body = req.valid.body as DecisionCreate;
  const data = await decisionsService.create(id, body);
  res.status(201).json({ data });
}

export async function listDecisions(req: Request, res: Response): Promise<void> {
  const query = req.valid.query as ListQueryDecisions;
  const result = await decisionsService.list(query);
  res.json(result);
}

export async function getDecision(req: Request, res: Response): Promise<void> {
  const { id } = req.valid.params as { id: string };
  const data = await decisionsService.get(id);
  res.json({ data });
}

export async function updateDecision(req: Request, res: Response): Promise<void> {
  const { id } = req.valid.params as { id: string };
  const body = req.valid.body as DecisionUpdate;
  const data = await decisionsService.update(id, body);
  res.json({ data });
}

export async function deleteDecision(req: Request, res: Response): Promise<void> {
  const { id } = req.valid.params as { id: string };
  await decisionsService.remove(id);
  res.status(204).end();
}

export async function convertDecision(req: Request, res: Response): Promise<void> {
  const { id } = req.valid.params as { id: string };
  const body = req.valid.body as DecisionConvert;
  const data = await decisionsService.convert(id, body);
  res.status(201).json({ data });
}

export async function dismissDecision(req: Request, res: Response): Promise<void> {
  const { id } = req.valid.params as { id: string };
  const body = (req.valid.body ?? {}) as DecisionDismiss;
  const data = await decisionsService.dismiss(id, body);
  res.json({ data });
}

export async function reopenDecision(req: Request, res: Response): Promise<void> {
  const { id } = req.valid.params as { id: string };
  const data = await decisionsService.reopen(id);
  res.json({ data });
}
