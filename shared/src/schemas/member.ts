import { z } from 'zod';
import { EMPTY_UPDATE, hasAnyField } from './common';

const NAME = 'Enter a name between 2 and 60 characters.';
const EMAIL = 'Enter a valid email address.';
const ROLE = 'Keep the role under 40 characters.';
const HUE = 'Avatar hue must be between 0 and 359.';

const fields = {
  name: z.string({ error: NAME }).trim().min(2, NAME).max(60, NAME),
  email: z
    .string({ error: EMAIL })
    .trim()
    .toLowerCase()
    .max(254, EMAIL)
    .pipe(z.email({ error: EMAIL })),
  role: z.string({ error: ROLE }).trim().max(40, ROLE).optional(),
  avatarHue: z.number({ error: HUE }).int(HUE).min(0, HUE).max(359, HUE).optional(),
};

export const memberCreateSchema = z.strictObject(fields);
export const memberUpdateSchema = z
  .strictObject(fields)
  .partial()
  .refine(hasAnyField, { message: EMPTY_UPDATE });

export const memberCreate = memberCreateSchema;
export const memberUpdate = memberUpdateSchema;
export type MemberCreate = z.infer<typeof memberCreateSchema>;
export type MemberUpdate = z.infer<typeof memberUpdateSchema>;
