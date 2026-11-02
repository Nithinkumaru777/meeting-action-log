import { rateLimit } from 'express-rate-limit';
import type { RequestHandler } from 'express';

// ponytail: in-memory store is per process; switch to a shared store (Redis) if the API is scaled out.
export function createRateLimiter(maxPerMin: number): RequestHandler {
  return rateLimit({
    windowMs: 60_000,
    limit: maxPerMin,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please slow down and try again.',
          requestId: req.requestId || 'unknown',
        },
      });
    },
  });
}
