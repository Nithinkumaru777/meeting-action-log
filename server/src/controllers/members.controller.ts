import type { Request, Response } from 'express';
import type { ListQueryMembers, MemberCreate, MemberUpdate } from '@mal/shared';
import { membersService } from '../services/members.service';

export async function listMembers(req: Request, res: Response): Promise<void> {
  const query = req.valid.query as ListQueryMembers;
  const result = await membersService.list(query);
  res.json(result);
}

export async function createMember(req: Request, res: Response): Promise<void> {
  const body = req.valid.body as MemberCreate;
  const data = await membersService.create(body);
  res.status(201).json({ data });
}

export async function getMember(req: Request, res: Response): Promise<void> {
  const { id } = req.valid.params as { id: string };
  const data = await membersService.get(id);
  res.json({ data });
}

export async function updateMember(req: Request, res: Response): Promise<void> {
  const { id } = req.valid.params as { id: string };
  const body = req.valid.body as MemberUpdate;
  const data = await membersService.update(id, body);
  res.json({ data });
}

export async function deleteMember(req: Request, res: Response): Promise<void> {
  const { id } = req.valid.params as { id: string };
  await membersService.remove(id);
  res.status(204).end();
}
