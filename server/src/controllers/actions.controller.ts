import type { Request, Response } from 'express';
import type {
  ActionCreate,
  ActionExtend,
  ActionStatusBody,
  ActionUpdate,
  ListQueryActions,
  ListQueryMeetingActions,
} from '@mal/shared';
import { actionsService } from '../services/actions.service';

export async function listMeetingActions(req: Request, res: Response): Promise<void> {
  const { id } = req.valid.params as { id: string };
  const query = req.valid.query as ListQueryMeetingActions;
  const data = await actionsService.listByMeeting(id, query);
  res.json({ data });
}

export async function createMeetingAction(req: Request, res: Response): Promise<void> {
  const { id } = req.valid.params as { id: string };
  const body = req.valid.body as ActionCreate;
  const data = await actionsService.create(id, body);
  res.status(201).json({ data });
}

export async function listActions(req: Request, res: Response): Promise<void> {
  const query = req.valid.query as ListQueryActions;
  const result = await actionsService.list(query);
  res.json(result);
}

export async function getAction(req: Request, res: Response): Promise<void> {
  const { id } = req.valid.params as { id: string };
  const data = await actionsService.get(id);
  res.json({ data });
}

export async function updateAction(req: Request, res: Response): Promise<void> {
  const { id } = req.valid.params as { id: string };
  const body = req.valid.body as ActionUpdate;
  const data = await actionsService.update(id, body);
  res.json({ data });
}

export async function deleteAction(req: Request, res: Response): Promise<void> {
  const { id } = req.valid.params as { id: string };
  await actionsService.remove(id);
  res.status(204).end();
}

export async function setActionStatus(req: Request, res: Response): Promise<void> {
  const { id } = req.valid.params as { id: string };
  const body = req.valid.body as ActionStatusBody;
  const data = await actionsService.setStatus(id, body);
  res.json({ data });
}

export async function extendAction(req: Request, res: Response): Promise<void> {
  const { id } = req.valid.params as { id: string };
  const body = req.valid.body as ActionExtend;
  const data = await actionsService.extend(id, body);
  res.json({ data });
}
