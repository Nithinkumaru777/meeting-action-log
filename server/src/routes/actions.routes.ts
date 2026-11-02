import { Router } from 'express';
import {
  actionExtendSchema,
  actionStatusSchema,
  actionUpdateSchema,
  idParamSchema,
  listQueryActionsSchema,
} from '@mal/shared';
import {
  deleteAction,
  extendAction,
  getAction,
  listActions,
  setActionStatus,
  updateAction,
} from '../controllers/actions.controller';
import { validate } from '../middleware/validate';

export const actionsRouter = Router();

actionsRouter.get('/', validate({ query: listQueryActionsSchema }), listActions);
actionsRouter.get('/:id', validate({ params: idParamSchema }), getAction);
actionsRouter.patch(
  '/:id',
  validate({ params: idParamSchema, body: actionUpdateSchema }),
  updateAction,
);
actionsRouter.delete('/:id', validate({ params: idParamSchema }), deleteAction);
actionsRouter.patch(
  '/:id/status',
  validate({ params: idParamSchema, body: actionStatusSchema }),
  setActionStatus,
);
actionsRouter.post(
  '/:id/extend',
  validate({ params: idParamSchema, body: actionExtendSchema }),
  extendAction,
);
