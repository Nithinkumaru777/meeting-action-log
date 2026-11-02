import type { Request, Response } from 'express';
import type { ListQueryMeetings, MeetingCreate, MeetingUpdate } from '@mal/shared';
import { meetingsService } from '../services/meetings.service';

export async function listMeetings(req: Request, res: Response): Promise<void> {
  const query = req.valid.query as ListQueryMeetings;
  const result = await meetingsService.list(query);
  res.json(result);
}

export async function createMeeting(req: Request, res: Response): Promise<void> {
  const body = req.valid.body as MeetingCreate;
  const data = await meetingsService.create(body);
  res.status(201).json({ data });
}

export async function getMeeting(req: Request, res: Response): Promise<void> {
  const { id } = req.valid.params as { id: string };
  const data = await meetingsService.getWithDetails(id);
  res.json({ data });
}

export async function updateMeeting(req: Request, res: Response): Promise<void> {
  const { id } = req.valid.params as { id: string };
  const body = req.valid.body as MeetingUpdate;
  const data = await meetingsService.update(id, body);
  res.json({ data });
}

export async function deleteMeeting(req: Request, res: Response): Promise<void> {
  const { id } = req.valid.params as { id: string };
  await meetingsService.remove(id);
  res.status(204).end();
}
