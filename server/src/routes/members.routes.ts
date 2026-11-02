import { Router } from 'express';
import {
  idParamSchema,
  listQueryMembersSchema,
  memberCreateSchema,
  memberUpdateSchema,
} from '@mal/shared';
import {
  createMember,
  deleteMember,
  getMember,
  listMembers,
  updateMember,
} from '../controllers/members.controller';
import { validate } from '../middleware/validate';

export const membersRouter = Router();

membersRouter.get('/', validate({ query: listQueryMembersSchema }), listMembers);
membersRouter.post('/', validate({ body: memberCreateSchema }), createMember);
membersRouter.get('/:id', validate({ params: idParamSchema }), getMember);
membersRouter.patch(
  '/:id',
  validate({ params: idParamSchema, body: memberUpdateSchema }),
  updateMember,
);
membersRouter.delete('/:id', validate({ params: idParamSchema }), deleteMember);
