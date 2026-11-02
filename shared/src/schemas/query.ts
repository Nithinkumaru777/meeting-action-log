import { z } from 'zod';
import { ACTION_STATUSES, DECISION_STATUSES } from '../constants';
import { isoDateField, objectIdSchema } from './common';

/** Query-string integer: digits only (rejects '', '1e2', '-1', '2.5', arrays), then range-checked. */
const intParam = (min: number, max: number, def: number, message: string) =>
  z
    .string({ error: message })
    .regex(/^\d{1,6}$/, message)
    .transform(Number)
    .pipe(z.number().int().min(min, message).max(max, message))
    .default(def);

const q = z
  .string({ error: 'Search text must be a string.' })
  .trim()
  .max(100, 'Keep the search under 100 characters.')
  .transform((s) => s || undefined)
  .optional();

const dateParam = isoDateField().optional();
const rangeOk = (from?: string, to?: string) => !from || !to || from <= to;
const RANGE = 'The start date must be on or before the end date.';

const actionStatusCsv = z
  .string({ error: 'Unknown status.' })
  .transform((s) => [...new Set(s.split(',').map((x) => x.trim()))])
  .pipe(z.array(z.enum(ACTION_STATUSES, { error: 'Unknown status.' })));

const page = intParam(1, 100_000, 1, 'Page must be a whole number of 1 or more.');
const limit = intParam(1, 100, 20, 'Limit must be between 1 and 100.');

export const paginationQuerySchema = z.strictObject({ page, limit });

export const listQueryMembersSchema = z.strictObject({ q, page, limit });

export const listQueryMeetingsSchema = z
  .strictObject({
    q,
    status: z.enum(['upcoming', 'past', 'all']).default('all'),
    from: dateParam,
    to: dateParam,
    page,
    limit,
    sort: z.enum(['date', '-date', 'title']).default('-date'),
  })
  .refine((o) => rangeOk(o.from, o.to), { message: RANGE, path: ['to'] });

export const listQueryDecisionsSchema = z.strictObject({
  status: z.enum(DECISION_STATUSES).optional(),
  meetingId: objectIdSchema.optional(),
  page,
  limit,
  sort: z.enum(['decidedAt', '-decidedAt']).default('-decidedAt'),
});

export const listQueryMeetingDecisionsSchema = z.strictObject({
  status: z.enum(DECISION_STATUSES).optional(),
});

export const listQueryMeetingActionsSchema = z.strictObject({
  status: actionStatusCsv.optional(),
});

export const listQueryActionsSchema = z
  .strictObject({
    status: actionStatusCsv.optional(),
    ownerId: objectIdSchema.optional(),
    meetingId: objectIdSchema.optional(),
    decisionId: objectIdSchema.optional(),
    overdue: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
    dueFrom: dateParam,
    dueTo: dateParam,
    q,
    page,
    limit,
    sort: z.enum(['dueDate', '-dueDate', 'priority', '-createdAt']).default('dueDate'),
  })
  .refine((o) => rangeOk(o.dueFrom, o.dueTo), { message: RANGE, path: ['dueTo'] });

export const listQueryUnconvertedSchema = z.strictObject({
  limit: intParam(1, 100, 10, 'Limit must be between 1 and 100.'),
});

export const listQueryWeeklySchema = z.strictObject({
  weeks: intParam(1, 52, 8, 'Weeks must be between 1 and 52.'),
});

export const listQueryMembers = listQueryMembersSchema;
export const listQueryMeetings = listQueryMeetingsSchema;
export const listQueryDecisions = listQueryDecisionsSchema;
export const listQueryActions = listQueryActionsSchema;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type ListQueryMembers = z.infer<typeof listQueryMembersSchema>;
export type ListQueryMeetings = z.infer<typeof listQueryMeetingsSchema>;
export type ListQueryDecisions = z.infer<typeof listQueryDecisionsSchema>;
export type ListQueryMeetingDecisions = z.infer<typeof listQueryMeetingDecisionsSchema>;
export type ListQueryMeetingActions = z.infer<typeof listQueryMeetingActionsSchema>;
export type ListQueryActions = z.infer<typeof listQueryActionsSchema>;
export type ListQueryUnconverted = z.infer<typeof listQueryUnconvertedSchema>;
export type ListQueryWeekly = z.infer<typeof listQueryWeeklySchema>;
