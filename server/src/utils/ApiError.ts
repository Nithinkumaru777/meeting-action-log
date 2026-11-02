import type { core } from 'zod';
import type { ErrorCode } from '@mal/shared';

export type { ErrorCode };

export interface ErrorDetail {
  path: string;
  message: string;
}

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: ErrorDetail[];

  constructor(code: ErrorCode, status: number, message: string, details?: ErrorDetail[]) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    if (details?.length) this.details = details;
  }

  static validation(message: string, details?: ErrorDetail[]) {
    return new ApiError('VALIDATION_ERROR', 400, message, details);
  }
  static invalidId(message = 'Invalid identifier.', details?: ErrorDetail[]) {
    return new ApiError('INVALID_ID', 400, message, details);
  }
  static notFound(message = 'Resource not found.') {
    return new ApiError('NOT_FOUND', 404, message);
  }
  static conflict(message: string) {
    return new ApiError('CONFLICT', 409, message);
  }
  static rateLimited(message: string) {
    return new ApiError('RATE_LIMITED', 429, message);
  }
  static payloadTooLarge(message: string) {
    return new ApiError('VALIDATION_ERROR', 413, message);
  }
  static internal(message = 'An unexpected error occurred.') {
    return new ApiError('INTERNAL', 500, message);
  }
}

/** Zod issues -> `[{ path: 'a.b', message }]`. Unknown-key issues point at the offending keys. */
export function zodIssuesToDetails(issues: readonly core.$ZodIssue[]): ErrorDetail[] {
  return issues.map((i) => ({
    path: i.path.map(String).join('.') || (i.code === 'unrecognized_keys' ? i.keys.join(',') : ''),
    message: i.message,
  }));
}
