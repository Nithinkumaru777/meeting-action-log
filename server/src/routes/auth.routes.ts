import { Router } from 'express';
import { loginSchema, registerSchema, updateProfileSchema } from '@mal/shared';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';

export const authRouter = Router();

authRouter.post('/register', validate({ body: registerSchema }), AuthController.register);
authRouter.post('/login', validate({ body: loginSchema }), AuthController.login);
authRouter.get('/me', requireAuth, AuthController.me);
authRouter.patch(
  '/profile',
  requireAuth,
  validate({ body: updateProfileSchema }),
  AuthController.updateProfile,
);
authRouter.get('/demo-users', AuthController.demoUsers);
