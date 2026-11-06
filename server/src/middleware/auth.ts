import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';
import { verifyAuthToken } from '../utils/auth';
import { UserModel, type UserDoc } from '../models/User';

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      user?: UserDoc;
      tokenPayload?: { uid: string; memberId: string; email: string };
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next();
  }
  const token = header.slice(7).trim();
  const payload = verifyAuthToken(token);
  if (!payload) {
    return next();
  }
  try {
    const user = await UserModel.findById(payload.uid);
    if (user) {
      req.user = user;
      req.tokenPayload = payload;
    }
  } catch {
    // Ignore database errors during optional auth
  }
  next();
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  await optionalAuth(req, res, () => {
    if (!req.user) {
      return next(new ApiError('VALIDATION_ERROR', 401, 'Authentication required. Please log in.'));
    }
    next();
  });
}
