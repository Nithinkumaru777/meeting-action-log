import { z } from 'zod';
import {
  EMPTY_UPDATE,
  hasAnyField,
  isoDateField,
  objectIdSchema,
  optionalText,
  time24Schema,
} from './common';

const TITLE = 'Give the meeting a title of 3 to 100 characters.';
const DURATION = 'Use a duration between 5 and 480 minutes.';
const ATTENDEES = 'Add at least one attendee.';
const TAG = 'Tags must be 1 to 24 characters.';

const fields = {
  title: z.string({ error: TITLE }).trim().min(3, TITLE).max(100, TITLE),
  date: isoDateField('Pick a date.'),
  startTime: time24Schema,
  durationMin: z.number({ error: DURATION }).int(DURATION).min(5, DURATION).max(480, DURATION),
  attendeeIds: z
    .array(objectIdSchema, { error: ATTENDEES })
    .min(1, ATTENDEES)
    .max(50, 'Keep attendees to 50 or fewer.')
    .refine((ids) => new Set(ids).size === ids.length, 'Attendees must be unique.'),
  agenda: optionalText(500, 'Keep the agenda under 500 characters.'),
  notes: optionalText(5000, 'Keep the notes under 5000 characters.'),
  tags: z
    .array(z.string({ error: TAG }).trim().min(1, TAG).max(24, TAG))
    .max(10, 'Use at most 10 tags.')
    .optional(),
};

export const meetingCreateSchema = z.strictObject(fields);
export const meetingUpdateSchema = z
  .strictObject(fields)
  .partial()
  .refine(hasAnyField, { message: EMPTY_UPDATE });

export const meetingCreate = meetingCreateSchema;
export const meetingUpdate = meetingUpdateSchema;
export type MeetingCreate = z.infer<typeof meetingCreateSchema>;
export type MeetingUpdate = z.infer<typeof meetingUpdateSchema>;
