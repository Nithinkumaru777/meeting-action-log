import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { ApiError, zodIssuesToDetails, type ErrorCode, type ErrorDetail } from '../utils/ApiError';

type Loose = { type?: unknown; status?: unknown; code?: unknown; name?: unknown };

function send(
  res: Response,
  status: number,
  code: ErrorCode,
  message: string,
  requestId: string,
  details?: ErrorDetail[],
) {
  res.status(status).json({ error: { code, message, ...(details ? { details } : {}), requestId } });
}

/** Single place that turns any thrown value into `{ error: { code, message, details?, requestId } }`. */
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) return next(err);
  const requestId = req.requestId || 'unknown';
  const e = (typeof err === 'object' && err !== null ? err : {}) as Loose;

  if (err instanceof ApiError)
    return send(res, err.status, err.code, err.message, requestId, err.details);

  if (e.type === 'entity.too.large' || e.status === 413)
    return send(res, 413, 'VALIDATION_ERROR', 'Request body exceeds the 100kb limit.', requestId);

  if (err instanceof SyntaxError && 'body' in err)
    return send(res, 400, 'VALIDATION_ERROR', 'Request body is not valid JSON.', requestId);

  if (err instanceof ZodError)
    return send(
      res,
      400,
      'VALIDATION_ERROR',
      'Check the highlighted fields.',
      requestId,
      zodIssuesToDetails(err.issues),
    );

  if (e.name === 'CastError') return send(res, 400, 'INVALID_ID', 'Invalid identifier.', requestId);

  if (e.code === 11000)
    return send(res, 409, 'CONFLICT', 'A record with that value already exists.', requestId);

  // Other body-parser client errors (unsupported charset/encoding, aborted request).
  if (
    typeof e.type === 'string' &&
    typeof e.status === 'number' &&
    e.status >= 400 &&
    e.status < 500
  )
    return send(res, e.status, 'VALIDATION_ERROR', 'Request body could not be read.', requestId);

  req.log?.error({ err, requestId }, 'Unhandled error');
  return send(res, 500, 'INTERNAL', 'An unexpected error occurred.', requestId);
}
