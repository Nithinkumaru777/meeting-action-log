import { Router } from 'express';
import {
  decisionConvertSchema,
  decisionDismissSchema,
  decisionUpdateSchema,
  idParamSchema,
  listQueryDecisionsSchema,
} from '@mal/shared';
import {
  convertDecision,
  deleteDecision,
  dismissDecision,
  getDecision,
  listDecisions,
  reopenDecision,
  updateDecision,
} from '../controllers/decisions.controller';
import { validate } from '../middleware/validate';

export const decisionsRouter = Router();

decisionsRouter.get('/', validate({ query: listQueryDecisionsSchema }), listDecisions);
decisionsRouter.get('/:id', validate({ params: idParamSchema }), getDecision);
decisionsRouter.patch(
  '/:id',
  validate({ params: idParamSchema, body: decisionUpdateSchema }),
  updateDecision,
);
decisionsRouter.delete('/:id', validate({ params: idParamSchema }), deleteDecision);
decisionsRouter.post(
  '/:id/convert',
  validate({ params: idParamSchema, body: decisionConvertSchema }),
  convertDecision,
);
decisionsRouter.post(
  '/:id/dismiss',
  validate({ params: idParamSchema, body: decisionDismissSchema }),
  dismissDecision,
);
decisionsRouter.post('/:id/reopen', validate({ params: idParamSchema }), reopenDecision);
