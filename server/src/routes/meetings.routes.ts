import { Router } from 'express';
import {
  idParamSchema,
  listQueryMeetingsSchema,
  meetingCreateSchema,
  meetingUpdateSchema,
} from '@mal/shared';
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
