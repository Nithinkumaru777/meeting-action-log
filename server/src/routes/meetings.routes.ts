import { Router } from 'express';
import {
  actionCreateSchema,
  decisionCreateSchema,
  idParamSchema,
  listQueryMeetingActionsSchema,
  listQueryMeetingDecisionsSchema,
  listQueryMeetingsSchema,
  meetingCreateSchema,
  meetingUpdateSchema,
} from '@mal/shared';
import { createMeetingAction, listMeetingActions } from '../controllers/actions.controller';
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

meetingsRouter.get(
  '/:id/actions',
  validate({ params: idParamSchema, query: listQueryMeetingActionsSchema }),
  listMeetingActions,
);
meetingsRouter.post(
  '/:id/actions',
  validate({ params: idParamSchema, body: actionCreateSchema }),
  createMeetingAction,
);
