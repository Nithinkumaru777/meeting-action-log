import type { RequestHandler } from 'express';
import { ApiError } from '../utils/ApiError';

export const notFound: RequestHandler = (req) => {
  throw ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found.`);
};
