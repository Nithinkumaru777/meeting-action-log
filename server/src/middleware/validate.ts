import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { ApiError, zodIssuesToDetails } from '../utils/ApiError';

export interface Valid<P = unknown, Q = unknown, B = unknown> {
  params: P;
  query: Q;
  body: B;
}

declare module 'express-serve-static-core' {
  interface Request {
    valid: Valid;
  }
}

const ID_KEY = /^(id|.+Id)$/;

/**
 * Parses params/query/body with zod and stores the results on `req.valid`.
 * Express 5 exposes `req.query` as a getter, so it is never reassigned.
 */
export function validate<P = unknown, Q = unknown, B = unknown>(schemas: {
  params?: ZodType<P>;
  query?: ZodType<Q>;
  body?: ZodType<B>;
}): RequestHandler {
  return (req, _res, next) => {
    req.valid = { params: req.params, query: req.query, body: req.body };

    if (schemas.params) {
      const r = schemas.params.safeParse(req.params);
      if (!r.success) {
        const details = zodIssuesToDetails(r.error.issues);
        const idIssue = r.error.issues.find(
          (i) =>
            (i.code === 'invalid_format' || i.code === 'invalid_type') &&
            ID_KEY.test(String(i.path.at(-1) ?? '')),
        );
        throw idIssue
          ? ApiError.invalidId(idIssue.message, details)
          : ApiError.validation('Invalid route parameters.', details);
      }
      req.valid.params = r.data;
    }

    if (schemas.query) {
      const r = schemas.query.safeParse(req.query);
      if (!r.success)
        throw ApiError.validation('Invalid query parameters.', zodIssuesToDetails(r.error.issues));
      req.valid.query = r.data;
    }

    if (schemas.body) {
      const r = schemas.body.safeParse(req.body ?? {});
      if (!r.success)
        throw ApiError.validation(
          'Check the highlighted fields.',
          zodIssuesToDetails(r.error.issues),
        );
      req.valid.body = r.data;
      req.body = r.data;
    }

    next();
  };
}
