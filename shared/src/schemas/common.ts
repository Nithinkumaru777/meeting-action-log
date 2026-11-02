import { z } from 'zod';
import { isValidISODate } from '../dates';

/** Builds a 24-hex ObjectId field with a field-specific message. Output is lower-cased. */
export const objectIdField = (message = 'Invalid identifier.') =>
  z
    .string({ error: message })
    .regex(/^[0-9a-fA-F]{24}$/, message)
    .toLowerCase();

/** Builds a strict YYYY-MM-DD calendar-date field with a field-specific message. */
export const isoDateField = (message = 'Enter a valid date (YYYY-MM-DD).') =>
  z.string({ error: message }).refine(isValidISODate, message);

export const objectIdSchema = objectIdField();
export const objectId = objectIdSchema;
export const isoDateSchema = isoDateField();
export const time24Schema = z
  .string({ error: 'Pick a start time.' })
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Pick a start time.');
export const idParamSchema = z.strictObject({ id: objectIdSchema });

/** Trimmed optional free text with a max length. */
export const optionalText = (max: number, message: string) =>
  z.string({ error: message }).trim().max(max, message).optional();

/** Update payloads must change something. */
export const hasAnyField = (o: Record<string, unknown>) =>
  Object.values(o).some((v) => v !== undefined);
export const EMPTY_UPDATE = 'Provide at least one field to update.';
