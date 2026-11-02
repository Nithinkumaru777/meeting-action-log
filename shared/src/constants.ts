export const APP_NAME = 'MeetingActionLog';
export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

export const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const ACTION_STATUSES = ['open', 'in-progress', 'blocked', 'done'] as const;
export type ActionStatus = (typeof ACTION_STATUSES)[number];

export const DECISION_STATUSES = ['pending', 'converted', 'no-action'] as const;
export type DecisionStatus = (typeof DECISION_STATUSES)[number];

/** API error code -> HTTP status (CLAUDE.md section 7). */
export const ERROR_CODES = {
  VALIDATION_ERROR: 400,
  INVALID_ID: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
} as const;
export type ErrorCode = keyof typeof ERROR_CODES;
