import { z } from 'zod';
import { ACTION_STATUSES, PRIORITIES } from '../constants';
import { isValidISODate } from '../dates';
import { EMPTY_UPDATE, hasAnyField, isoDateField, objectIdField, optionalText } from './common';

const TITLE = 'Add a title of at least 3 characters.';
const EXTEND = 'Extend by 1 to 30 days.';

export const prioritySchema = z.enum(PRIORITIES, { error: 'Pick a priority.' });
export const actionStatusEnum = z.enum(ACTION_STATUSES, { error: 'Pick a status.' });

// Base fields carry no defaults, so .partial() updates never inject values.
export const actionBaseFields = {
  title: z
    .string({ error: TITLE })
    .trim()
    .min(3, TITLE)
    .max(120, 'Keep the title under 120 characters.'),
  description: optionalText(1000, 'Keep the description under 1000 characters.'),
  ownerId: objectIdField('Pick who owns this task.'),
  dueDate: isoDateField('Pick a due date.'),
  priority: prioritySchema,
  status: actionStatusEnum,
};

export const actionCreateSchema = z.strictObject({
  ...actionBaseFields,
  priority: prioritySchema.default('medium'),
  status: actionStatusEnum.default('open'),
  decisionId: objectIdField().optional(),
});
export const actionUpdateSchema = z
  .strictObject(actionBaseFields)
  .partial()
  .refine(hasAnyField, { message: EMPTY_UPDATE });
export const actionStatusSchema = z.strictObject({ status: actionStatusEnum });
export const actionExtendSchema = z.strictObject({
  days: z.number({ error: EXTEND }).int(EXTEND).min(1, EXTEND).max(30, EXTEND),
});

export const DUE_PAST = "The due date can't be in the past.";
export const DUE_BEFORE_MEETING = "The due date can't be before the meeting date.";

/**
 * Due-date business rule (CLAUDE.md section 5): dueDate >= today and >= meetingDate.
 * Returns the human error message, or null when the date is acceptable.
 */
export function validateActionDueDate(
  dueDate: string,
  today: string,
  meetingDate?: string,
): string | null {
  if (!isValidISODate(dueDate)) return 'Pick a due date.';
  if (dueDate < today) return DUE_PAST;
  if (meetingDate !== undefined && dueDate < meetingDate) return DUE_BEFORE_MEETING;
  return null;
}

export const actionCreate = actionCreateSchema;
export const actionUpdate = actionUpdateSchema;
export const actionStatus = actionStatusSchema;
export const actionExtend = actionExtendSchema;
export type ActionCreate = z.infer<typeof actionCreateSchema>;
export type ActionCreateInput = z.input<typeof actionCreateSchema>;
export type ActionUpdate = z.infer<typeof actionUpdateSchema>;
export type ActionStatusBody = z.infer<typeof actionStatusSchema>;
export type ActionExtend = z.infer<typeof actionExtendSchema>;
