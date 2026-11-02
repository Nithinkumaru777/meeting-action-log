import { Router } from 'express';
import {
  decisionCreateSchema,
  idParamSchema,
  listQueryMeetingDecisionsSchema,
  listQueryMeetingsSchema,
  meetingCreateSchema,
  meetingUpdateSchema,
} from '@mal/shared';
import { createMeetingDecision, listMeetingDecisions } from '../controllers/decisions.controller';
import {
  createMeeting,
  deleteMeeting,
  getMeeting,
  listMeetings,
  updateMeeting,
} from '../controllers/meetings.controller';
import { validate } from '../middleware/validate';

export const meetingsRouter = Router();

meetingsRouter.get('/', validate({ query: listQueryMeetingsSchema }), listMeetings);
meetingsRouter.post('/', validate({ body: meetingCreateSchema }), createMeeting);
meetingsRouter.get('/:id', validate({ params: idParamSchema }), getMeeting);
meetingsRouter.patch(
  '/:id',
  validate({ params: idParamSchema, body: meetingUpdateSchema }),
  updateMeeting,
);
meetingsRouter.delete('/:id', validate({ params: idParamSchema }), deleteMeeting);

meetingsRouter.get(
  '/:id/decisions',
  validate({ params: idParamSchema, query: listQueryMeetingDecisionsSchema }),
  listMeetingDecisions,
);
meetingsRouter.post(
  '/:id/decisions',
  validate({ params: idParamSchema, body: decisionCreateSchema }),
  createMeetingDecision,
);
